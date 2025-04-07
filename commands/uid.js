const chalk = require('chalk');

module.exports.config = {
  name: "uid",
  aliases: ["id"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Displays the user's UID and profile picture URL",
  category: "Utility",
  guide: "{pn}",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID, senderID } = event;

  try {
    api.setMessageReaction("🕥", messageID, () => {}, true);

    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    const userName = userInfo[senderID]?.name || "Unknown User";
    const profilePic = userInfo[senderID]?.profileUrl || "Not available";

    const response = `
• User Info
╰‣ Name: ${userName}
╰‣ UID: ${senderID}
╰‣ Profile Picture: ${profilePic}
    `.trim();

    api.sendMessage(response, threadID, () => {
      api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);

    console.log(chalk.cyan(`[UID Requested] Thread: ${threadID} | User: ${senderID}`));
  } catch (error) {
    console.log(chalk.red(`[UID Failed] ${error.message}`));
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("⚠️ Failed to fetch user info. Try again later!", threadID, messageID);
  }
};