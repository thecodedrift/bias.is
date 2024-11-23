import { Action, ActionHandler } from "./action.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { db, kpopdb } from "../db.js";
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

  search: async (message, conversation, options) => {
    // /admin search yoongi (select name, fanclub, alias from app_kpop_group where name like "%yoongi%" or alias like "%yoongi%" or fname like "%yoongi%")
    // /admin search "ive" (name)
    // /admin search 5dolls (alias)
    if (!options?.arguments) {
      await conversation.sendMessage({
        text: "Invalid search command",
      });
      return;
    }

    const stmt = await (options.arguments.startsWith('"')
      ? kpopdb.prepare(
          `SELECT * from app_kpop_group where name = ?`,
          options.arguments.replace(/^"/, "").replace(/"$/, "")
        )
      : kpopdb.prepare(
          `SELECT * from app_kpop_group where name like ? or alias like ? or fname like ?`,
          `%${options.arguments}%`
        ));

    const rows = await stmt.all();
    // TODO: there are no types for kpopdb. We should generate those...

    if (rows.length === 0) {
      await conversation.sendMessage({
        text: `No results for ${options.arguments}`,
      });
      return;
    }

    const results = rows.map((row) => {
      return `${row.name} (${row.fanclub})`;
    });

    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Search results for ${options.arguments}:
        ${results.join("\n")}
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
