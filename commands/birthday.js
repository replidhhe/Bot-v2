const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const API_KEY = 'na_3XAUB0VQ8C9010EK';
const API_URL = 'https://api.nexalo.xyz/wish-birthday';

module.exports.config = {
  name: "birthday",
  aliases: ["bday", "wish"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Wish someone happy bday with a sexy generated image 🎁",
  category: "Fun",
  guide: "{pn} @user",
  usePrefix: true
};

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length === 0) {
      return api.sendMessage("Bruh tag someone to wish! Can't wish the void. 🎂👻", threadID, messageID);
    }

    const targetID = mentionIDs[0];
    const rawName = mentions[targetID]; 
    const cleanName = rawName.replace(/^@/, ""); 

    const profilePicURL = getProfilePictureURL(targetID);

    const response = await axios.get(API_URL, {
      params: {
        image: profilePicURL,
        name: cleanName,
        api: API_KEY
      },
      responseType: 'stream',
      timeout: 10000
    });

    const fileName = `bday_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filePath = path.join(__dirname, fileName);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const msg = {
      body: `🎉 Happy Birthday ${rawName}! Hope it's lit AF 🎂💖`,
      attachment: fs.createReadStream(filePath),
      mentions: [
        {
          tag: rawName,
          id: targetID
        }
      ]
    };

    api.sendMessage(msg, threadID, (err) => {
      if (err) {
        console.error("❌ Error sending birthday image:", err);
        api.sendMessage("❌", threadID, messageID);
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("❌ Error deleting file:", unlinkErr);
      });
    });

  } catch (err) {
    console.error("❌ Birthday command error:", err.message);
    api.sendMessage("❌", threadID, messageID);
  }
};