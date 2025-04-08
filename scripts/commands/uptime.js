const os = require('os');
const chalk = require('chalk');

module.exports.config = {
  name: "uptime",
  aliases: ["status", "server"],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Displays the bot's uptime and server info with a fancy design",
  category: "Utility",
  guide: "{pn}",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config }) {
  const { threadID, messageID } = event;

  try {
    api.setMessageReaction("🕥", messageID, () => {}, true);

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    const memoryUsage = process.memoryUsage();
    const usedMemoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const totalMemoryMB = (os.totalmem() / 1024 / 1024).toFixed(2);

    const cpuCount = os.cpus().length;
    const platform = os.platform();

    const response = `
╭──✦ [ Uptime Information ]
╰‣ ⏱ Process Uptime: ${days * 24 + hours} hours ${minutes} minutes ${seconds} seconds

╭──✦ [ System Information ]
├‣ 📡 OS: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
├‣ 🛡 Cores: ${cpuCount}
├‣ 📊 RAM Usage: ${usedMemoryMB} MB
├‣ 📈 Total Memory: ${totalMemoryMB} MB
╰‣ ⚡ Status: Online and kicking! 🚀
    `.trim();

    api.sendMessage(response, threadID, () => {
      api.setMessageReaction("✅", messageID, () => {}, true);
    }, messageID);

    console.log(chalk.cyan(`[Uptime Requested] Thread: ${threadID} | Process Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`));
  } catch (error) {
    console.log(chalk.red(`[Uptime Failed] ${error.message}`));
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("⚠️ Failed to fetch server info. Try again later!", threadID, messageID);
  }
};