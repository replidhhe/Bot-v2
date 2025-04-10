const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';
const KISS_API_URL = 'https://nexalo-api.vercel.app/api/kiss';

module.exports.config = {
  name: "kiss",
  aliases: [],
  version: "1.1",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Make it romantic 💋",
  category: "Fun",
  guide: "{pn} kiss @user or {pn} kiss @user1 @user2",
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

    // Check if no user is mentioned
    if (mentionIDs.length === 0) {
      return api.sendMessage("Tag someone to kiss, you lonely mf 😭", threadID, messageID);
    }

    let image1, image2, messageBody;

    // If one user is mentioned, make the image between the command user and the mentioned user
    if (mentionIDs.length === 1) {
      const targetID = mentionIDs[0];
      const targetName = mentions[targetID];

      // Prevent user from kissing themselves
      if (targetID === senderID) {
        return api.sendMessage("You tryna kiss yourself?? Damn bro, chill 💀", threadID, messageID);
      }

      image1 = getProfilePictureURL(targetID); // Target's picture
      image2 = getProfilePictureURL(senderID); // Command user's picture

      messageBody = `💋 Aww shit, ${mentions[targetID]} just got kissed by you 😍`;

    } else if (mentionIDs.length === 2) {
      // If two users are mentioned, make the image between the two mentioned users
      const [firstMentionID, secondMentionID] = mentionIDs;
      const firstMentionName = mentions[firstMentionID];
      const secondMentionName = mentions[secondMentionID];

      image1 = getProfilePictureURL(secondMentionID); // Second mentioned user's picture
      image2 = getProfilePictureURL(firstMentionID); // First mentioned user's picture

      messageBody = `💋 Aww shit, ${mentions[firstMentionID]} just kissed ${mentions[secondMentionID]} 😍`;

    } else {
      // If more than two users are mentioned
      return api.sendMessage("Bro, I can't handle so many kisses at once! Tag only 1 or 2 people. 😩", threadID, messageID);
    }

    // Make API request to generate the kiss image
    const response = await axios.get(KISS_API_URL, {
      params: {
        image1: image1, // First image
        image2: image2, // Second image
      },
      timeout: 10000
    });

    if (response.data && response.data.status) {
      const kissImageURL = response.data.url;

      const msg = {
        body: messageBody,
        attachment: await axios({
          url: kissImageURL,
          method: "GET",
          responseType: "stream"
        }).then(res => res.data),
        mentions: mentionIDs.map(id => ({
          tag: mentions[id],
          id: id
        }))
      };

      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.error("❌ Error sending kiss image:", err);
          api.sendMessage("❌", threadID, messageID);
        }
      });

    } else {
      console.error("❌ Unexpected API response:", response.data);
      api.sendMessage("❌ Failed to process the image.", threadID, messageID);
    }

  } catch (err) {
    console.error("❌ Kiss command error:", err.message);
    api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
  }
};