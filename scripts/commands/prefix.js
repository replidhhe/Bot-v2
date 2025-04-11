module.exports.config = {
  name: "prefix",
  aliases: ["settings", "botconfig"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  role: 0, // 0 for all users
  shortDescription: {
    en: "View bot prefix and admin info"
  },
  longDescription: {
    en: "Displays the bot's current prefix and administrator information"
  },
  category: "system",
  guide: {
    en: "{pn}"
  }
};

module.exports.onStart = async function({ api, event, message, args, config }) {
  try {
    const botConfig = require('./config.json');
    const adminNames = Array.isArray(botConfig.adminName) ? 
      botConfig.adminName.join(", ") : botConfig.adminName;
    
    const replyMsg = `
╭──「 ${botConfig.botName} CONFIG 」───
│
├ 🔹 Bot Name: ${botConfig.botName}
├ 🔹 Prefix: ${botConfig.prefix}
├ 🔹 Admin(s): ${adminNames}
├ 🔹 Developer: ${botConfig.adminName}
│
╰───────────────────
ℹ️ Type ${botConfig.prefix}help to see all commands
    `;
    
    message.reply(replyMsg);
  } catch (error) {
    console.error("Error in prefix command:", error);
    message.reply("❌ An error occurred while fetching bot configuration.");
  }
};

module.exports.run = function({ api, event, message }) {
  return this.onStart({ api, event, message });
};
