import { Action } from "./action.js";

export const stan: Action = {
  match: /^\/stan[\s]+/,
  cmd: "/stan <url>",
  description: "Start stanning a group or idol",
  async handler(message, conversation) {
    // TODO
  }
}
