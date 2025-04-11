//=============== [ UNSEND MODULE - AMINULBOT ] ===============//
//=> Remove bot-sent messages with a reply.
//=> Author: Hridoy | Decorated by AminulBot Dev
//============================================================//

const chalk = require("chalk");

// Command configuration
module.exports.config = {
  name: "unsend",
  aliases: [],
  version: "1.0",
  author: "Hridoy",
  countDown: 5,
  adminOnly: false,
  description: "Remove messages sent by the bot via reply",
  category: "AI",
  guide: "{pn}unsend [reply to a bot message]",
  usePrefix: true
};

// Multi-language support
module.exports.languages = {
  vi: {
    returnCant: "Không thể gỡ tin nhắn của người khác.",
    missingReply: "Hãy reply tin nhắn cần gỡ."
  },
  en: {
    returnCant: "Can't unsend messages from others.",
    missingReply: "Please reply to a message sent by the bot to unsend it."
  }
};

// Run command
module.exports.run = function ({ api, event, getText }) {
  const botID = api.getCurrentUserID();

  if (event.type !== "message_reply") {
    console.log(chalk.yellow(`[UNSEND] User tried without reply.`));
    return api.sendMessage(getText("missingReply"), event.threadID, event.messageID);
  }

  if (event.messageReply.senderID !== botID) {
    console.log(chalk.red(`[UNSEND] Attempt to remove message not sent by bot.`));
    return api.sendMessage(getText("returnCant"), event.threadID, event.messageID);
  }

  api.unsendMessage(event.messageReply.messageID, (err) => {
    if (err) {
      console.log(chalk.red(`[UNSEND] Error while unsending: ${err}`));
    } else {
      console.log(chalk.green(`[UNSEND] Message unsent successfully.`));
    }
  });
};
