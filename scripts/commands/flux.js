const axios = require('axios');

const FLUX_API_URL = 'https://nexalo-api.vercel.app/api/flux';

module.exports.config = {
  name: "flux",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Generate an image based on your prompt using Flux AI",
  category: "AI Media",
  guide: "{pn}flux [your prompt] - Generate an AI-generated image based on your prompt",
  usePrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    // Extract the user prompt from args
    const userPrompt = args.join(' ').trim();
    if (!userPrompt) {
      return api.sendMessage("⚠️ Please provide a prompt to generate the image!", threadID, messageID);
    }

    // Construct the API URL
    const apiUrl = `${FLUX_API_URL}?prompt=${encodeURIComponent(userPrompt)}`;

    // Call the API to generate the image
    const response = await axios.get(apiUrl);

    if (response.data && response.data.status && response.data.imageUrl) {
      const fluxImageUrl = response.data.imageUrl;

      // Send the generated image
      const imageStream = await axios({
        url: fluxImageUrl,
        method: "GET",
        responseType: "stream"
      }).then(res => res.data);

      const msg = {
        body: `🖼️ Image generated successfully for the prompt: "${userPrompt}"`,
        attachment: imageStream
      };

      api.sendMessage(msg, threadID, messageID);
    } else {
      throw new Error(response.data.message || "Image generation failed");
    }
  } catch (err) {
    console.error("[Flux Command Error]", err.message);
    api.sendMessage(`⚠️ Error: ${err.message}`, threadID, messageID);
  }
};