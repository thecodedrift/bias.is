import dedent from "dedent";
import { kpopdb } from "../db.js";
import { KpopDbRow } from "../db/kpopdb.types.js";

export const selectBias = async (bias: string) => {
  const search = bias.replace(/^"/, "").replace(/"$/, "");
  const stmt = await kpopdb.prepare(
    `select * from app_kpop_group where NAME like ? AND is_collab = "n" limit 2;`,
    search
  );
  const rows = await stmt.all<KpopDbRow[]>();

  if (rows.length === 0) {
    return undefined;
  }

  // also error for two results, ambiguous
  if (rows.length > 1) {
    throw new Error(dedent`
      Ambiguous bias for "${bias}" found: ${rows.map((row) => row.name).join(", ")}

      Try searching with /search to get their exact name
    `);
  }

  return rows[0];
};
