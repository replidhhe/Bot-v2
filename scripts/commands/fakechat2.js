const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports.config = {
  name: "fakechat2",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generates a fake chat image with user text and profile picture",
  category: "Fun",
  guide: "{pn} <text> - Generates a fake chat with your profile picture\n{pn} @username <text> - Generates a fake chat with the mentioned user's profile picture",
  usePrefix: true,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    api.setMessageReaction("🕥", messageID, () => {}, true);

    if (args.length === 0) {
      api.sendMessage(
        "⚠️ Please provide text for the fake chat. Example: .fakechat2 Hi",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[FakeChat2 Command] No text provided | ThreadID: ${threadID}`));
      return;
    }

    let targetUserID = senderID;
    let textStartIndex = 0;

    if (Object.keys(mentions).length > 0) {
      targetUserID = Object.keys(mentions)[0];
      textStartIndex = 1;
    }

    const chatText = args.slice(textStartIndex).join(" ").trim();
    if (!chatText) {
      api.sendMessage(
        "⚠️ Please provide text after the mention. Example: .fakechat2 @username Hi",
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[FakeChat2 Command] No text provided after mention | ThreadID: ${threadID}`));
      return;
    }

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
      console.log(chalk.red(`[FakeChat2 Error] Failed to fetch profile picture for user ${targetUserID} | ThreadID: ${threadID}`));
      return;
    }

    const profilePicUrl = userInfo[targetUserID].thumbSrc;

    const apiUrl = `https://nexalo-api.vercel.app/api/fake-chat-v2?imageUrl=${encodeURIComponent(profilePicUrl)}&text=${encodeURIComponent(chatText)}`;
    const imageResponse = await axios.get(apiUrl, {
      responseType: 'stream',
      timeout: 15000
    });

    const contentType = imageResponse.headers['content-type'];
    const fileExtension = contentType.includes('png') ? '.png' : '.jpg';
    const fileName = `fakechat2_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const filePath = path.join(__dirname, fileName);

    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(chalk.green(`[FakeChat2 Command] Successfully downloaded: ${filePath}`));
        resolve();
      });
      writer.on("error", (err) => {
        console.log(chalk.red(`[FakeChat2 Error] Failed to download image: ${err.message}`));
        reject(err);
      });
    });

    const msg = {
      body: "💬 Here's your fake chat image! 💬",
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(msg, threadID, () => {
      api.setMessageReaction("✅", messageID, () => {}, true);
      console.log(chalk.cyan(`[FakeChat2 Command] Successfully sent fake chat image | ThreadID: ${threadID}`));
    }, messageID);

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.log(chalk.red(`[FakeChat2 Error] Failed to delete file: ${unlinkErr.message}`));
      } else {
        console.log(chalk.green(`[FakeChat2 Command] Successfully deleted file: ${filePath}`));
      }
    });
  } catch (error) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      "⚠️ An error occurred while generating or sending the fake chat image. Please try again later.",
      threadID,
      messageID
    );
    console.log(chalk.red(`[FakeChat2 Error] ${error.message} | ThreadID: ${threadID}`));
  }
};