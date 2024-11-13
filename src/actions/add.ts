import { Action } from "./action.js";

export const add: Action = {
  match: /^\/add[\s]+/,
  cmd: "/add <url>",
  description: "Start stanning a group or idol",
  async handler(message, conversation) {
    // TODO
  }
}
