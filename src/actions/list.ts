import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { db } from "../db.js";
import { Action } from "./action.js";

/**
 * Get the list of biases and ults for a user
 */
export const doList = async (did: string) => {
  const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, did);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();
  const active = rows.filter(row => !row.neg).map(row => row.val);
  const bias = active.filter(val => !val.startsWith("ult/"));
  const ult = active.filter(val => val.startsWith("ult/"));
  return { bias, ult };
}

export const list: Action = {
  match: /^\/list/,
  cmd: "/list",
  description: "List your current bias and utls",
  async handler(message, conversation) {
    // TODO
    await conversation.sendMessage({
      text: "I know you're eager, but we're still building!"
    })
  }
}
