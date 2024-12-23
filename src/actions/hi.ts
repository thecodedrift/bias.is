import dedent from "dedent";
import { Action } from "./action.js";

export const messageWelcome = dedent`
To get started, type /search followed by the name of your bias.
For example, /search BTS

To add a bias once you have their name, type /add followed by the bias name.
For example, /add LOONA

You can also add an ult in the same way: /ult ATEEZ

Typing /help will show you all the commands.
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
