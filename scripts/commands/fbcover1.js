const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const FBCOVER_API_URL = 'https://nexalo-api.vercel.app/api/fb-cover';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.config = {
  name: "fbcover1",
  aliases: [],
  version: "1.2",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate a Facebook cover image with custom text1 and text2 using your profile picture 📷",
  category: "Media",
  guide: "{pn}fbcover1 [text1 text2] - Generate a Facebook cover using your profile picture",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, getText }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Extract text1 and text2 from args
    const textArgs = args.join(' ').trim();
    if (!textArgs) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("fbcover1", "missingArgs"), threadID, messageID);
    }

    // Fetch the sender's name (for logging purposes only)
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
    const userName = userInfo[senderID]?.name || "Unknown User";

    const profilePicUrl = getProfilePictureURL(senderID);

    // Split the input text into text1 and text2
    const [text1, ...rest] = textArgs.split(' ');
    const text2 = rest.join(' ');

    if (!text1 || !text2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("fbcover1", "missingText"), threadID, messageID);
    }

    // Construct the API URL using text1 and text2
    const apiUrl = `${FBCOVER_API_URL}?firstName=${encodeURIComponent(text1)}&lastName=${encodeURIComponent(text2)}&imageUrl=${encodeURIComponent(profilePicUrl)}`;

    // Create a temporary file path for the image
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `fbcover_${crypto.randomBytes(8).toString('hex')}.png`;
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
    if (stats.size === 0) throw new Error("Downloaded Facebook cover image is empty");

    // Construct the message
    const msg = {
      body: getText("fbcover1", "success", text1, text2),
      attachment: fs.createReadStream(filePath)
    };

    // Send the message
    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) return reject(err);
        api.setMessageReaction("🎨", messageID, () => {}, true);
        resolve();
      }, messageID);
    });

    // Delete the temporary file after sending
    fs.unlinkSync(filePath);
    console.log(`[FbCover1 Command] Generated cover for ${userName} with text "${text1} ${text2}"`);
  } catch (err) {
    console.error("[FbCover1 Command Error]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(getText("fbcover1", "error", err.message), threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `fbcover_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};