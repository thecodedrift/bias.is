import { Action, ActionHandler } from "./action.js";
import dedent from "dedent";
import { doList } from "./list.js";
import { cleanArgument } from "../util/cleanArgument.js";
import { doSearch } from "./search.js";
import { doReset } from "./reset.js";
import { doAdd } from "./add.js";

type AdminActionHandler = ActionHandler<{
  arguments: string;
}>;

const commandRegex = /^\/admin[\s]+/;

const subCommands: Record<string, AdminActionHandler> = {
  reset: async (message, conversation, options) => {
    const negated = await doReset(message.senderDid);

    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Removed ${negated.length} labels from ${message.senderDid}
      `,
    });
  },

  add: async (message, conversation, options) => {
    if (!options?.arguments) {
      await conversation.sendMessage({
        text: "Invalid add command",
      });
      return;
    }

    const results = await doAdd(message.senderDid, options.arguments)

    await conversation.sendMessage({
      text: dedent`
          ${message.text}
          Added ${results.name} as bias for ${message.senderDid}
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

    const rows = await doSearch(options.arguments, {
      limit: 10
    });

    if (rows.length === 0) {
      await conversation.sendMessage({
        text: `No results for ${options.arguments}`,
      });
      return;
    }

    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Search results for ${options.arguments}:
        ${rows.join("\n")}
      `,
    });
  },

  list: async (message, conversation) => {
    const { bias, ult } = await doList(message.senderDid);
    await conversation.sendMessage({
      text: dedent`
        ${message.text}
        Labels assigned to ${message.senderDid}:
        Bias: ${bias.map(b => {
          const en = b.details?.locales.find(l => l.lang === "en");
          return en?.name || b.val;
        }).join(", ")}
        Ult: ${ult.map(b => {
          const en = b.details?.locales.find(l => l.lang === "en");
          return en?.name || b.val;
        }).join(", ")}
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
    const [subCommand, ...splitArgs] = message.text
      .replace(commandRegex, "")
      .split(" ");

    const args = cleanArgument(splitArgs.join(" "));

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
