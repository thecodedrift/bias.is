import { Action } from "./action.js";

export const list: Action = {
  match: /^\/list/,
  cmd: "/list",
  description: "List your current bias and utls",
  async handler(message, conversation) {
    // TODO

  }
}
