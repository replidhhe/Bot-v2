const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports.config = {
  name: "blue",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false, // Set to false since we'll handle VIP and admin checks manually
  description: "Sends an image from the Blue API (VIP and Admins only)",
  category: "Media",
  guide: "{pn} - Sends an image from the Blue API (VIP and Admins only)",
  usePrefix: true,
};

module.exports.run = async function ({ api, event, config }) {
  const { threadID, messageID, senderID } = event;

  // Path to the vip.json file
  const vipFilePath = path.join(__dirname, '../../assets/vip.json');

  // Initialize vip.json if it doesn't exist
  let vipData = { vips: [] };
  if (!fs.existsSync(vipFilePath)) {
    fs.writeFileSync(vipFilePath, JSON.stringify(vipData, null, 2));
    console.log(chalk.green(`[Blue Command] Created vip.json file: ${vipFilePath}`));
  } else {
    // Read the existing vip.json file
    try {
      const fileContent = fs.readFileSync(vipFilePath, 'utf8');
      vipData = JSON.parse(fileContent);
    } catch (err) {
      console.log(chalk.red(`[Blue Error] Failed to parse vip.json: ${err.message}`));
      vipData = { vips: [] }; // Reset to default if parsing fails
    }
  }

  try {
    // Set "processing" reaction
    api.setMessageReaction("🕥", messageID, () => {}, true);

    // Check if the user is an admin (from config.json adminUIDs) or a VIP (from vip.json)
    const isAdmin = config.adminUIDs.includes(senderID);
    const isVip = vipData.vips.some(vip => vip.id === senderID);

    // If the user is neither an admin nor a VIP, deny access
    if (!isAdmin && !isVip) {
      api.sendMessage(
        "❌ This command is restricted to VIP members and admins only.",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[Blue Command] Non-VIP/Non-admin tried to use command | SenderID: ${senderID} | ThreadID: ${threadID}`));
      return;
    }

    // Fetch the raw image from the API
    const apiUrl = "https://nexalo-api.vercel.app/api/ba";
    const imageResponse = await axios.get(apiUrl, {
      responseType: 'stream',
      timeout: 15000 // 15-second timeout
    });

    // Determine the file extension based on the Content-Type header
    const contentType = imageResponse.headers['content-type'];
    const fileExtension = contentType.includes('gif') ? '.gif' : contentType.includes('png') ? '.png' : '.jpg'; // Default to .jpg if not a GIF or PNG
    const fileName = `blue_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const filePath = path.join(__dirname, fileName);

    // Save the image to a temporary file
    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(chalk.green(`[Blue Command] Successfully downloaded: ${filePath}`));
        resolve();
      });
      writer.on("error", (err) => {
        console.log(chalk.red(`[Blue Error] Failed to download image: ${err.message}`));
        reject(err);
      });
    });

    // Send the image to the thread
    const msg = {
      body: "🔵 Here's an image from the Blue API! 🔵",
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(msg, threadID, () => {
      // Set "success" reaction
      api.setMessageReaction("✅", messageID, () => {}, true);
      console.log(chalk.cyan(`[Blue Command] Successfully sent image | ThreadID: ${threadID}`));
    }, messageID);

    // Delete the file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.log(chalk.red(`[Blue Error] Failed to delete file: ${unlinkErr.message}`));
      } else {
        console.log(chalk.green(`[Blue Command] Successfully deleted file: ${filePath}`));
      }
    });
  } catch (error) {
    // Set "error" reaction
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      "⚠️ An error occurred while fetching or sending the image. Please try again later.",
      threadID,
      messageID
    );
    console.log(chalk.red(`[Blue Error] ${error.message}`));
  }
};