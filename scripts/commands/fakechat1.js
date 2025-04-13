const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports.config = {
  name: "fakechat1",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false, // Accessible to all users
  description: "Generates a fake chat image with user text and profile picture",
  category: "Fun",
  guide: "{pn} <text> - Generates a fake chat with your profile picture\n{pn} @username <text> - Generates a fake chat with the mentioned user's profile picture",
  usePrefix: true,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    // Set "processing" reaction
    api.setMessageReaction("🕥", messageID, () => {}, true);

    // Check if the user provided text
    if (args.length === 0) {
      api.sendMessage(
        "⚠️ Please provide text for the fake chat. Example: .fakechat1 Hi",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[FakeChat1 Command] No text provided | ThreadID: ${threadID}`));
      return;
    }

    // Determine the target user (mentioned user or sender)
    let targetUserID = senderID;
    let textStartIndex = 0;

    if (Object.keys(mentions).length > 0) {
      // If a user is mentioned, use the first mentioned user's ID
      targetUserID = Object.keys(mentions)[0];
      textStartIndex = 1; // Skip the mention part in args
    }

    // Extract the text for the fake chat
    const chatText = args.slice(textStartIndex).join(" ").trim();
    if (!chatText) {
      api.sendMessage(
        "⚠️ Please provide text after the mention. Example: .fakechat1 @username Hi",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[FakeChat1 Command] No text provided after mention | ThreadID: ${threadID}`));
      return;
    }

    // Fetch the target user's info to get their profile picture URL
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo(targetUserID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    if (!userInfo[targetUserID] || !userInfo[targetUserID].thumbSrc) {
      api.sendMessage(
        "⚠️ Could not fetch the user's profile picture.",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.red(`[FakeChat1 Error] Failed to fetch profile picture for user ${targetUserID} | ThreadID: ${threadID}`));
      return;
    }

    const profilePicUrl = userInfo[targetUserID].thumbSrc;

    // Call the fake chat API
    const apiUrl = `https://nexalo-api.vercel.app/api/fake-chat-v1?imageUrl=${encodeURIComponent(profilePicUrl)}&text=${encodeURIComponent(chatText)}`;
    const imageResponse = await axios.get(apiUrl, {
      responseType: 'stream',
      timeout: 15000 // 15-second timeout
    });

    // Determine the file extension based on the Content-Type header
    const contentType = imageResponse.headers['content-type'];
    const fileExtension = contentType.includes('png') ? '.png' : '.jpg'; // Default to .jpg if not PNG
    const fileName = `fakechat1_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const filePath = path.join(__dirname, fileName);

    // Save the image to a temporary file
    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(chalk.green(`[FakeChat1 Command] Successfully downloaded: ${filePath}`));
        resolve();
      });
      writer.on("error", (err) => {
        console.log(chalk.red(`[FakeChat1 Error] Failed to download image: ${err.message}`));
        reject(err);
      });
    });

    // Send the image to the thread
    const msg = {
      body: "💬 Here's your fake chat image! 💬",
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(msg, threadID, () => {
      // Set "success" reaction
      api.setMessageReaction("✅", messageID, () => {}, true);
      console.log(chalk.cyan(`[FakeChat1 Command] Successfully sent fake chat image | ThreadID: ${threadID}`));
    }, messageID);

    // Delete the file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.log(chalk.red(`[FakeChat1 Error] Failed to delete file: ${unlinkErr.message}`));
      } else {
        console.log(chalk.green(`[FakeChat1 Command] Successfully deleted file: ${filePath}`));
      }
    });
  } catch (error) {
    // Set "error" reaction
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      "⚠️ An error occurred while generating or sending the fake chat image. Please try again later.",
      threadID,
      messageID
    );
    console.log(chalk.red(`[FakeChat1 Error] ${error.message} | ThreadID: ${threadID}`));
  }
};