const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports.config = {
  name: "sing2",
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

  // Validate input
  if (!args.length) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("❌ Please provide a song name.\nUsage: !sing <song name>", threadID, messageID);
  }

  const query = encodeURIComponent(args.join(" "));
  const apiUrl = `https://apis-rho-nine.vercel.app/ytsdlmp3?q=${query}`;
  const filePath = path.join(__dirname, "ytsdlmp3.mp3");

  try {
    // Set "processing" reaction
    api.setMessageReaction("🕥", messageID, () => {}, true);

    // Log the request
    console.log(chalk.cyan(`[Sing] Fetching song: "${query}" | ThreadID: ${threadID}`));

    // Fetch MP3 URL from the API with retry logic
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 2000; // 2 seconds delay between retries

    while (attempts < maxAttempts) {
      try {
        response = await axios.get(apiUrl, { timeout: 10000 }); // 10-second timeout
        break;
      } catch (err) {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error(`Failed to fetch MP3 URL after ${maxAttempts} attempts: ${err.message}`);
        }
        console.log(chalk.yellow(`[Sing Retry] Attempt ${attempts}/${maxAttempts} failed: ${err.message}`));
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    if (!response.data || !response.data.download_url) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ No MP3 found for your query.", threadID, messageID);
    }

    const audioUrl = response.data.download_url;
    const fileName = response.data.title || "audio.mp3";
    console.log(chalk.cyan(`[Sing] Found song: ${fileName} | URL: ${audioUrl}`));

    // Download the MP3 file
    const audioResponse = await axios({
      url: audioUrl,
      method: "GET",
      responseType: "stream",
      timeout: 15000, // 15-second timeout for download
    });

    const writer = fs.createWriteStream(filePath);

    // Handle file writing with a Promise
    await new Promise((resolve, reject) => {
      audioResponse.data.pipe(writer);

      writer.on("finish", () => {
        console.log(chalk.green(`[Sing] Successfully downloaded: ${fileName}`));
        resolve();
      });

      writer.on("error", (err) => {
        console.log(chalk.red(`[Sing Error] Download failed: ${err.message}`));
        reject(new Error(`Failed to download audio: ${err.message}`));
      });
    });

    // Send the audio file
    const msg = {
      body: `🎵 Here is your requested song:\n📌 ${fileName}`,
      attachment: fs.createReadStream(filePath),
    };

    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.log(chalk.red(`[Sing Error] Failed to send audio: ${err.message}`));
          reject(new Error(`Failed to send audio: ${err.message}`));
        } else {
          console.log(chalk.green(`[Sing] Successfully sent: ${fileName}`));
          resolve();
        }
      }, messageID);
    });

    // Set "success" reaction
    api.setMessageReaction("✅", messageID, () => {}, true);

    // Clean up the file
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.log(chalk.red(`[Sing Error] Failed to delete file: ${unlinkErr.message}`));
      } else {
        console.log(chalk.green(`[Sing] Successfully deleted file: ${filePath}`));
      }
    });
  } catch (error) {
    console.log(chalk.red(`[Sing Error] Thread: ${threadID} | Error: ${error.message}`));
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`⚠️ Could not fetch or send the audio. Error: ${error.message}`, threadID, messageID);
  }
};