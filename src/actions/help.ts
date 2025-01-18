import dedent from "dedent";
import { Action } from "./action.js";
import { messageWelcome } from "./hi.js";

export const help: Action = {
  match: /^\/help$/,
  cmd: "/help",
  description: "Displays this message",
  async handler(message, conversation, options) {
    const actions = options?.getActions?.() ?? [];

    const list = actions
      .filter((action) => action.admin !== true)
      .map((action) => `${action.cmd} - ${action.description}`)
      .join("\n\n");

    conversation.sendMessage({
      text: dedent`
        Supported commands:
        ${list}
      `
    });
  },
};
