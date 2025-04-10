const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const YTSEARCH_API_URL = 'https://nexalo-api.vercel.app/api/ytsearch';
const YTMP3DL_API_URL = 'https://nexalo-api.vercel.app/api/ytmp3dl';

module.exports.config = {
  name: "sing",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Search and download a song as an MP3 file by its name 🎵",
  category: "Music",
  guide: "{pn}sing [music name] - Search and download a song as an MP3",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, getText }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Extract the music name from args
    const musicName = args.join(' ').trim();
    if (!musicName) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(getText("sing", "missingMusicName"), threadID, messageID);
    }

    // Fetch the sender's name (for logging purposes only)
    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
    const userName = userInfo[senderID]?.name || "Unknown User";

    // Step 1: Search for the music using the first API
    const searchUrl = `${YTSEARCH_API_URL}?query=${encodeURIComponent(musicName)}`;
    const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

    // Validate search API response
    if (!searchResponse.data || searchResponse.data.code !== 200 || !searchResponse.data.data || searchResponse.data.data.length === 0) {
      throw new Error("No music found for the given query");
    }

    // Get the first video's details
    const firstVideo = searchResponse.data.data[0];
    const videoUrl = firstVideo.url;
    const title = firstVideo.title;
    const duration = firstVideo.duration;

    // Step 2: Get the MP3 download URL using the second API
    const downloadUrl = `${YTMP3DL_API_URL}?url=${encodeURIComponent(videoUrl)}`;
    const downloadResponse = await axios.get(downloadUrl, { timeout: 10000 });

    // Validate download API response
    if (!downloadResponse.data || !downloadResponse.data.success || !downloadResponse.data.download_url) {
      throw new Error("Failed to retrieve MP3 download URL");
    }

    const mp3DownloadUrl = downloadResponse.data.download_url;

    // Create a temporary file path for the MP3
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = `music_${crypto.randomBytes(8).toString('hex')}.mp3`;
    const filePath = path.join(tempDir, fileName);

    // Step 3: Download the MP3 file
    const mp3Response = await axios.get(mp3DownloadUrl, {
      responseType: 'stream',
      timeout: 15000
    });

    // Verify the content type to ensure it's an audio file
    const contentType = mp3Response.headers['content-type'];
    if (!contentType || !contentType.startsWith('audio/')) {
      throw new Error("Downloaded content is not an audio file");
    }

    // Save the MP3 to a temporary file
    const writer = fs.createWriteStream(filePath);
    mp3Response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check if the file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) throw new Error("Downloaded MP3 file is empty");

    // Construct the message
    const msg = {
      body: getText("sing", "success", title, duration),
      attachment: fs.createReadStream(filePath)
    };

    // Send the message with the MP3 attachment
    await new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err) => {
        if (err) return reject(err);
        api.setMessageReaction("🎵", messageID, () => {}, true);
        resolve();
      }, messageID);
    });

    // Delete the temporary file after sending
    fs.unlinkSync(filePath);
    console.log(`[Sing Command] Downloaded "${title}" (${duration}) for ${userName}`);
  } catch (err) {
    console.error("[Sing Command Error]", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(getText("sing", "error", err.message), threadID, messageID);

    // Ensure the temporary file is deleted even if sending fails
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    const fileName = `music_${crypto.randomBytes(8).toString('hex')}.mp3`;
    const filePath = path.join(tempDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};