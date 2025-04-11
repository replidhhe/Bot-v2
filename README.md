
# Messenger-NexaloSIM-Bot

![GitHub stars](https://img.shields.io/github/stars/1dev-hridoy/Messenger-NexaloSIM-Bot) ![GitHub forks](https://img.shields.io/github/forks/1dev-hridoy/Messenger-NexaloSIM-Bot) ![GitHub issues](https://img.shields.io/github/issues/1dev-hridoy/Messenger-NexaloSIM-Bot) ![License](https://img.shields.io/github/license/1dev-hridoy/Messenger-NexaloSIM-Bot)

A feature-rich Facebook Messenger bot built with `ws3-fca`, designed to provide a variety of commands and utilities for group chats. The bot includes a web dashboard to monitor its status, uptime, and console logs in real-time.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Web Dashboard](#web-dashboard)
- [Commands](#commands)
- [Creating a New Command](#creating-a-new-command)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Changelog](#changelog)

## Features
- **Interactive Commands**: Over 30 commands for fun, utility, and media generation (e.g., `sing`, `copilot`, `fbcover`, `palestine`, etc.).
- **Event Handling**: Supports group events like member joins and leaves with customizable messages.
- **Social Media Downloader**: Download media from social platforms (handled by the `socialMediaDownloader` event).
- **Web Dashboard**: Monitor the bot’s status, uptime, and console logs in real-time via a web interface.
- **Multi-Language Support**: Supports multiple languages with a configurable language file.
- **Auto-Update Check**: Automatically checks for updates from the GitHub repository.
- **Customizable Prefix**: Configure the bot’s command prefix via `config.json`.
- **Admin-Only Commands**: Restrict certain commands to admin users.

## Prerequisites
- **Node.js**: Version 20.17.0 or higher.
- **PM2**: Process manager for running the bot in the background.
- **Facebook Account**: A Facebook account to log in and generate an `appState.json` file.
- **Server Access**: A server (local or virtual) to host the bot and web dashboard.
- **Port Access**: Ensure port `28140` (or your configured port) is open for the web dashboard.

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/1dev-hridoy/Messenger-NexaloSIM-Bot.git
   cd Messenger-NexaloSIM-Bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Install PM2 Globally** (if not already installed):
   ```bash
   npm install -g pm2
   ```

4. **Generate `appState.json`**:
   - Log in to your Facebook account using a tool like `facebook-chat-api` or a similar method to generate an `appState.json` file.
   - Place the `appState.json` file in the project root directory.

5. **Configure the Bot**:
   - See the [Configuration](#configuration) section below to set up `config.json`.

6. **Start the Bot**:
   ```bash
   pm2 start index.js --name bot
   ```

## Configuration
The bot’s configuration is managed via the `config.json` file in the project root. Below is an example configuration:

```json
{
  "botName": "NexaloSIM-Bot",
  "prefix": ".",
  "language": "en",
  "adminUIDs": ["your-facebook-uid-here"]
}
```

- **`botName`**: The name of your bot (displayed in logs and messages).
- **`prefix`**: The command prefix (e.g., `.help`).
- **`language`**: The language code for messages (e.g., `en` for English). Language files are located in the `languages` directory.
- **`adminUIDs`**: An array of Facebook user IDs allowed to use admin-only commands.

### Language Files
Language files are located in the `languages` directory (e.g., `en.lang`). You can add new languages by creating a new `.lang` file and updating the `language` field in `config.json`.

## Usage
1. **Start the Bot**:
   ```bash
   pm2 start index.js --name bot
   ```

2. **Check Bot Status**:
   ```bash
   pm2 list
   ```

3. **View Logs**:
   ```bash
   pm2 logs bot
   ```

4. **Interact with the Bot**:
   - Add the bot to a Facebook Messenger group.
   - Use commands by typing the prefix followed by the command name (e.g., `.help`).

5. **Access the Web Dashboard**:
   - Open your browser and navigate to `http://<your-server-ip>:28140` (e.g., `http://ip.ozima.cloud:28140`).
   - The dashboard will display the bot’s status, uptime, and console logs in real-time.

## Web Dashboard
The bot includes a web dashboard to monitor its status:
- **Status**: Shows whether the bot is `running` or `stopped`.
- **Uptime**: Displays the bot’s uptime in hours, minutes, and seconds.
- **Console Logs**: Streams console logs in real-time, with color-coded entries for `log` (white), `error` (red), and `warn` (yellow).

### Accessing the Dashboard
- Ensure the bot is running.
- Navigate to `http://<your-server-ip>:28140`.
- If the port is not accessible, check your server’s firewall settings and ensure port `28140` is open:
  ```bash
  sudo ufw allow 28140
  ```

## Commands
Here are some of the available commands (use `.help` in a chat to see the full list):

| Command       | Description                          | Usage Example      |
|---------------|--------------------------------------|--------------------|
| `.help`       | Displays the list of commands        | `.help`            |
| `.sing`       | Plays a song in the chat             | `.sing`            |
| `.copilot`    | AI assistant for answering questions | `.copilot`         |
| `.fbcover`    | Generates a Facebook cover image     | `.fbcover1`        |
| `.palestine`  | Creates a Palestine-themed image     | `.palestine1`      |
| `.ping`       | Checks the bot’s response time       | `.ping`            |
| `.uptime`     | Shows the bot’s uptime               | `.uptime`          |

### Admin-Only Commands
Some commands are restricted to admin users (defined in `config.json` under `adminUIDs`).

## Creating a New Command
You can easily add new commands to the bot by creating a new JavaScript file in the `scripts/commands` directory. Below is an example of how to create a simple `hello` command that responds with a greeting.

### Step 1: Create the Command File
1. Navigate to the `scripts/commands` directory.
2. Create a new file named `hello.js`.
3. Add the following code to `hello.js`:

```javascript
module.exports.config = {
  name: "hello",
  aliases: ["hi"],
  version: "1.0",
  author: "YourName",
  countDown: 0,
  adminOnly: false,
  description: "A simple command to greet the user",
  category: "General",
  guide: "{pn}hello - Say hello to the bot",
  usePrefix: true
};

module.exports.run = async function({ api, event, getText }) {
  const { threadID, messageID } = event;
  try {
    api.sendMessage("Hello! How can I assist you today? 😊", threadID, messageID);
  } catch (err) {
    console.error("[Hello Command Error]", err.message);
    api.sendMessage(getText("hello", "error", err.message), threadID, messageID);
  }
};
```

### Step 2: Update the Language File
The `hello` command uses the `getText` function for error messages. You need to add the corresponding text to the language file.

1. Open the `languages/en.lang` file.
2. Add the following line:
   ```
   hello.error=⚠️ An error occurred: %1
   ```
3. Save the file.

### Step 3: Test the Command
1. Restart the bot to load the new command:
   ```bash
   pm2 restart bot
   ```
2. In a Facebook Messenger group, type:
   ```
   .hello
   ```
3. The bot should respond with:
   ```
   Hello! How can I assist you today? 😊
   ```

### Command Structure
- **`config`**: Defines the command’s metadata (name, aliases, description, etc.).
  - `name`: The command name (e.g., `hello`).
  - `aliases`: Alternative names for the command (e.g., `hi`).
  - `adminOnly`: Set to `true` to restrict the command to admins.
  - `usePrefix`: Set to `true` to require the bot’s prefix (e.g., `.hello`).
- **`run`**: The function that executes when the command is called.
  - `api`: The `ws3-fca` API for interacting with Facebook Messenger.
  - `event`: The event object containing message details (e.g., `threadID`, `messageID`).
  - `getText`: A function to retrieve localized text from the language file.

You can create more complex commands by following this structure and adding your desired functionality.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit them (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please ensure your code follows the project’s coding style and includes appropriate documentation.

## License
This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## Contact
For questions, suggestions, or issues, feel free to reach out:
- **GitHub Issues**: [Open an issue](https://github.com/1dev-hridoy/Messenger-NexaloSIM-Bot/issues)
- **Email**: hridoyxqc@gmail.com

## Changelog
See the [CHANGELOG.md](CHANGELOG.md) file for a detailed history of changes and updates to the project.

---

Happy chatting with Messenger-NexaloSIM-Bot! 🚀