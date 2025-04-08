const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports = {
  name: "join",
  handle: async function({ api, event }) {
    const threadID = event.threadID;
    const addedUsers = event.logMessageData.addedParticipants || [];

    const welcomeMessages = [
      "🎉 Hey %1, welcome to the group! Glad you're here!",
      "👋 %1 just joined the party! Let’s give them a warm welcome!",
      "🌟 Welcome aboard, %1! Excited to have you in %2!",
      "🎈 %1 has arrived! Welcome to %2, let’s make some memories!",
      "🚀 New member alert! Welcome %1 to %2!"
    ];

    try {
      const groupInfo = await new Promise((resolve, reject) => {
        api.getThreadInfo(threadID, (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      const groupName = groupInfo.threadName || "the group";

      for (const user of addedUsers) {
        const userID = user.userFbId;
        const userInfo = await new Promise((resolve, reject) => {
          api.getUserInfo([userID], (err, info) => {
            if (err) reject(err);
            else resolve(info);
          });
        });
        const userName = userInfo[userID]?.name || "Unknown User";

        const profilePicUrl = getProfilePictureURL(userID);

        const apiUrl = `https://api.nexalo.xyz/welcome_min?name=${encodeURIComponent(userName)}&image=${encodeURIComponent(profilePicUrl)}&text=Welcome to ${encodeURIComponent(groupName)}&api=na_3XAUB0VQ8C9010EK`;
        const response = await axios.get(apiUrl, { responseType: 'stream' });

        const fileName = `welcome_${crypto.randomBytes(8).toString('hex')}.png`;
        const filePath = path.join(__dirname, '..', '..', fileName);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        const stats = fs.statSync(filePath);
        if (stats.size === 0) throw new Error("Downloaded welcome image is empty");

        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
          .replace("%1", userName)
          .replace("%2", groupName);

        const msg = {
          body: randomMessage,
          attachment: fs.createReadStream(filePath)
        };

        api.sendMessage(msg, threadID, (err) => {
          if (err) {
            console.log(chalk.red(`[Join Event Error] Failed to send welcome message: ${err.message}`));
          }

          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.log(chalk.red(`[Join Event Cleanup Error] ${unlinkErr.message}`));
            } else {
              console.log(chalk.cyan(`[Join Event] ${userName} joined Thread: ${threadID}`));
            }
          });
        });
      }
    } catch (error) {
      api.sendMessage(`⚠️ Failed to welcome new user.`, threadID);
      console.log(chalk.red(`[Join Event Error] ${error.message}`));
    }
  }
};