import dedent from "dedent";
import { kpopdb } from "../db.js";
import { Action } from "./action.js";

/**
 * Search kpop db for a bias
 */
export const doSearch = async (search: string, limit = 5) => {
  const stmt = await (search.startsWith('"')
    ? kpopdb.prepare(
        `SELECT * from app_kpop_group where name = ? AND is_collab = "n" LIMIT ${limit}`,
        search.replace(/^"/, "").replace(/"$/, "")
      )
    : kpopdb.prepare(
        `SELECT * from app_kpop_group where (name like ? or fanclub like ? or alias like ? or fname like ?) AND is_collab = "n" LIMIT ${limit}`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      ));

  const rows = await stmt.all();
  // TODO: there are no types for kpopdb. We should generate those...

  const results = rows.map((row) => {
    const fanclub = row.fanclub ? `(${row.fanclub})` : "";
    return `${row.name} ${fanclub}`.trim();
  });

  return results;
};

export const search: Action = {
  match: /^\/search/,
  cmd: "/search",
  description: "Look for a bias",
  async handler(message, conversation) {
    const searchValue = message.text.replace(/^\/search[\s]+/, "").trim();
    const rows = await doSearch(searchValue, 6);

    if (rows.length === 0) {
      await conversation.sendMessage({
        text: `No results for ${searchValue}`,
      });
      return;
    }

    if (rows.length > 5) {
      rows.pop();
      rows.push("... and more");
    }

    await conversation.sendMessage({
      text: dedent`
        Search results for: ${searchValue}
        <group> (<fanclub>)

        ${rows.join("\n")}

        Select a bias by typing:
        /add <name>
      `,
    });
  },
};
