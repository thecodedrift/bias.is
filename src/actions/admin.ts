import { Action, ActionHandler } from "./action.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { db } from "../db.js";
import { server } from "../labeler.js";
import dedent from "dedent";
import { doReset } from "./reset.js";
import { doList } from "./list.js";

type AdminActionHandler = ActionHandler<{
  arguments: string;
}>;

const commandRegex = /^\/admin[\s]+/;

const subCommands: Record<string, AdminActionHandler> = {
  reset: async (message, conversation, options) => {
    // TODO to reset someone else's, use a nonce

    const negated = await doReset(message.senderDid);
    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Removed ${negated.size} labels from ${message.senderDid}
      `,
    });
  },

  list: async (message, conversation) => {
    const { bias, ult } = await doList(message.senderDid);
    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Labels assigned to ${message.senderDid}:
        Bias: ${bias.join(", ")}
        Ult: ${ult.join(", ")}
      `,
    });
  },
} as const;

export const admin: Action = {
  match: commandRegex,
  cmd: "/admin <command>",
  description: "Do admin commands (must have admin DID)",
  admin: true,
  async handler(message, conversation, options) {
    const [subCommand, args] = message.text
      .replace(commandRegex, "")
      .split(" ", 2);

    if (!subCommand) {
      await conversation.sendMessage({
        text: "Invalid admin command",
      });
      return;
    }

    console.warn(`ADMIN COMMAND: ${subCommand} (${args})`);

    if (!subCommands[subCommand]) {
      await conversation.sendMessage({
        text: "Invalid admin command",
      });
      return;
    }

    await subCommands[subCommand](message, conversation, {
      ...options,
      arguments: args ?? "",
    });
  },
};
