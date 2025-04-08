const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const GAY_API_URL = 'https://api.nexalo.xyz/gay';
const API_KEY = 'na_3XAUB0VQ8C9010EK';

module.exports.config = {
  name: "gay",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Expose someone as a certified gay 😭",
  category: "Fun",
  guide: "{pn} gay @user",
  usePrefix: true
};

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, mentions } = event;

  try {
    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length === 0) {
      return api.sendMessage("Bro tag someone to call out 😭", threadID, messageID);
    }

    const targetID = mentionIDs[0];
    const targetName = mentions[targetID];

    const imageURL = getProfilePictureURL(targetID);

    const response = await axios.get(GAY_API_URL, {
      params: {
        imageurl: imageURL,
        api: API_KEY
      },
      responseType: 'stream',
      timeout: 10000
    });

    const fileName = `gay_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filePath = path.join(__dirname, fileName);
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const msg = {
      body: `🌈 Look I found a certified gay: ${targetName} 😂`,
      attachment: fs.createReadStream(filePath),
      mentions: [
        {
          tag: targetName,
          id: targetID
        }
      ]
    };

    api.sendMessage(msg, threadID, (err) => {
      if (err) {
        console.error("❌ Error sending image:", err);
        api.sendMessage("❌", threadID, messageID);
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("❌ Error deleting image file:", unlinkErr);
      });
    });

  } catch (error) {
    console.error("❌ Error in gay command:", error.message);
    api.sendMessage("❌", threadID, messageID);
  }
};