const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GFX_API_URL = 'https://nexalo-api.vercel.app/api/gfx';

module.exports.config = {
  name: "gfx",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate a GFX image with a custom name and style number 🎨",
  category: "Fun",
  guide: "{pn}gfx [name] [number] - Generate a GFX image with your name and style number (1, 2, 3, or 4)",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, getText }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Extract name and number from args
    const textArgs = args.join(' ').trim();
    if (!textArgs) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("gfx", "missingArgs"), threadID, messageID);
    }

    // Split the input text into gfxname and gfxnumber
    const [gfxname, gfxnumber] = textArgs.split(' ').filter(Boolean);

    if (!gfxname || !gfxnumber) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("gfx", "missingInputs"), threadID, messageID);
    }

    // Validate gfxnumber (must be 1, 2, 3, or 4)
    const number = parseInt(gfxnumber, 10);
    if (isNaN(number) || number < 1 || number > 4) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("gfx", "invalidNumber"), threadID, messageID);
    }

    // Fetch the sender's name (for logging purposes only)
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
    const userName = userInfo[senderID]?.name || "Unknown User";

    // Construct the API URL
    const apiUrl = `${GFX_API_URL}?gfxname=${encodeURIComponent(gfxname)}&gfxnumber=${number}`;

    // Make API request to generate GFX image
    const response = await axios.get(apiUrl, {
      timeout: 10000
    });

    // Validate API response
    if (!response.data || !response.data.status || !response.data.url) {
      throw new Error("Invalid API response: Missing status or URL");
    }

    const imageUrl = response.data.url;

    // Create a temporary file path for the image
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `gfx_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);

    // Download the image from the URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 10000
    });

    // Verify the content type to ensure it's an image
    const contentType = imageResponse.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error("Downloaded content is not an image");
    }

    // Save the image to a temporary file
    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check if the file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) throw new Error("Downloaded GFX image is empty");

    // Construct the message
    const msg = {
      body: getText("gfx", "success", gfxname, number)
    };

    // Send the image as an attachment
    await new Promise((resolve, reject) => {
      api.sendMessage({
        body: msg.body,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (err) return reject(err);
        api.setMessageReaction("🎨", messageID, () => {}, true);
        resolve();
      }, messageID);
    });

    // Delete the temporary file after sending
    fs.unlinkSync(filePath);
    console.log(`[GFX Command] Generated GFX for ${userName} with name "${gfxname}" and number ${number}`);
  } catch (err) {
    console.error("[GFX Command Error]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(getText("gfx", "error", err.message), threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `gfx_${crypto.randomBytes(8).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};