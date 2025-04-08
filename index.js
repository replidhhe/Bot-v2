const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const fca = require('ws3-fca');
const axios = require('axios');
const { execSync } = require('child_process');

let globalConfig;
let appState;

try {
  globalConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (error) {
  console.error(chalk.red('[Config Error] Failed to parse config.json:'), error.message);
  process.exit(1);
}

try {
  appState = JSON.parse(fs.readFileSync('appState.json', 'utf8'));
} catch (error) {
  console.error(chalk.red('[AppState Error] Failed to parse appState.json:'), error.message);
  process.exit(1);
}

const langCode = globalConfig.language || 'en';
const pathLanguageFile = path.join(__dirname, 'languages', `${langCode}.lang`);

if (!fs.existsSync(pathLanguageFile)) {
  console.warn(`Can't find language file ${langCode}, using default language file "en.lang"`);
  pathLanguageFile = path.join(__dirname, 'languages', 'en.lang');
}

const readLanguage = fs.readFileSync(pathLanguageFile, "utf-8");
const languageData = readLanguage
  .split(/\r?\n|\r/)
  .filter(line => line && !line.trim().startsWith("#") && !line.trim().startsWith("//") && line !== "");

global.language = {};
for (const sentence of languageData) {
  const getSeparator = sentence.indexOf('=');
  const itemKey = sentence.slice(0, getSeparator).trim();
  const itemValue = sentence.slice(getSeparator + 1).trim();
  const head = itemKey.slice(0, itemKey.indexOf('.'));
  const key = itemKey.replace(head + '.', '');
  const value = itemValue.replace(/\\n/gi, '\n');
  if (!global.language[head]) global.language[head] = {};
  global.language[head][key] = value;
}

function getText(head, key, ...args) {
  if (!global.language[head]?.[key]) return `Can't find text: "${head}.${key}"`;
  let text = global.language[head][key];
  for (let i = args.length - 1; i >= 0; i--) text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
  return text;
}

const commands = new Map();
const events = new Map();
const commandsDir = path.join(__dirname, 'scripts', 'commands');
const eventsDir = path.join(__dirname, 'scripts', 'events');

const chalkGradient = (text) => {
  const colors = ['#00FFFF', '#55AAFF', '#AA55FF', '#FF55AA', '#FF5555'];
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const colorIndex = Math.floor((i / text.length) * colors.length);
    result += chalk.hex(colors[colorIndex])(text[i]);
  }
  return result;
};

const abstractBox = chalk.hex('#55FFFF')('═══════✨═══════✨═══════✨═══════');

fs.readdirSync(commandsDir).forEach(file => {
  if (file.endsWith('.js') && !fs.lstatSync(path.join(commandsDir, file)).isDirectory()) {
    try {
      const command = require(path.join(commandsDir, file));
      commands.set(command.config.name.toLowerCase(), command);
      console.log(chalk.hex('#00FFFF')(`✨ Command Loaded: ${chalkGradient(command.config.name)} ✨`));
    } catch (error) {
      console.error(chalk.hex('#FF5555')(`🔥 Command Load Failed: ${file} - ${error.message}`));
    }
  }
});

if (fs.existsSync(eventsDir)) {
  fs.readdirSync(eventsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const eventHandler = require(path.join(eventsDir, file));
        events.set(eventHandler.name.toLowerCase(), eventHandler);
        console.log(chalk.hex('#00FFFF')(`✨ Event Handler Loaded: ${chalkGradient(eventHandler.name)} ✨`));
      } catch (error) {
        console.error(chalk.hex('#FF5555')(`🔥 Event Handler Load Failed: ${file} - ${error.message}`));
      }
    }
  });
}

global.commands = commands;

let lastCommitSha = null;
let api = null;

async function checkForUpdates() {
  try {
    const { data: lastCommit } = await axios.get('https://api.github.com/repos/1dev-hridoy/Messenger-NexaloSIM-Bot/commits/main');
    const currentCommitSha = lastCommit.sha;

    if (!lastCommitSha) {
      lastCommitSha = currentCommitSha;
      console.log(chalk.green('[Update Check] Initial commit SHA:', lastCommitSha));
      return;
    }

    if (lastCommitSha !== currentCommitSha) {
      console.log(chalk.green('[Update Check] New commit detected:', currentCommitSha));
      lastCommitSha = currentCommitSha;

      const threadList = await new Promise((resolve, reject) => {
        api.getThreadList(100, null, ["INBOX"], (err, list) => {
          if (err) reject(err);
          else resolve(list);
        });
      });

      const groupThreads = threadList.filter(thread => thread.isGroup);
      const notificationTime = moment().format("hh:mm A");
      const notificationDate = moment().format("MMMM DD, YYYY");

      const updateMessage = getText("updater", "updateAvailable", globalConfig.prefix, notificationTime, notificationDate);

      for (const group of groupThreads) {
        api.sendMessage(updateMessage, group.threadID, (err) => {
          if (err) console.error(`Failed to send update notification to thread ${group.threadID}: ${err.message}`);
        });
      }
    } else {
      console.log(chalk.blue('[Update Check] No new updates available.'));
    }
  } catch (error) {
    console.error(chalk.red('[Update Check Error]', error.message));
  }
}

