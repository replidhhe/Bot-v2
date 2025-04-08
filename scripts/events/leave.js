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
  name: "leave",
  handle: async function({ api, event }) {
    const threadID = event.threadID;
    const leftUserID = event.logMessageData.leftParticipantFbId;

    const goodbyeMessages = [
      "👋 %1 has left the group. We’ll miss you!",
      "😢 %1 just left us. Goodbye and take care!",
      "🚪 %1 has departed. Wishing you the best!",
      "🌟 %1 left the group. Farewell, friend!",
      "👋 Goodbye %1! Thanks for being part of the group!"
    ];

    try {
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo([leftUserID], (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      const userName = userInfo[leftUserID]?.name || "Unknown User";

      const profilePicUrl = getProfilePictureURL(leftUserID);

      const apiUrl = `https://api.nexalo.xyz/goodbye?api=na_3XAUB0VQ8C9010EK&name=${encodeURIComponent(userName)}&text=GoodBye&image=${encodeURIComponent(profilePicUrl)}`;
      const response = await axios.get(apiUrl, { responseType: 'stream' });

      const fileName = `goodbye_${crypto.randomBytes(8).toString('hex')}.png`;
      const filePath = path.join(__dirname, '..', '..', fileName);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      if (stats.size === 0) throw new Error("Downloaded goodbye image is empty");

      const randomMessage = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)]
        .replace("%1", userName);

      const msg = {
        body: randomMessage,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.log(chalk.red(`[Leave Event Error] Failed to send goodbye message: ${err.message}`));
        }

        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.log(chalk.red(`[Leave Event Cleanup Error] ${unlinkErr.message}`));
          } else {
            console.log(chalk.cyan(`[Leave Event] ${userName} left Thread: ${threadID}`));
          }
        });
      });
    } catch (error) {
      api.sendMessage(`⚠️ Failed to send goodbye message.`, threadID);
      console.log(chalk.red(`[Leave Event Error] ${error.message}`));
    }
  }
};