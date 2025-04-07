# Messenger-NexaloSIM-Bot

![GitHub stars](https://img.shields.io/github/stars/1dev-hridoy/Messenger-NexaloSIM-Bot) ![GitHub forks](https://img.shields.io/github/forks/1dev-hridoy/Messenger-NexaloSIM-Bot) ![GitHub issues](https://img.shields.io/github/issues/1dev-hridoy/Messenger-NexaloSIM-Bot)

A Node.js-based Facebook Messenger bot using the `ws3-fca` package, integrated with the Nexalo SIM API for custom AI-driven features. This bot supports a command system with a configurable prefix, processes messages in real-time via MQTT, and includes error handling and colorful logging with `chalk`.

## Features

- **Command System**: Dynamic command loading with a prefix (default: `!`).
- **Nexalo SIM Integration**: Custom AI-powered chat and training capabilities.
- **Media Support**: Fetch and send MP3 songs with the `sing` command.
- **Utility Commands**: Includes `ping`, `uptime`, `help`, and `remove` commands.
- **Error Handling**: Robust error handling with retries for network issues.
- **Logging**: Colorful console logs using `chalk` for better debugging.

## Project Structure

```
Messenger-NexaloSIM-Bot/
├── commands/           # Command files
│   ├── chat.js         # Chat with Nexalo SIM API
│   ├── teach.js        # Train the Nexalo SIM API
│   ├── ping.js         # Check bot latency
│   ├── sing.js         # Fetch and send MP3 songs
│   ├── uptime.js       # Display server info
│   ├── help.js         # List commands or show command details
│   └── remove.js       # Remove bot messages
├── config.json         # Bot configuration (prefix, bot name, admin UIDs)
├── appState.json       # Facebook login cookies (not included)
├── index.js            # Main entry point
├── package.json        # Dependencies and scripts
└── temp_image.jpg      # Temporary file for image downloads
```

## Prerequisites

- **Node.js**: Version 14.x or higher.
- **Facebook Account**: For generating `appState.json`.
- **Nexalo SIM API Key**: For AI features (`chat` and `teach` commands).

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

3. **Generate `appState.json`**:
   Use a tool like fbstate to generate `appState.json` with your Facebook login cookies.
   Place the `appState.json` file in the project root.

4. **Configure the Bot**:
   Edit `config.json` to set your bot’s name, prefix, and admin UIDs:
   ```json
   {
     "botName": "MyBot",
     "prefix": "!",
     "adminName": "AdminUser",
     "adminUIDs": ["your-facebook-uid"]
   }
   ```

5. **Set Nexalo SIM API Key**:
   Replace `MAINPOINT` in `commands/chat.js` and `commands/teach.js` with your actual Nexalo SIM API key.

6. **Run the Bot**:
   ```bash
   npm start
   ```

## Usage
The bot listens for messages in Messenger and responds to commands starting with the prefix (default: `!`).
Example: `!sing happy birthday` fetches and sends an MP3 of the song "Happy Birthday".

### Available Commands

| Command | Aliases      | Description                         | Usage                        | Category |
|---------|--------------|-------------------------------------|------------------------------|----------|
| chat    | talk, sim    | Chat with the Nexalo SIM API        | `!chat <question>`           | AI       |
| teach   | train, learn | Train the Nexalo SIM API            | `!teach <question> | <answer>` | Training |
| ping    | pong, latency| Check the bot's response time       | `!ping`                      | Utility  |
| sing    | song, music  | Fetch and send an MP3 of a song     | `!sing <song name>`          | Media    |
| uptime  | status, server| Display server info and uptime      | `!uptime`                    | Utility  |
| help    | commands, cmd| List all commands or show details   | `!help [command name]`       | Utility  |
| remove  | delete       | Remove a bot message (reply to it)  | `!remove (reply to msg)`     | Utility  |

## Configuration

### `config.json`:
- `botName`: Name of your bot.
- `prefix`: Command prefix (e.g., `!`).
- `adminName`: Name of the admin.
- `adminUIDs`: Array of Facebook UIDs allowed to use admin-only commands.

### Nexalo SIM API Key:
Replace `MAINPOINT` in `chat.js` and `teach.js` with your API key.

## Troubleshooting

### Bot Not Responding:
- Ensure `appState.json` is valid and not expired.
- Check if the bot has permissions in the chat.
- Verify the prefix in `config.json` matches your command (default: `!`).

### API Errors:
- If the `sing` command fails, the API (https://apis-rho-nine.vercel.app/ytsdlmp3) might be down. Check the console logs for details.
- For `chat` or `teach`, ensure your Nexalo SIM API key is correct.

### File Permission Issues:
- Ensure the bot has write permissions for the `commands/` directory to download files (e.g., MP3s, images).

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please ensure your code follows the existing style and includes appropriate error handling.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- Built with `ws3-fca` for Facebook Messenger integration.
- Uses Nexalo SIM API for custom AI features.
- Colorful logging with `chalk`.

## Contact

For issues or suggestions, open an issue on GitHub or contact the maintainer:

- Hridoy - [GitHub Profile](https://github.com/1dev-hridoy)

Happy chatting with your bot! 🎉

---

### Explanation of the README
1. **Header and Badges**:
   - Added GitHub badges for stars, forks, and issues to make the repo look professional.
   - Included a brief description of the bot.

2. **Features**:
   - Highlighted key features like the command system, Nexalo SIM integration, and media support.

3. **Project Structure**:
   - Listed the main files and their purposes to help users understand the codebase.

4. **Installation**:
   - Provided step-by-step instructions for setting up the bot, including generating `appState.json` and configuring the API key.

5. **Usage**:
   - Explained how to use the bot and listed all available commands in a table format for clarity.

6. **Configuration**:
   - Detailed how to configure `config.json` and the Nexalo SIM API key.

7. **Troubleshooting**:
   - Added common issues and solutions to help users debug problems.

8. **Contributing**:
   - Included guidelines for contributing to encourage community involvement.

9. **License and Acknowledgments**:
   - Added a placeholder for the MIT License (you can create a `LICENSE` file if needed).
   - Acknowledged the libraries used in the project.

10. **Contact**:
    - Provided a way for users to reach out for support.

---

### How to Add to Your Repository
1. Create a file named `README.md` in the root of your repository.
2. Copy and paste the content above into `README.md`.
3. Commit and push the file to your GitHub repository:
   ```bash
   git add README.md
   git commit -m "Add README.md"
   git push origin main
   ```

Visit https://github.com/1dev-hridoy/Messenger-NexaloSIM-Bot/ to see the updated README.

### Additional Suggestions
- **Add a License File**: If you want to use the MIT License, create a LICENSE file with the MIT License text.
- **Screenshots**: You could add screenshots of the bot in action (e.g., the help command output) to make the README more visually appealing.
- **CI/CD Badges**: If you set up automated tests or deployment, add badges for those workflows.
