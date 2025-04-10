const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const WELCOME_API_URL = 'https://nexalo-api.vercel.app/api/welcome-card';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

const randomQuotes = [
  "Welcome aboard, let's achieve greatness!",
  "New adventures start with great friends.",
  "Together, we can conquer the world!",
  "Welcome to the team of dreamers.",
  "A new journey begins with you.",
  "Let’s make today a memorable one.",
  "Excited to have you here, welcome!",
  "We grow stronger with you here.",
  "New beginnings, new hopes, welcome!",
  "Welcome to the group of achievers."
];

module.exports = {
  name: "join",
  handle: async function({ api, event }) {
    const threadID = event.threadID;
    const addedUsers = event.logMessageData.addedParticipants || [];

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

        // Select a random quote
        const randomQuote = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];

        // Construct the API URL with the new parameters
        const apiUrl = `${WELCOME_API_URL}?image=${encodeURIComponent(profilePicUrl)}&username=${encodeURIComponent(userName)}&text=${encodeURIComponent(randomQuote)}`;

        // Download the welcome image
        const response = await axios.get(apiUrl, { responseType: 'stream', timeout: 10000 });

        // Verify the content type to ensure it's an image
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error("API response is not an image");
        }

        // Create a temporary file path for the image
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const fileName = `welcome_${crypto.randomBytes(8).toString('hex')}.png`;
        const filePath = path.join(tempDir, fileName);

        // Save the image to a temporary file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Check if the file is empty
        const stats = fs.statSync(filePath);
        if (stats.size === 0) throw new Error("Downloaded welcome image is empty");

        // Construct the message
        const msg = {
          body: `🎉 Welcome ${userName} to ${groupName}!`,
          attachment: fs.createReadStream(filePath)
        };

        // Send the message
        await new Promise((resolve, reject) => {
          api.sendMessage(msg, threadID, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        // Delete the temporary file after sending
        fs.unlinkSync(filePath);
        console.log(chalk.cyan(`[Join Event] ${userName} joined Thread: ${threadID}`));
      }
    } catch (error) {
      api.sendMessage(`⚠️ Failed to welcome new user.`, threadID);
      console.log(chalk.red(`[Join Event Error] ${error.message}`));

      // Ensure the temporary file is deleted even if sending fails
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const fileName = `welcome_${crypto.randomBytes(8).toString('hex')}.png`;
      const filePath = path.join(tempDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
};