import { Action } from "./action.js";

export const add: Action = {
  match: /^\/add[\s]+/,
  cmd: "/add <url>",
  description: "Add a group or idol as a label",
  async handler(message, conversation) {
    // TODO
  }
}
