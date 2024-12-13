import dedent from "dedent";
import { Action } from "./action.js";

export const messageWelcome = "Welcome to the bias.is labeler!";

export const messageHelp =
  "To get started, type /search followed by the name of your bias. For example, /search BTS. Or just skip straight to these other commands:";

export const help: Action = {
  match: /^\/help$/,
  cmd: "/help",
  description: "Displays this message",
  async handler(message, conversation, options) {
    const actions = options?.getActions?.() ?? [];

    const list = actions
      .filter((action) => action.admin !== true)
      .map((action) => `${action.cmd} - ${action.description}`)
      .join("\n");

    conversation.sendMessage({
      text: dedent`
        ${messageHelp}
        ${list}
      `,
    });
  },
};
