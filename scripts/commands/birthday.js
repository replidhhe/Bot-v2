const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const API_URL = 'https://nexalo-api.vercel.app/api/birthday';

module.exports.config = {
  name: "birthday",
  aliases: ["bday", "wish"],
  version: "1.1",
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
  const { threadID, messageID, mentions } = event;

  try {
    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length === 0) {
      return api.sendMessage("Bruh tag someone to wish! Can't wish the void. 🎂👻", threadID, messageID);
    }

    const targetID = mentionIDs[0];
    const rawName = mentions[targetID];
    const cleanName = rawName.replace(/^@/, "");
    const profilePicURL = getProfilePictureURL(targetID);

    // Make API call to generate birthday wish image
    const response = await axios.get(API_URL, {
      params: {
        name: cleanName,
        image: profilePicURL
      },
      timeout: 10000
    });

    if (response.data && response.data.status) {
      const birthdayImageURL = response.data.url;

      const msg = {
        body: `🎉 Happy Birthday ${rawName}! Hope it's lit AF 🎂💖`,
        attachment: await axios({
          url: birthdayImageURL,
          method: "GET",
          responseType: "stream"
        }).then(res => res.data),
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
      });
    } else {
      console.error("❌ Unexpected API response:", response.data);
      api.sendMessage("❌ Failed to process the birthday wish image.", threadID, messageID);
    }

  } catch (err) {
    console.error("❌ Birthday command error:", err.message);
    api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
  }
};