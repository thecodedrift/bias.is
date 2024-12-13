import dedent from "dedent";
import { clearUserLabels } from "../labeler.js";
import { Action } from "./action.js";

export const doReset = async (did: string) => {
  const negated = await clearUserLabels(did);
  return negated;
};

export const reset: Action = {
  match: /^\/reset$/,
  cmd: "/reset",
  description: "Resets your bias and ult labels",
  async handler(message, conversation) {
    const negated = await doReset(message.senderDid);

    const response =
      negated.size === 0
        ? "I didn't need to remove any labels"
        : negated.size === 1
          ? "I removed your label for you"
          : `I removed ${negated.size} labels for you`;

    console.log(`LABEL RESET: ${message.senderDid} removed ${negated.size}`);
    await conversation.sendMessage({
      text: response
    });
  },
};
