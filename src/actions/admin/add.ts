import dedent from "dedent";
import { doAdd } from "../add.js";
import { AdminActionHandler } from "./types.js";

export const add: AdminActionHandler = async (
  message,
  conversation,
  options
) => {
  if (!options?.arguments) {
    await conversation.sendMessage({
      text: "Invalid add command",
    });
    return;
  }

  const results = await doAdd(message.senderDid, options.arguments);

  await conversation.sendMessage({
    text: dedent`
        ${message.text}
        Added ${results.name} as bias for ${message.senderDid}
      `,
  });
};
