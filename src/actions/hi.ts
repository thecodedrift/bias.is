import dedent from "dedent";
import { Action } from "./action.js";

export const messageWelcome = dedent`
To add a bias, type /add followed by the name of your bias.
For example, /add LOONA

If you're not sure their name you can type /search, followed by your group or their fandom name.
For example, /search BTS

Finally, if they're your ult, you can use /ult instead of /all to mark them as your ultimate bias.
For example, /ult ATEEZ

There's more you can do too. /help will show you all the commands.
`;

export const hi: Action = {
  match: /^\/hi$/,
  cmd: "/hi",
  description: "Replay the welcome message",
  async handler(message, conversation, options) {
    conversation.sendMessage({
      text: messageWelcome
    });
  },
};
