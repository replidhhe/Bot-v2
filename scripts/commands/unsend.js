module.exports.config = {
  name: "unsend",
  aliases: [],
  version: "1.0",
  author: "YourName",
  countDown: 3,
  adminOnly: false,
  description: "Unsend the bot's own message that was replied to",
  category: "Utility",
  guide: "{pn}unsend (reply to the bot's message you want to remove)",
  usePrefix: true
};

module.exports.run = async function ({ api, event, message, getLang }) {
  const { messageReply } = event;

  // Check if there's a reply
  if (!messageReply || messageReply.senderID != api.getCurrentUserID()) {
    return message.reply(getLang("unsend", "syntaxError"));
  }

  try {
    await api.unsendMessage(messageReply.messageID);
  } catch (err) {
    console.error("[Unsend Error]", err.message);
    return message.reply(getLang("unsend", "error", err.message));
  }
};
