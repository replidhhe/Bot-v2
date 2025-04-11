module.exports.config = {
  name: "unsend",
  aliases: [],
  version: "1.0",
  author: "YourName",
  countDown: 5,
  adminOnly: false,
  description: "Unsend the bot's last message",
  category: "Utility",
  guide: "{pn}unsend - Deletes the bot's last sent message",
  usePrefix: true
};

const lastBotMessages = {};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

  try {
    const lastMessageID = lastBotMessages[threadID];
    if (!lastMessageID) {
      return api.sendMessage("I couldn't find a message to unsend.", threadID, messageID);
    }

    await api.unsendMessage(lastMessageID);
    delete lastBotMessages[threadID];
  } catch (err) {
    console.error("[Unsend Command Error]", err.stack);
    api.sendMessage("Failed to unsend the message. Please try again later.", threadID, messageID);
  }
};

// Hook into the bot's message-sending logic to store last messages
module.exports.onBotMessage = function({ threadID, messageID }) {
  lastBotMessages[threadID] = messageID;
};
