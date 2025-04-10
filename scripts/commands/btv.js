const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const BTV_API_URL = 'https://nexalo-api.vercel.app/api/tv';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.config = {
  name: "btv",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate a TV frame image using your profile picture or a mentioned user's picture 📺",
  category: "Fun",
  guide: "{pn}btv - Generate a TV frame image with your profile picture\n{pn}btv @user - Generate a TV frame image with a mentioned user's profile picture",
  usePrefix: true
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    // Check if a user was mentioned
    let targetID = senderID;
    let targetName = null;

    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length > 0) {
      targetID = mentionIDs[0];
      targetName = mentions[targetID].replace('@', '').trim();
    }

    // Fetch the target user's name if not already set (for the command user)
    if (!targetName) {
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo([senderID], (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      targetName = userInfo[senderID]?.name || "Unknown User";
    }

    const profilePicUrl = getProfilePictureURL(targetID);

    // Construct the API URL
    const apiUrl = `${BTV_API_URL}?image=${encodeURIComponent(profilePicUrl)}`;

    // Create a temporary file path for the image
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `btv_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);

    // Download the image from the API
    const response = await axios.get(apiUrl, {
      responseType: 'stream',
      timeout: 10000
    });

    // Verify the content type to ensure it's an image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error("API response is not an image");
    }

    // Save the image to a temporary file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check if the file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) throw new Error("Downloaded TV frame image is empty");

    // Construct the message
    const msg = {
      body: `📺 TV frame generated successfully for ${targetName}!`,
      attachment: fs.createReadStream(filePath)
    };

    // Add mention if a user was tagged
    if (targetID !== senderID) {
      msg.mentions = [
        {
          tag: `@${targetName}`,
          id: targetID
        }
      ];
    }

    // Send the message
    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Delete the temporary file after sending
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("[BTV Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `btv_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};