const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

module.exports.config = {
  name: "vip",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false, 
  description: "Manage VIP users (list, add, or remove VIPs)",
  category: "Admin",
  guide: "{pn} list - Shows the list of VIP users\n{pn} @username - Adds a user to the VIP list (Admin only)\n{pn} remove @username - Removes a user from the VIP list (Admin only)",
  usePrefix: true,
};

module.exports.run = async function ({ api, event, args, getText, config }) {
  const { threadID, messageID, mentions, senderID } = event;

  const vipFilePath = path.join(__dirname, '../../assets/vip.json');

  const assetsDir = path.join(__dirname, '../../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(chalk.green(`[Vip Command] Created assets directory: ${assetsDir}`));
  }

  let vipData = { vips: [] };
  if (!fs.existsSync(vipFilePath)) {
    fs.writeFileSync(vipFilePath, JSON.stringify(vipData, null, 2));
    console.log(chalk.green(`[Vip Command] Created vip.json file: ${vipFilePath}`));
  } else {

    try {
      const fileContent = fs.readFileSync(vipFilePath, 'utf8');
      vipData = JSON.parse(fileContent);
    } catch (err) {
      console.log(chalk.red(`[Vip Error] Failed to parse vip.json: ${err.message}`));
      vipData = { vips: [] }; 
    }
  }

  try {

    api.setMessageReaction("🕥", messageID, () => {}, true);

    const isAdmin = config.adminUIDs.includes(senderID);

    const command = args[0]?.toLowerCase();

    if (command === "list") {

      if (vipData.vips.length === 0) {
        api.sendMessage("📜 No VIP users found.", threadID, () => {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }, messageID);
        console.log(chalk.cyan(`[Vip Command] Displayed empty VIP list | ThreadID: ${threadID}`));
        return;
      }

      const vipList = [];
      for (const [index, vip] of vipData.vips.entries()) {
        const userInfo = await new Promise((resolve, reject) => {
          api.getUserInfo(vip.id, (err, info) => {
            if (err) return reject(err);
            resolve(info);
          });
        });
        const userName = userInfo[vip.id]?.name || "Unknown User";
        const emoji = ["👑", "😎", "👑", "🚀", "💀"][index % 5]; 
        vipList.push(
          `╭──── [ ${emoji} VIP ${index + 1} ]\n` +
          `│ ✧ Name: ${userName}\n` +
          `│ ✧ UID: ${vip.id}\n` +
          `╰───────────────◊`
        );
      }

      const gifUrl = "https://i.ibb.co/84SnC93f/standard-1.gif";
      const fileName = `vip_${crypto.randomBytes(8).toString('hex')}.gif`;
      const filePath = path.join(__dirname, fileName);
      const gifResponse = await axios.get(gifUrl, { responseType: 'stream', timeout: 15000 });
      const writer = fs.createWriteStream(filePath);
      gifResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", () => {
          console.log(chalk.green(`[Vip Command] Successfully downloaded GIF: ${filePath}`));
          resolve();
        });
        writer.on("error", (err) => {
          console.log(chalk.red(`[Vip Error] Failed to download GIF: ${err.message}`));
          reject(err);
        });
      });

      const response = `
╭───── [ 👑 VIP LIST ]
│ 『 Exclusive access granted 🔐』
╰───────────────◊

${vipList.join("\n\n")}

『 Want to join the VIP fam? Step your game up 🔥 』
      `.trim();

      const msg = {
        body: response,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(msg, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

      console.log(chalk.cyan(`[Vip Command] Displayed VIP list | ThreadID: ${threadID}`));

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.log(chalk.red(`[Vip Error] Failed to delete GIF file: ${unlinkErr.message}`));
        } else {
          console.log(chalk.green(`[Vip Command] Successfully deleted GIF file: ${filePath}`));
        }
      });
    } else if (command === "remove" && Object.keys(mentions).length > 0) {

      if (!isAdmin) {
        api.sendMessage(
          "❌ Only admins can remove users from the VIP list.",
          threadID,
          () => {
            api.setMessageReaction("❌", messageID, () => {}, true);
          },
          messageID
        );
        console.log(chalk.cyan(`[Vip Command] Non-admin tried to remove VIP | ThreadID: ${threadID}`));
        return;
      }

      const mentionID = Object.keys(mentions)[0];
      const mentionName = mentions[mentionID].replace(/@/g, '');

      const vipIndex = vipData.vips.findIndex(vip => vip.id === mentionID);
      if (vipIndex === -1) {
        api.sendMessage(
          `⚠️ ${mentionName} is not a VIP!`,
          threadID,
          () => {
            api.setMessageReaction("❌", messageID, () => {}, true);
          },
          messageID
        );
        console.log(chalk.cyan(`[Vip Command] User ${mentionName} (ID: ${mentionID}) not a VIP | ThreadID: ${threadID}`));
        return;
      }

      vipData.vips.splice(vipIndex, 1);
      fs.writeFileSync(vipFilePath, JSON.stringify(vipData, null, 2));

      api.sendMessage(
        `✅ ${mentionName} has been removed from the VIP list!`,
        threadID,
        () => {
          api.setMessageReaction("✅", messageID, () => {}, true);
        },
        messageID
      );

      console.log(chalk.cyan(`[Vip Command] Removed ${mentionName} (ID: ${mentionID}) from VIP list | ThreadID: ${threadID}`));
    } else if (Object.keys(mentions).length > 0) {

      if (!isAdmin) {
        api.sendMessage(
          "❌ Only admins can add users to the VIP list.",
          threadID,
          () => {
            api.setMessageReaction("❌", messageID, () => {}, true);
          },
          messageID
        );
        console.log(chalk.cyan(`[Vip Command] Non-admin tried to add VIP | ThreadID: ${threadID}`));
        return;
      }

      const mentionID = Object.keys(mentions)[0];
      const mentionName = mentions[mentionID].replace(/@/g, '');

      if (vipData.vips.some(vip => vip.id === mentionID)) {
        api.sendMessage(
          `⚠️ ${mentionName} is already a VIP!`,
          threadID,
          () => {
            api.setMessageReaction("❌", messageID, () => {}, true);
          },
          messageID
        );
        console.log(chalk.cyan(`[Vip Command] User ${mentionName} (ID: ${mentionID}) already a VIP | ThreadID: ${threadID}`));
        return;
      }

      vipData.vips.push({ id: mentionID, name: mentionName });
      fs.writeFileSync(vipFilePath, JSON.stringify(vipData, null, 2));

      api.sendMessage(
        `✅ ${mentionName} has been added to the VIP list!`,
        threadID,
        () => {
          api.setMessageReaction("✅", messageID, () => {}, true);
        },
        messageID
      );

      console.log(chalk.cyan(`[Vip Command] Added ${mentionName} (ID: ${mentionID}) to VIP list | ThreadID: ${threadID}`));
    } else {

      api.sendMessage(
        `❌ Invalid usage. Use:\n${config.prefix}vip list - to see the VIP list\n${config.prefix}vip @username - to add a user to the VIP list (Admin only)\n${config.prefix}vip remove @username - to remove a user from the VIP list (Admin only)`,
        threadID,
        () => {
          api.setMessageReaction("❌", messageID, () => {}, true);
        },
        messageID
      );
      console.log(chalk.cyan(`[Vip Command] Invalid usage | ThreadID: ${threadID}`));
    }
  } catch (error) {

    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage(
      "⚠️ An error occurred while processing the VIP command.",
      threadID,
      messageID
    );
    console.log(chalk.red(`[Vip Error] ${error.message}`));
  }
};