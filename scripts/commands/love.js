const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const LOVE_API_URL = 'https://nexalo-api.vercel.app/api/lovev1';

module.exports.config = {
  name: "love",
  aliases: [],
  version: "1.3",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Create a cute love image with you and someone special 💖",
  category: "Fun",
  guide: "{pn}love @user",
  usePrefix: true
};

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.run = async function({ api, event, getText }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    const mentionIDs = Object.keys(mentions);

    if (mentionIDs.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("love", "noMention"), threadID, messageID);
    }

    const targetID = mentionIDs[0];
    // Clean the targetName to remove any extra spaces or special characters
    const targetName = mentions[targetID].replace('@', '').trim();

    if (targetID === senderID) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("love", "selfLove"), threadID, messageID);
    }

    const senderPic = getProfilePictureURL(senderID);
    const targetPic = getProfilePictureURL(targetID);

    // Create a temporary file path for the image
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `love_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filePath = path.join(tempDir, fileName);

    // Make API request to get the love image directly
    const response = await axios.get(LOVE_API_URL, {
      params: {
        image1: senderPic,
        image2: targetPic
      },
      responseType: 'stream', // Treat the response as a binary stream
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

    // Ensure the targetName in the message body matches the mentions tag
    const messageBody = getText("love", "success", `@${targetName}`);

    // Send the image as an attachment
    const msg = {
      body: messageBody,
      attachment: fs.createReadStream(filePath),
      mentions: [
        {
          tag: `@${targetName}`,
          id: targetID
        }
      ]
    };

    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) return reject(err);
        api.setMessageReaction("❤️", messageID, () => {}, true);
        resolve();
      }, messageID);
    });

    // Delete the temporary file after sending
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("[Love Command Error]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(getText("love", "error", err.message), threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `love_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};