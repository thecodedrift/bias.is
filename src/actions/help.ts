import { en } from "../lang.js";
import { Action } from "./action.js";
import { sprintf } from "sprintf-js"

export const help: Action = {
  match: /^\/help$/,
  cmd: "/help",
  description: "Displays this message",
  async handler(message, conversation, options) {
    const actions = options?.getActions?.() ?? [];

    const list = actions.map((action) => `${action.cmd} - ${action.description}`).join("\n")

    conversation.sendMessage({
      text: sprintf(en.help, {
        commands: list
      })
    })
  }
}
