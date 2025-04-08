const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "women",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Plays the women video",
  category: "Fun",
  guide: "Type 'women' to play the video",
  usePrefix: false
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;

  try {
    const videoPath = path.join(__dirname, '..', 'assets', 'women.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error("women.mp4 file not found in assets folder");
    }

    const msg = {
      body: "women!",
      attachment: fs.createReadStream(videoPath)
    };

    api.sendMessage(msg, threadID, messageID);
    console.log(chalk.cyan(`[women Command] Thread: ${threadID}`));
  } catch (error) {
    api.sendMessage("⚠️ Failed to play the women video.", threadID, messageID);
    console.log(chalk.red(`[women Error] ${error.message}`));
  }
};