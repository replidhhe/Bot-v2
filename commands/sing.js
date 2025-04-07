const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports.config = {
  name: "sing",
  aliases: ["song", "music"],
  version: "1.0",
  author: "Hridoy", 
  countDown: 10, 
  adminOnly: false,
  description: "Fetches and sends an MP3 of a requested song",
  category: "Media",
  guide: "{pn} <song name>",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;

  if (!args.length) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("❌ Please provide a song name.\nUsage: !sing <song name>", threadID, messageID);
  }

  const query = encodeURIComponent(args.join(" "));
  const apiUrl = `https:
  const filePath = path.join(__dirname, "ytsdlmp3.mp3");

  try {

    api.setMessageReaction("🕥", messageID, () => {}, true);

    const response = await axios.get(apiUrl);
    if (!response.data || !response.data.download_url) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ No MP3 found for your query.", threadID, messageID);
    }

    const audioUrl = response.data.download_url;
    const fileName = response.data.title || "audio.mp3";

    const writer = fs.createWriteStream(filePath);
    const audioResponse = await axios({
      url: audioUrl,
      method: "GET",
      responseType: "stream",
    });

    audioResponse.data.pipe(writer);

    writer.on("finish", () => {
      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = {
        body: `🎵 Here is your requested song:\n📌 ${fileName}`,
        attachment: fs.createReadStream(filePath),
      };

      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.log(chalk.red(`[Sing Error] Failed to send audio: ${err.message}`));
          api.sendMessage("⚠️ Failed to send audio.", threadID);
          return;
        }

        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.log(chalk.red(`[Sing Error] Failed to delete file: ${unlinkErr.message}`));
          } else {
            console.log(chalk.green(`[Sing] Successfully sent and deleted: ${fileName}`));
          }
        });
      });
    });

    writer.on("error", (err) => {
      console.log(chalk.red(`[Sing Error] Download failed: ${err.message}`));
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("⚠️ Failed to download audio.", threadID, messageID);
    });

    console.log(chalk.cyan(`[Sing] Fetching song: "${query}" | ThreadID: ${threadID}`));
  } catch (error) {
    console.log(chalk.red(`[Sing Error] API fetch failed: ${error.message}`));
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ Could not fetch the audio. Error: ${error.message}`, threadID, messageID);
  }
};