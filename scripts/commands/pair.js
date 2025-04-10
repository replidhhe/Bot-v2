const axios = require('axios');

const PAIR_API_URL = 'https://nexalo-api.vercel.app/api/pair';
const GRAPH_API_BASE = 'https://graph.facebook.com';
const FB_HARDCODED_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662';

const pairQuotes = [
  "Two souls with but a single thought, two hearts that beat as one.",
  "Love is not only something you feel, it is something you do.",
  "We were together even when we were apart.",
  "You are my today and all of my tomorrows.",
  "In you, I’ve found the love of my life and my closest, truest friend.",
  "The best thing to hold onto in life is each other.",
  "Love recognizes no barriers, it jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope."
];

module.exports.config = {
  name: "pair",
  aliases: ["match", "couple"],
  version: "1.1",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Pairs the command user with a random group member and generates a combined image",
  category: "Fun",
  guide: "{pn}",
  usePrefix: true
};

async function getProfilePictureURL(userID, size = [512, 512]) {
  const [height, width] = size;
  return `${GRAPH_API_BASE}/${userID}/picture?width=${width}&height=${height}&access_token=${FB_HARDCODED_TOKEN}`;
}

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, senderID } = event;

  try {
    api.setMessageReaction("🕥", messageID, () => {}, true);

    const threadInfo = await new Promise((resolve, reject) => {
      api.getThreadInfo(threadID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    const participants = threadInfo.participantIDs;
    if (participants.length < 2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("Bro, need at least 2 members to pair up.", threadID, messageID);
    }

    const randomUserID = participants.filter(id => id !== senderID)[Math.floor(Math.random() * (participants.length - 1))];

    const userInfo = await new Promise((resolve, reject) => {
      api.getUserInfo([senderID, randomUserID], (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    const commandUserName = userInfo[senderID]?.name || "Unknown User";
    const randomUserName = userInfo[randomUserID]?.name || "Unknown User";

    const commandUserPic = await getProfilePictureURL(senderID);
    const randomUserPic = await getProfilePictureURL(randomUserID);

    if (!commandUserPic || !randomUserPic) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("Couldn't fetch profile pics, Facebook trippin' maybe 🤷‍♂️", threadID, messageID);
    }

    console.log(`📸 Profile Pics:\n- Sender: ${commandUserPic}\n- Match: ${randomUserPic}`);

    // Make API request to generate pair image
    const pairResponse = await axios.get(PAIR_API_URL, {
      params: {
        image1: commandUserPic,
        image2: randomUserPic
      },
      timeout: 10000
    });

    if (pairResponse.data && pairResponse.data.status) {
      const pairImageURL = pairResponse.data.url;

      const randomQuote = pairQuotes[Math.floor(Math.random() * pairQuotes.length)];

      api.setMessageReaction("✅", messageID, () => {}, true);
      const msg = {
        body: `💘 Love alert!\n${commandUserName} just got paired with ${randomUserName}\n"${randomQuote}"`,
        attachment: await axios({
          url: pairImageURL,
          method: "GET",
          responseType: "stream"
        }).then(res => res.data)
      };

      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.error("❌ Error sending pair image:", err);
          api.sendMessage("Couldn't send the image, bro. Something broke.", threadID);
        }
      });

    } else {
      console.error("❌ Unexpected API response:", pairResponse.data);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("Failed to process the pair image. Try again later.", threadID, messageID);
    }

  } catch (error) {
    console.error("❌ Something went wrong in pair command:", error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(`Error: ${error.message}`, threadID, messageID);
  }
};