import dedent from "dedent";
import { doSearch } from "../search.js";
import { AdminActionHandler } from "./types.js";

export const search:AdminActionHandler = async (message, conversation, options) => {
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
}