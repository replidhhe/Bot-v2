const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SIM_API_URL = 'https://sim.api.nexalo.xyz/v1/chat';
const API_KEY = 'MAINPOINT'; 
const LANGUAGE = 'bn'; 

module.exports.config = {
  name: "bot",
  aliases: ["talk", "sim"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Chat with the Nexalo SIM API",
  category: "AI",
  guide: "{pn} <question>",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;
  const question = args.join(" ").trim();

  if (!question) {
    return api.sendMessage("Please provide a question. Example: !chat What is the weather like?", threadID, messageID);
  }

  try {

    api.setMessageReaction("🕥", messageID, () => {}, true);

    const payload = {
      api: API_KEY,
      question: question,
      language: LANGUAGE
    };

    const response = await axios.post(SIM_API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000 
    });
    const result = response.data;

    if (result.status_code === 200 && result.status === 'OK' && result.data) {
      const { answer, response_type, image_url } = result.data;

      if (response_type === 'image' && image_url) {
        const filePath = path.join(__dirname, "temp_image.jpg");

        const downloadImage = async (url, retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              const imageResponse = await axios({
                url,
                method: "GET",
                responseType: "stream",
                timeout: 30000, 
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });

              const writer = fs.createWriteStream(filePath);
              imageResponse.data.pipe(writer);

              return new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
              });
            } catch (err) {
              if (i < retries - 1) {
                console.warn(`Retry ${i + 1}/${retries} for image download: ${err.message}`);
                await new Promise(res => setTimeout(res, 2000)); 
                continue;
              }
              throw err; 
            }
          }
        };

        await downloadImage(image_url);

        api.setMessageReaction("✅", messageID, () => {}, true);
        const msg = {
          body: "", 
          attachment: fs.createReadStream(filePath)
        };

        api.sendMessage(msg, threadID, (err) => {
          if (err) {
            console.error("❌ Error sending image:", err);
            api.sendMessage("⚠️ Failed to send image.", threadID);
          }

          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("❌ Error deleting file:", unlinkErr);
          });
        });
      } else {

        api.setMessageReaction("✅", messageID, () => {}, true);
        api.sendMessage(answer, threadID);
      }
    } else {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage(`API Error: ${result.message || 'Unknown error'}`, threadID, messageID);
    }
  } catch (error) {
    console.error("❌ Error in chat command:", error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`Error: ${error.message}`, threadID, messageID);

    const filePath = path.join(__dirname, "temp_image.jpg");
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("❌ Error deleting file on error:", unlinkErr);
      });
    }
  }
};