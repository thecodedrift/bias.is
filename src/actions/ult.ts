import { Action } from "./action.js";

export const ult: Action = {
  match: /^\/ult[\s]+/,
  cmd: "/ult <url>",
  description: "Ult a group or idol (max: 1) adds a 💖 to the label",
  async handler(message, conversation) {
    // TODO
  }
}
