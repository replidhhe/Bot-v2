const axios = require('axios');

const TRAIN_API_URL = 'https://sim.api.nexalo.xyz/v1/train';
const API_KEY = 'MAINPOINT'; 
const LANGUAGE = 'bn'; 

module.exports.config = {
  name: "teach",
  aliases: ["train", "learn"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Teaches the bot a new question-answer pair via Nexalo SIM API",
  category: "Training",
  guide: "{pn} <question> | <answer>",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;
  const input = args.join(" ").trim();

  if (!input.includes("|")) {
    return api.sendMessage("Please provide both a question and an answer separated by '|'. Example: !teach What is AI? | Artificial Intelligence", threadID, messageID);
  }

  const [question, answer] = input.split("|").map(item => item.trim());

  if (!question || !answer) {
    return api.sendMessage("Both question and answer must be non-empty. Example: !teach What is AI? | Artificial Intelligence", threadID, messageID);
  }

  try {

    api.setMessageReaction("🕥", messageID, () => {}, true);

    const payload = {
      api: API_KEY,
      question: question,
      answer: answer,
      language: LANGUAGE
    };

    const response = await axios.post(TRAIN_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000 
    });
    const result = response.data;

    if (result.status_code === 201 && result.status === 'Created' && result.data) {
      api.setMessageReaction("✅", messageID, () => {}, true);
      api.sendMessage(`Learned: "${question}" -> "${answer}"\nTraining ID: ${result.data.id}`, threadID, messageID);
    } else {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`API Error: ${result.message || 'Unknown error'}`, threadID, messageID);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error("❌ Error in teach command:", error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`Error: ${errorMessage}`, threadID, messageID);
  }
};