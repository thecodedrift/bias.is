import { Action, ActionHandler } from "./action.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { db } from "../db.js";
import { server } from "../labeler.js";
import dedent from "dedent";

type AdminActionHandler = ActionHandler<{
  arguments: string;
}>

const commandRegex = /^\/admin[\s]+/;

const subCommands:Record<string, AdminActionHandler> = {
  reset: async (message, conversation, options) => {
    // TODO to reset someone else's, use a nonce

    const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, message.senderDid);
    const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();
    const toNegate = new Set<string>();
    for (const row of rows) {
      if (!row.neg) {
        toNegate.add(row.val);
      }
      else {
        toNegate.delete(row.val);
      }
    }

    // change labels on server
    server.createLabels({ uri: message.senderDid }, { negate: [...toNegate] });
    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Removed ${toNegate.size} labels from ${message.senderDid}
      `
    })
  },

  list: async (message, conversation) => {
    const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, message.senderDid);
    const rows = await stmt.all();
    console.log(rows);

    await conversation.sendMessage({
      text: "DONE (sent to logs)"
    })
  }
} as const;

export const admin: Action = {
  match: commandRegex,
  cmd: "/admin <command>",
  description: "Do admin commands (must have admin DID)",
  admin: true,
  async handler(message, conversation, options) {
    const [subCommand, args] = message.text.replace(commandRegex, "").split(" ", 2);

    if (!subCommand) {
      await conversation.sendMessage({
        text: "Invalid admin command"
      });
      return;
    }

    console.warn(`ADMIN COMMAND: ${subCommand} (${args})`);

    if (!subCommands[subCommand]) {
      await conversation.sendMessage({
        text: "Invalid admin command"
      });
      return;
    }

    await subCommands[subCommand](message, conversation, {
      ...options,
      arguments: args ?? ""
    });
  }
}


