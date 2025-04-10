const axios = require('axios');

const COPILOT_API_URL = 'https://nexalo-api.vercel.app/api/copilot-api';

module.exports.config = {
  name: "copilot",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Ask a question to an AI assistant and get a helpful response 🤖",
  category: "AI",
  guide: "{pn}copilot [your question] - Ask a question to the AI assistant",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Extract the user's question from args
    const userPrompt = args.join(' ').trim();
    if (!userPrompt) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ Please provide a question to ask the AI assistant!", threadID, messageID);
    }

    // Fetch the sender's name (optional, for logging purposes)
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
    const userName = userInfo[senderID]?.name || "Unknown User";

    // Construct the API URL
    const apiUrl = `${COPILOT_API_URL}?ask=${encodeURIComponent(userPrompt)}&uid=${encodeURIComponent(senderID)}`;

    // Make API request to get the AI response
    const response = await axios.get(apiUrl, {
      timeout: 10000
    });

    // Validate API response
    if (!response.data || !response.data.status || !response.data.reply) {
      throw new Error("Invalid API response: Missing status or reply");
    }

    const aiReply = response.data.reply;

    // Send the AI reply to the user
    const msg = {
      body: `🤖 AI Response:\n\n${aiReply}`
    };

    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) return reject(err);
        api.setMessageReaction("🤖", messageID, () => {}, true);
        resolve();
      });
    });

    console.log(`[Copilot Command] Processed question "${userPrompt}" for ${userName}`);
  } catch (err) {
    console.error("[Copilot Command Error]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);
  }
};