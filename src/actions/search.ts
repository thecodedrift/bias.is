import dedent from "dedent";
import { Action } from "./action.js";
import { getInstance } from "../db/csv.js";

type SearchOptions = {
  exact?: boolean;
  raw?: boolean;
  limit?: number;
};

/**
 * Search kpop db for a bias
 */
export const doSearch = async (search: string, options: SearchOptions) => {
  const { exact = false, limit = 5 } = options;

  const artists = await getInstance();

  const exactSolo = artists.find(
    (artist) =>
      artist["solo/group"] === "solo" &&
      artist["full name (if solo)"].toLowerCase() === search.toLowerCase()
  );

  const exactGroup = artists.find(
    (artist) => artist.name.toLowerCase() === search.toLowerCase()
  );

  // approximate matches are the first n matches on name, hangul, fanclub, and solo full name
  // do a contains check for lightweight fuzzy matching
  const looseMatches = artists
    .filter((artist) => {
      const lowerSearch = search.toLowerCase();
      return (
        artist.name.toLowerCase().includes(lowerSearch) ||
        artist.hangul === search ||
        artist["full name (if solo)"].toLowerCase().includes(lowerSearch) ||
        artist["fanclub name"].toLowerCase().includes(lowerSearch)
      );
    })
    .slice(0, limit);

  const rows = (
    exact ? [exactSolo ?? exactGroup] : [exactSolo, exactGroup, ...looseMatches]
  )
    .filter((v) => v !== undefined)
    .slice(0, limit);

  if (options.raw) {
    return [...new Set(rows)];
  }

  const results = rows.map((row) => {
    const useName =
      row["full name (if solo)"] !== "" ? row["full name (if solo)"] : row.name;
    const fanclub = row["fanclub name"]
      ? `(fandom: ${row["fanclub name"]})`
      : "";
    return `${useName} ${fanclub}`.trim();
  });

  return [...new Set(results)];
};

export const search: Action = {
  match: /^\/search[\s]/,
  cmd: "/search",
  description: "Look for a bias",
  async handler(message, conversation) {
    const searchValue = message.text.replace(search.match, "").trim();
    const rows = await doSearch(searchValue, {
      limit: 6,
    });

    if (rows.length === 0) {
      await conversation.sendMessage({
        text: `No results for ${searchValue}`,
      });
      return;
    }

    let andMore = false;
    if (rows.length > 5) {
      rows.pop();
      andMore = true;
    }

    console.log(`SEARCH: ${message.senderDid} query ${searchValue}`);

    await conversation.sendMessage({
      text: dedent`
        Search results for: ${searchValue}
        idol (fanclub)

        ${rows.join("\n")}
        ${andMore ? "And more...\n" : ""}
        Add a bias by typing:
        /add name
      `,
    });
  },
};
