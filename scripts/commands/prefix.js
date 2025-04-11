const chalk = require('chalk');
const fs = require('fs');

module.exports.config = {
  name: "prefix",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Displays the bot's prefix, name, and admin name",
  category: "Utility",
  guide: "{pn} - Shows the bot's prefix, name, and admin name",
  usePrefix: false 
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

  try {

    const botConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    const botName = botConfig.botName || "Unknown Bot";
    const prefix = botConfig.prefix || "!";
    const adminNames = botConfig.adminName || "Unknown Admin";
    const developer = botConfig.adminName || "Unknown Developer"; 

    const replyMsg = `
╭──「 ${botName} CONFIG 」───
│
├ 🔹 Bot Name: ${botName}
├ 🔹 Prefix: ${prefix}
├ 🔹 Admin(s): ${adminNames}
├ 🔹 Developer: ${developer}
│
╰───────────────────
ℹ️ Type ${prefix}help to see all commands
    `.trim();

    await new Promise((resolve, reject) => {
      api.sendMessage(replyMsg, threadID, (err) => {
        if (err) {
          console.log(chalk.red(`[Prefix Error] Failed to send message: ${err.message}`));
          reject(err);
        } else {
          console.log(chalk.green(`[Prefix] Successfully sent bot info | ThreadID: ${threadID}`));
          resolve();
        }
      }, messageID);
    });
  } catch (error) {
    console.log(chalk.red(`[Prefix Error] Thread: ${threadID} | Error: ${error.message}`));
    api.sendMessage(`⚠️ Could not display bot info. Error: ${error.message}`, threadID, messageID);
  }
};