const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const WANTED_API_URL = 'https://nexalo-api.vercel.app/api/wanted';

function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.config = {
  name: "wanted",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate a wanted poster with your profile picture or a mentioned user's picture",
  category: "Fun",
  guide: "{pn}wanted - Generate a wanted poster with your profile picture\n{pn}wanted @user - Generate a wanted poster with a mentioned user's profile picture",
  usePrefix: true
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID, mentions } = event;

  try {
    // Check if a user was mentioned
    let targetID = senderID;
    let targetName = null;

    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length > 0) {
      targetID = mentionIDs[0];
      targetName = mentions[targetID].replace('@', '').trim();
    }

    // Fetch the target user's name if not already set (for the command user)
    if (!targetName) {
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo([senderID], (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
      targetName = userInfo[senderID]?.name || "Unknown User";
    }

    const profilePicUrl = getProfilePictureURL(targetID);

    // Construct the API URL
    const apiUrl = `${WANTED_API_URL}?url=${encodeURIComponent(profilePicUrl)}`;

    // Call the API to generate the wanted poster
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.url) {
      const wantedImageUrl = response.data.url;

      // Send the wanted poster image
      const imageStream = await axios({
        url: wantedImageUrl,
        method: "GET",
        responseType: "stream"
      }).then(res => res.data);

      const msg = {
        body: `🪙 Wanted poster generated successfully for ${targetName}!`,
        attachment: imageStream
      };

      // Add mention if a user was tagged
      if (targetID !== senderID) {
        msg.mentions = [
          {
            tag: `@${targetName}`,
            id: targetID
          }
        ];
      }

      api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error(response.data.message || "Wanted poster generation failed");
    }
  } catch (err) {
    console.error("[Wanted Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);
  }
};