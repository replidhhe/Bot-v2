const moment = require('moment');

module.exports.config = {
  name: "noti",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: true,
  description: "Send a notification to all groups from the admin",
  category: "Admin",
  guide: "{pn}noti <message>",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID, senderID } = event;

  if (!args.length) {
    return api.sendMessage("Please provide a message to send. Usage: {pn}noti <message>", threadID, messageID);
  }

  const message = args.join(" ");

  try {
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    const adminName = userInfo[senderID]?.name || "Admin";

    const threadList = await new Promise((resolve, reject) => {
      api.getThreadList(100, null, ["INBOX"], (err, list) => {
        if (err) reject(err);
        else resolve(list);
      });
    });

    const groupThreads = threadList.filter(thread => thread.isGroup);

    if (!groupThreads.length) {
      return api.sendMessage("No group threads found to send the notification.", threadID, messageID);
    }

    const notificationTime = moment().format("hh:mm A");
    const notificationDate = moment().format("MMMM DD, YYYY");

    const notificationMessage = `
🌟══════✨ NOTIFICATION ✨══════🌟
📢 Message from Admin: ${adminName}
💬 ${message}
🕒 Time: ${notificationTime}
📅 Date: ${notificationDate}
══════✨══════✨══════✨══════`;

    for (const group of groupThreads) {
      api.sendMessage(notificationMessage, group.threadID, (err) => {
        if (err) {
          console.error(`Failed to send notification to thread ${group.threadID}: ${err.message}`);
        }
      });
    }

    api.sendMessage(`✅ Notification sent to ${groupThreads.length} groups!`, threadID, messageID);
  } catch (error) {
    api.sendMessage(`⚠️ Failed to send notification: ${error.message}`, threadID, messageID);
    console.error(`[Noti Command Error] ${error.message}`);
  }
};