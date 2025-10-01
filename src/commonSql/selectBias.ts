import dedent from "dedent";
import { getInstance } from "../db/csv.js";

export const selectBias = async (bias: string) => {
  const artists = await getInstance();

  const solo = artists.filter(
    (a) =>
      a["solo/group"] === "solo" &&
      a["full name (if solo)"].toLowerCase() === bias.toLowerCase()
  );

  const group = artists.filter(
    (a) => a.name.toLowerCase() === bias.toLowerCase()
  );

  const all = [...solo, ...group].filter((v) => v !== undefined);

  if (all.length === 0) {
    return undefined;
  }

  // also error for two results, ambiguous
  if (all.length > 1) {
    throw new Error(dedent`
      Ambiguous bias for "${bias}" found: ${all.map((row) => (row["full name (if solo)"] !== "" ? row["full name (if solo)"] : row.name)).join(", ")}

      Try searching with /search to get their exact name
    `);
  }

  return all[0];
};
