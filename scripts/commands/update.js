const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

module.exports.config = {
  name: "update",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: true,
  description: "Update the bot to the latest version from GitHub",
  category: "Admin",
  guide: "{pn}update",
  usePrefix: true
};

module.exports.run = async function({ api, event, config, getText }) {
  const { threadID, messageID } = event;

  try {
    api.sendMessage(getText("updater", "checking"), threadID, messageID);

    // Create a backup folder for untracked/modified files
    const backupDir = path.join(__dirname, '..', '..', 'backups', `backup_${Date.now()}`);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Check for untracked files
    const { stdout: untrackedFiles } = await execPromise("git ls-files --others --exclude-standard");
    const untrackedList = untrackedFiles.trim().split('\n').filter(file => file);

    // Check for modified files
    const { stdout: modifiedFiles } = await execPromise("git ls-files --modified");
    const modifiedList = modifiedFiles.trim().split('\n').filter(file => file);

    // Back up untracked and modified files
    const filesToBackup = [...new Set([...untrackedList, ...modifiedList])];
    for (const file of filesToBackup) {
      const srcPath = path.join(process.cwd(), file);
      const destPath = path.join(backupDir, file);
      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Update Backup] Backed up ${file} to ${destPath}`);
      }
    }

    if (filesToBackup.length > 0) {
      api.sendMessage(`📁 Backed up ${filesToBackup.length} untracked/modified files to ${backupDir}`, threadID, messageID);
    }

    // Fetch and reset to the latest commit
    await execPromise("git fetch origin main");
    await execPromise("git reset --hard origin/main");
    api.sendMessage(getText("updater", "codeUpdated"), threadID, messageID);

    // Install dependencies
    await execPromise("npm install");
    api.sendMessage(getText("updater", "depsInstalled"), threadID, messageID);

    // Check if the PM2 process exists
    let processExists = false;
    try {
      const { stdout } = await execPromise("pm2 list");
      if (stdout.includes('bot')) {
        processExists = true;
      }
    } catch (error) {
      console.error(`[PM2 Check Error] ${error.message}`);
    }

    // Restart or start the process
    if (processExists) {
      await execPromise("pm2 restart bot");
      api.sendMessage(getText("updater", "restartSuccess"), threadID, messageID);
    } else {
      await execPromise("pm2 start pm2.config.js");
      api.sendMessage("🚀 Bot process was not running. Started the bot successfully!", threadID, messageID);
    }
  } catch (error) {
    api.sendMessage(getText("updater", "error", error.message), threadID, messageID);
    console.error(`[Update Command Error] ${error.message}`);
  }
};