const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const GOODBYE_API_URL = 'https://nexalo-api.vercel.app/api/goodbye-card';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

const shortQuotes = [
  "Farewell, dear friend!",
  "Wishing you the best!",
  "Goodbye, take care!",
  "Until we meet again!",
  "Safe travels, friend!",
  "Best of luck always!",
  "See you soon, pal!",
  "Keep shining, star!"
];

module.exports = {
  name: "leave",
  handle: async function({ api, event }) {
    const threadID = event.threadID;
    const leftUserID = event.logMessageData.leftParticipantFbId;

    try {
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo([leftUserID], (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      const userName = userInfo[leftUserID]?.name || "Unknown User";

      const profilePicUrl = getProfilePictureURL(leftUserID);

      // Select a random short quote
      const randomQuote = shortQuotes[Math.floor(Math.random() * shortQuotes.length)];

      // Construct the API URL with the new parameters
      const apiUrl = `${GOODBYE_API_URL}?image=${encodeURIComponent(profilePicUrl)}&username=${encodeURIComponent(userName)}&text=${encodeURIComponent(randomQuote)}`;

      // Download the goodbye image
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
      const fileName = `goodbye_${crypto.randomBytes(8).toString('hex')}.png`;
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
      if (stats.size === 0) throw new Error("Downloaded goodbye image is empty");

      // Construct the message
      const msg = {
        body: `👋 ${userName} has left the group.`,
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
      console.log(chalk.cyan(`[Leave Event] ${userName} left Thread: ${threadID}`));
    } catch (error) {
      api.sendMessage(`⚠️ Failed to send goodbye message.`, threadID);
      console.log(chalk.red(`[Leave Event Error] ${error.message}`));

      // Ensure the temporary file is deleted even if sending fails
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      const fileName = `goodbye_${crypto.randomBytes(8).toString('hex')}.png`;
      const filePath = path.join(tempDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
};