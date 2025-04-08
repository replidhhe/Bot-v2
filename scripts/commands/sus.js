const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "sus",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Plays the sus sound",
  category: "Fun",
  guide: "Type 'sus' to play the sound",
  usePrefix: false
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;

  try {
    const audioPath = path.join(__dirname, '..', 'assets', 'sus.mp3');

    if (!fs.existsSync(audioPath)) {
      throw new Error("sus.mp3 file not found in assets folder");
    }

    const msg = {
      body: "🔊 Sus sound activated!",
      attachment: fs.createReadStream(audioPath)
    };

    api.sendMessage(msg, threadID, messageID);
    console.log(chalk.cyan(`[Sus Command] Thread: ${threadID}`));
  } catch (error) {
    api.sendMessage("⚠️ Failed to play the sus sound.", threadID, messageID);
    console.log(chalk.red(`[Sus Error] ${error.message}`));
  }
};