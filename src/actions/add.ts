import { Action } from "./action.js";
import { db } from "../db.js";
import { server } from "../labeler.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";

export type Label = {
  name: string;
  description: string;
}

/**
 * Reset the labels of a given DID
 * returns all the labels that were removed
 */
export const doAdd = async (did: string, label: Label) => {
  const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, did);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();
  const toNegate = new Set<string>();
  for (const row of rows) {
    if (!row.neg) {
      toNegate.add(row.val);
    } else {
      toNegate.delete(row.val);
    }
  }

  // change labels on server
  server.createLabels({ uri: did }, { negate: [...toNegate] });

  return toNegate;
};

export const add: Action = {
  match: /^\/add[\s]+/,
  cmd: "/add <url>",
  description: "Add a group or idol as a label",
  async handler(message, conversation) {
    // TODO
    await conversation.sendMessage({
      text: "I know you're eager, but we're still building!"
    })
  }
}
