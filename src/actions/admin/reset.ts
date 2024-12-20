import dedent from "dedent";
import { doReset } from "../reset.js";
import { AdminActionHandler } from "./types.js";

export const reset:AdminActionHandler = async (message, conversation, options) => {
  const negated = await doReset(message.senderDid);

  await conversation.sendMessage({
    text: dedent`
      ${message.text}
      Removed ${negated.length} labels from ${message.senderDid}
    `,
  })
};
