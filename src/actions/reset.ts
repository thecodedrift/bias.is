import { Action } from "./action.js";

export const reset: Action = {
  match: /^\/reset$/,
  cmd: "/reset",
  description: "Resets your stan and ult labels",
  async handler(message, conversation) {
    // TODO
    await conversation.sendMessage({
      text: "I know you're eager, but we're still building!"
    })
  },
};