setInterval(checkForUpdates, 5 * 60 * 1000);

fca({ appState }, (err, fcaApi) => {
  if (err) {
    console.error(chalk.hex('#FF5555')('🔥 Login Failed:'), err.stack);
    return;
  }

  api = fcaApi; // Assign the API instance to the outer scope

  console.log(chalk.hex('#00FFFF')(`🌟 ${chalkGradient(`${globalConfig.botName} is Online!`)} 🌟`));

  // Run the initial update check after the API is initialized
  checkForUpdates();

  api.listenMqtt((err, event) => {
    if (err) {
      console.error(chalk.hex('#FF5555')('🔥 MQTT Error:'), err?.stack || err);
      return;
    }

    if (event && event.type === 'message') {
      const message = event.body || '';
      const senderID = event.senderID;
      const threadID = event.threadID;
      const messageID = event.messageID;
      const isImage = event.attachments && event.attachments.length > 0 && event.attachments[0].type === 'photo';

      api.getUserInfo(senderID, (err, userInfo) => {
        if (err) {
          console.error(chalk.hex('#FF5555')('🔥 User Info Fetch Failed:'), err);
          return;
        }

        const userName = userInfo[senderID]?.name || 'Unknown User';

        console.log(abstractBox);
        console.log(chalk.hex('#00FFFF')(`👤 User: ${chalkGradient(userName)}`));
        console.log(chalk.hex('#55AAFF')(`📩 Type: ${chalkGradient(isImage ? 'Image' : 'Text')}`));
        console.log(chalk.hex('#AA55FF')(`💬 Message: ${chalkGradient(isImage ? 'Image Attachment' : message)}`));
        console.log(chalk.hex('#FF55AA')(`🧵 Thread: ${chalkGradient(threadID)}`));
        console.log(abstractBox);

        const socialMediaDownloader = events.get('socialmediadownloader');
        if (socialMediaDownloader) {
          try {
            socialMediaDownloader.handle({ api, event });
          } catch (error) {
            console.error(chalk.red(`[SocialMediaDownloader Handler Error] ${error.message}`));
          }
        }

        const messageLower = message.toLowerCase().trim();
        let noPrefixCommand = null;

        for (const [name, command] of commands) {
          if (command.config.usePrefix === false) {
            if (messageLower === name || (command.config.aliases && command.config.aliases.includes(messageLower))) {
              noPrefixCommand = command;
              break;
            }
          }
        }

        if (noPrefixCommand) {
          try {
            noPrefixCommand.run({ api, event, args: messageLower.split(/\s+/), config: globalConfig, getText });
          } catch (error) {
            api.sendMessage(`⚠️ Error: ${error.message}`, threadID, messageID);
            console.error(chalk.hex('#FF5555')(`🔥 Command Crashed (${noPrefixCommand.config.name}):`), error.stack);
          }
          return;
        }

        if (message.startsWith(globalConfig.prefix)) {
          const [commandName, ...args] = message.slice(globalConfig.prefix.length).trim().split(/\s+/);
          const cmdNameLower = commandName.toLowerCase();

          let command = commands.get(cmdNameLower);
          if (!command) {
            for (const [name, cmd] of commands) {
              if (cmd.config.aliases && cmd.config.aliases.includes(cmdNameLower)) {
                command = cmd;
                break;
              }
            }
          }

          if (command) {
            const { config } = command;

            if (config.adminOnly && !globalConfig.adminUIDs.includes(senderID)) {
              api.setMessageReaction("❌", messageID, () => {}, true);
              return api.sendMessage(getText("general", "adminOnly"), threadID, messageID);
            }

            try {
              command.run({ api, event, args, config: globalConfig, getText });
            } catch (error) {
              api.setMessageReaction("❌", messageID, () => {}, true);
              api.sendMessage(`⚠️ Error: ${error.message}`, threadID, messageID);
              console.error(chalk.hex('#FF5555')(`🔥 Command Crashed (${commandName}):`), error.stack);
            }
          } else {
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage(`⚠️ Unknown command: ${commandName}`, threadID, messageID);
            console.log(chalk.hex('#FF5555')(`❓ Unknown Command: ${chalkGradient(commandName)} | Thread: ${chalkGradient(threadID)}`));
          }
        }
      });
    }

    if (event && event.type === 'event' && event.threadID) {
      const threadID = event.threadID;

      if (event.logMessageType === 'log:subscribe') {
        const joinHandler = events.get('join');
        if (joinHandler) {
          try {
            joinHandler.handle({ api, event });
          } catch (error) {
            console.error(chalk.red(`[Join Event Handler Error] ${error.message}`));
          }
        }
      }

      if (event.logMessageType === 'log:unsubscribe') {
        const leaveHandler = events.get('leave');
        if (leaveHandler) {
          try {
            leaveHandler.handle({ api, event });
          } catch (error) {
            console.error(chalk.red(`[Leave Event Handler Error] ${error.message}`));
          }
        }
      }
    }
  });
});