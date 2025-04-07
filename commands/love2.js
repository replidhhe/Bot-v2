const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const API_KEY = 'na_3XAUB0VQ8C9010EK';
const LOVE_API_URL = 'https://api.nexalo.xyz/lovev2';

module.exports.config = {
  name: "love2",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Create a love2 style image with you and your tagged crush 💏",
  category: "Fun",
  guide: "{pn} love2 @user",
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
      return api.sendMessage("Tag someone bro, love ain’t a solo sport 🧍‍♂️💔", threadID, messageID);
    }

    const targetID = mentionIDs[0];
    const targetName = mentions[targetID];

    if (targetID === senderID) {
      return api.sendMessage("Bruh you tryna date yourself? That's wild 😭", threadID, messageID);
    }

    const senderPic = getProfilePictureURL(senderID);
    const targetPic = getProfilePictureURL(targetID);

    const response = await axios.get(LOVE_API_URL, {
      params: {
        api: API_KEY,
        image1: senderPic,
        image2: targetPic
      },
      responseType: 'stream',
      timeout: 10000
    });

    const fileName = `love2_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filePath = path.join(__dirname, fileName);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const msg = {
      body: `💘 Damn ${mentions[targetID]} looks *kinda cute* next to you 👀`,
      attachment: fs.createReadStream(filePath),
      mentions: [
        {
          tag: mentions[targetID],
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
        if (unlinkErr) console.error("❌ Error deleting file:", unlinkErr);
      });
    });

  } catch (err) {
    console.error("❌ love2 command error:", err.message);
    api.sendMessage("❌", threadID, messageID);
  }
};