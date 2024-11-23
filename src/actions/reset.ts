import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { Action } from "./action.js";
import { db } from "../db.js";
import { server } from "../labeler.js";

/**
 * Reset the labels of a given DID
 * returns all the labels that were removed
 */
export const doReset = async (did: string) => {
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

export const reset: Action = {
  match: /^\/reset$/,
  cmd: "/reset",
  description: "Resets your stan and ult labels",
  async handler(message, conversation) {
    // TODO
    await conversation.sendMessage({
      text: "I know you're eager, but we're still building!"
    })
  },
};
