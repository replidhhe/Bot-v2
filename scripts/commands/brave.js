const axios = require('axios');

const BRAVE_API_URL = 'https://nexalo-api.vercel.app/api/brave';

module.exports.config = {
  name: "brave",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Retrieve AI-generated responses from the Brave API based on your search text",
  category: "AI",
  guide: "{pn}brave [your text] - Get an AI-generated response based on your search text",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    // Extract the user input from args
    const userInput = args.join(' ').trim();
    if (!userInput) {
      return api.sendMessage("⚠️ Please provide some text to search using the Brave API!", threadID, messageID);
    }

    // Construct the API URL
    const apiUrl = `${BRAVE_API_URL}?search=${encodeURIComponent(userInput)}`;

    // Call the API to retrieve the response
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.details) {
      const braveDetails = response.data.details;

      // Send the details to the user
      const msg = {
        body: `🧠 Brave API Response:\n\n${braveDetails}`
      };

      api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error(response.data.message || "Brave API response retrieval failed");
    }
  } catch (err) {
    console.error("[Brave Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);
  }
};