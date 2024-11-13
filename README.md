# bias.is - Bluesky ❤️ Your Bias

This is based on the original [github-labeler](https://github.com/hipstersmoothie/github-labeler-bot), which provides both a persistent bot connection to Bluesky and a lightweight labeler service based on code from [Skyware](https://github.com/skyware-js/labeler).

# Wayfinding

- `src/server.ts`: Entry point. Starts both a labeler service and the bot connection
- `src/labeler.ts`: Creates a server that bsky will make requests to for information about labeled content
- `src/bot.ts`: Creates a bot that will respond to messages from users

Both are started via `tsx` to avoid an extra build step.

# Development

- To develop, you'll need the following env vars set

| `env`              | description                    | how to get it                                                                                                                                         |
| :----------------- | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DID`              | The labeler's DID              | You'll need a test account for running the labeler. Once you have one, use a tool like [clearsky](https://clearsky.app) to get the DID                |
| `LABELER_PASSWORD` | The labeler account's password | You should know this. It's recommended to use an app passowrd with DM support                                                                         |
| `SIGNING_KEY`      | The signing key for labels     | Follow the [skyware labeler](https://skyware.js.org/guides/labeler/introduction/getting-started/) setup to create a signing key for your test account |
| `PORT`             | (optional) The port to use     | Provide yourself, defaults to 4001                                                                                                                    |
| `DB_PATH`          | The SQLite DB path             | A persistent disk path, usually from your provider                                                                                                    |
