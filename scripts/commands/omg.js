const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "omg",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Plays the omg video",
  category: "Fun",
  guide: "Type 'omg' to play the video",
  usePrefix: false
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;

  try {
    const videoPath = path.join(__dirname, '..', 'assets', 'omg.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error("omg.mp4 file not found in assets folder");
    }

    const msg = {
      body: "🤨😱",
      attachment: fs.createReadStream(videoPath)
    };

    api.sendMessage(msg, threadID, messageID);
    console.log(chalk.cyan(`[omg Command] Thread: ${threadID}`));
  } catch (error) {
    api.sendMessage("⚠️ Failed to play the omg video.", threadID, messageID);
    console.log(chalk.red(`[omg Error] ${error.message}`));
  }
};