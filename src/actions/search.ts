import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { db, kpopdb } from "../db.js";
import { Action } from "./action.js";

/**
 * Search kpop db for a bias
 */
export const doSearch = async (did: string, search: string) => {
  const stmt = await (search.startsWith('"')
      ? kpopdb.prepare(
          `SELECT * from app_kpop_group where name = ? AND is_collab = "n"`,
          search.replace(/^"/, "").replace(/"$/, "")
        )
      : kpopdb.prepare(
          `SELECT * from app_kpop_group where (name like ? or fanclub like ? or alias like ? or fname like ?) AND is_collab = "n"`,
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
}

export const search: Action = {
  match: /^\/search/,
  cmd: "/list",
  description: "List your current bias and utls",
  async handler(message, conversation) {
    // TODO
    await conversation.sendMessage({
      text: "I know you're eager, but we're still building!"
    })
  }
}
