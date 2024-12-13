import dedent from "dedent";
import { kpopdb } from "../db.js";
import { Action } from "./action.js";

type SearchOptions = {
  exact?: boolean
  limit?: number
}

/**
 * Search kpop db for a bias
 */
export const doSearch = async (search: string, options:SearchOptions) => {
  const { exact = false, limit = 5 } = options;

  const exactSearch = await kpopdb.prepare(
    `SELECT * from app_kpop_group where name = ? AND is_collab = "n" LIMIT ${limit}`,
    search.replace(/^"/, "").replace(/"$/, "")
  );

  const looseSearch = await kpopdb.prepare(
    `SELECT * from app_kpop_group where (name like ? or fanclub like ? or alias like ? or fname like ?) AND is_collab = "n" LIMIT ${limit}`,
    `%${search}%`,
    `%${search}%`,
    `%${search}%`,
    `%${search}%`
  );

  const stmt = (exact || search.startsWith('"')) ? exactSearch : looseSearch;

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
    const rows = await doSearch(searchValue, {
      limit: 6
    });

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

    console.log(`SEARCH: ${message.senderDid} query ${searchValue}`);

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
