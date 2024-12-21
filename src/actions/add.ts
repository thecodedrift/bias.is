import { Action } from "./action.js";
import { kpopdb } from "../db.js";
import { addUserLabel } from "../labeler.js";
import { At } from "@atcute/client/lexicons";
import dedent from "dedent";

export type Label = {
  name: string;
  description: string;
};

type AddOptions = {
  ult?: boolean;
};

/**
 * convert a kpop db row to a label
 */
export const rowToLabel = (row: any, ult?: boolean): Label => {
  const biasName = ult ? `💖 ${row.name}` : row.name as string;
  const ultLine = ult ? "...in fact, it's their 💖 ult~" : "";
  const biasDescription = dedent`
    ${row.fanclub ? `${row.fanclub}\n` : ""}User is a fan of ${row.name}
    ${ultLine}
  `;

  return {
    name: biasName,
    description: biasDescription,
  };
}

/**
 * add labels to a given DID
 */
export const doAdd = async (
  did: At.DID,
  bias: string,
  options?: AddOptions
) => {
  const search = bias.replace(/^"/, "").replace(/"$/, "");
  const stmt = await kpopdb.prepare(
    `select * from app_kpop_group where NAME like ? AND is_collab = "n" limit 2;`,
    search
  );
  const rows = await stmt.all();

  if (rows.length === 0) {
    throw new Error(`No group or soloist found for "${bias}"`);
  }

  // also error for two results, ambiguous
  if (rows.length > 1) {
    throw new Error(dedent`
        Ambiguous bias for "${bias}" found: ${rows.map((row) => row.name).join(", ")}

        Try searching with /search to get their exact name
      `);
  }

  const row = rows[0];

  const labelData = rowToLabel(row, options?.ult);
  const label = await addUserLabel(did, labelData);

  return label;
};

export const add: Action = {
  match: /^\/add[\s]+/,
  cmd: "/add <bias>",
  description: "Add a group or soloist as a bias",
  async handler(message, conversation) {
    const bias = message.text.replace(add.match, "").trim();
    const result = await doAdd(message.senderDid, bias);

    console.log(`LABEL ADD: ${message.senderDid} added ${result.name}`);
    await conversation.sendMessage({
      text: `❤️ Got you. ${result.name} is now your bias~`,
    });
  },
};
