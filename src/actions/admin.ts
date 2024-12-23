import { Action } from "./action.js";
import { cleanArgument } from "../util/cleanArgument.js";
import { reset } from "./admin/reset.js";
import { add } from "./admin/add.js";
import { AdminActionHandler } from "./admin/types.js";
import { search } from "./admin/search.js";
import { list } from "./admin/list.js";
import { suggest } from "./admin/suggest.js";

const commandRegex = /^\/admin[\s]+/;

const subCommands: Record<string, AdminActionHandler> = {
  reset,
  add,
  search,
  list,
  suggest,
} as const;

export const admin: Action = {
  match: commandRegex,
  cmd: "/admin command",
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
