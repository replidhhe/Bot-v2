const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const execPromise = util.promisify(exec);

module.exports.config = {
  name: "update",
  aliases: [],
  version: "1.1",
  author: "Hridoy",
  countDown: 5,
  adminOnly: true,
  description: "Check for updates or update the bot to the latest version from GitHub",
  category: "Admin",
  guide: "{pn}update - Check for updates\n{pn}update install - Install the latest version",
  usePrefix: true
};

module.exports.run = async function({ api, event, args, config, getText }) {
  const { threadID, messageID } = event;

  try {
    // Function to check for updates (imported from index.js)
    const checkForUpdates = async () => {
      let lastCommitSha = null;
      try {
        const { data: lastCommit } = await axios.get('https://api.github.com/repos/1dev-hridoy/Messenger-NexaloSIM-Bot/commits/main');
        const currentCommitSha = lastCommit.sha;

        if (!lastCommitSha) {
          lastCommitSha = currentCommitSha;
          console.log(chalk.green('[Update Check] Initial commit SHA:', lastCommitSha));
          return { isUpdateAvailable: false, commit: null };
        }

        if (lastCommitSha !== currentCommitSha) {
          console.log(chalk.green('[Update Check] New commit detected:', currentCommitSha));
          lastCommitSha = currentCommitSha;
          return { isUpdateAvailable: true, commit: lastCommit };
        } else {
          console.log(chalk.blue('[Update Check] No new updates available.'));
          return { isUpdateAvailable: false, commit: null };
        }
      } catch (error) {
        console.error(chalk.red('[Update Check Error]', error.message));
        throw error;
      }
    };

    // Check for updates
    api.sendMessage(getText("updater", "checking"), threadID, messageID);
    const { isUpdateAvailable, commit } = await checkForUpdates();

    if (!isUpdateAvailable) {
      return api.sendMessage(getText("updater", "noUpdate"), threadID, messageID);
    }

    // Display update info
    const commitMessage = commit.commit.message;
    const commitAuthor = commit.commit.author.name;
    const commitDate = moment(commit.commit.author.date).format("MMMM DD, YYYY, hh:mm A");
    const updateInfo = getText("updater", "updateInfo", commitMessage, commitAuthor, commitDate, config.prefix);
    api.sendMessage(updateInfo, threadID, messageID);

    // If the user wants to install the update
    if (args[0] && args[0].toLowerCase() === "install") {
      // Back up appState.json
      const appStatePath = path.join(__dirname, '..', '..', 'appState.json');
      const appStateBackupPath = path.join(__dirname, '..', '..', 'backups', `appState_${Date.now()}.json`);
      if (fs.existsSync(appStatePath)) {
        fs.copyFileSync(appStatePath, appStateBackupPath);
        console.log(`[Update Backup] Backed up appState.json to ${appStateBackupPath}`);
      }

      // Create a backup folder for untracked/modified files
      const backupDir = path.join(__dirname, '..', '..', 'backups', `backup_${Date.now()}`);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Check for untracked files
      const { stdout: untrackedFiles } = await execPromise("git ls-files --others --exclude-standard");
      const untrackedList = untrackedFiles.trim().split('\n').filter(file => file && file !== 'appState.json');

      // Check for modified files
      const { stdout: modifiedFiles } = await execPromise("git ls-files --modified");
      const modifiedList = modifiedFiles.trim().split('\n').filter(file => file && file !== 'appState.json');

      // Back up untracked and modified files (excluding appState.json)
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
        api.sendMessage(getText("updater", "backupFiles", filesToBackup.length, backupDir), threadID, messageID);
      }

      // Fetch and reset to the latest commit
      await execPromise("git fetch origin main");
      await execPromise("git reset --hard origin/main");
      api.sendMessage(getText("updater", "codeUpdated"), threadID, messageID);

      // Restore appState.json
      if (fs.existsSync(appStateBackupPath)) {
        fs.copyFileSync(appStateBackupPath, appStatePath);
        console.log(`[Update Restore] Restored appState.json from ${appStateBackupPath}`);
      }

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
        api.sendMessage(getText("updater", "processStarted"), threadID, messageID);
      }
    }
  } catch (error) {
    api.sendMessage(getText("updater", "error", error.message), threadID, messageID);
    console.error(`[Update Command Error] ${error.message}`);
  }
};