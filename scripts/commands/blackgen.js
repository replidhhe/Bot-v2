const axios = require('axios');

const BLACKBOX_API_URL = 'https://nexalo-api.vercel.app/api/blackbox';

module.exports.config = {
  name: "blackgen",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate an AI-generated Blackbox image based on your prompt",
  category: "AI Media",
  guide: "{pn}blackgen [your prompt] - Generate an AI-generated image using the specified prompt",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    // Extract the user prompt from args
    const userPrompt = args.join(' ').trim();
    if (!userPrompt) {
      return api.sendMessage("⚠️ Please provide a prompt to generate the Blackbox image!", threadID, messageID);
    }

    // Construct the API URL
    const apiUrl = `${BLACKBOX_API_URL}?prompt=${encodeURIComponent(userPrompt)}`;

    // Call the API to generate the Blackbox image
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.blackboxUrl) {
      const blackboxImageUrl = response.data.blackboxUrl;

      // Send the Blackbox image
      const imageStream = await axios({
        url: blackboxImageUrl,
        method: "GET",
        responseType: "stream"
      }).then(res => res.data);

      const msg = {
        body: `🖼️ Blackbox image generated successfully for the prompt: "${userPrompt}"`,
        attachment: imageStream
      };

      api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error(response.data.message || "Blackbox image generation failed");
    }
  } catch (err) {
    console.error("[Blackgen Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);
  }
};