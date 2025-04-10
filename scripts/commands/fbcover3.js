const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const FBCOVER_API_URL = 'https://nexalo-api.vercel.app/api/facebook-cover-v3';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.config = {
  name: "fbcover3",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate a Facebook cover image with name, text1, and text2 using your profile picture or a mentioned user's picture",
  category: "Media",
  guide: "{pn}fbcover3 [name text1 text2] - Generate a Facebook cover using your profile picture\n{pn}fbcover3 @user [name text1 text2] - Generate a Facebook cover using a mentioned user's profile picture",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    // Extract name, text1, and text2 from args
    const textArgs = args.join(' ').trim();
    if (!textArgs) {
      return api.sendMessage("⚠️ Please provide name, text1, and text2 to generate the Facebook cover!", threadID, messageID);
    }

    const argsSplit = textArgs.split(' ');
    if (argsSplit.length < 3) {
      return api.sendMessage("⚠️ You must provide all details: name, text1, and text2!", threadID, messageID);
    }

    const [name, text1, ...text2Array] = argsSplit;
    const text2 = text2Array.join(' ');

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
    const apiUrl = `${FBCOVER_API_URL}?imageUrl=${encodeURIComponent(profilePicUrl)}&name=${encodeURIComponent(name)}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;

    // Create a temporary file path for the image
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `fbcover3_${crypto.randomBytes(8).toString('hex')}.png`;
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
      body: `🎨 Facebook cover generated successfully for ${targetName} with the name "${name}", text1 "${text1}", and text2 "${text2}"!`,
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
    console.error("[FbCover3 Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `fbcover3_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};