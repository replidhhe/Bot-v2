const fs = require('fs');
const path = require('path');
const fca = require('ws3-fca');
const chalk = require('chalk');

const globalConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const appState = JSON.parse(fs.readFileSync('appState.json', 'utf8'));

const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');

fs.readdirSync(commandsDir).forEach(file => {
  if (file.endsWith('.js')) {
    try {
      const command = require(path.join(commandsDir, file));
      commands.set(command.config.name.toLowerCase(), command);
      console.log(chalk.hex('#00FFFF')(`✨ Command Loaded: ${chalkGradient(command.config.name)} ✨`));
    } catch (error) {
      console.error(chalk.hex('#FF5555')(`🔥 Command Load Failed: ${file} - ${error.message}`));
    }
  }
});

global.commands = commands;

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

fca({ appState }, (err, api) => {
  if (err) {
    console.error(chalk.hex('#FF5555')('🔥 Login Failed:'), err.stack);
    return;
  }

  console.log(chalk.hex('#00FFFF')(`🌟 ${chalkGradient(`${globalConfig.botName} is Online!`)} 🌟`));

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
              return api.sendMessage("🚫 This command is for admins only.", threadID, messageID);
            }

            try {
              command.run({ api, event, args, config: globalConfig });
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
  });
});