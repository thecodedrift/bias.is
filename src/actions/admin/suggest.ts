import dedent from "dedent";
import { AdminActionHandler } from "./types.js";
import { selectBias } from "../../commonSql/selectBias.js";
import { rowToLabel } from "../add.js";
import { toIdentifier } from "../../util/toIdentifier.js";
import { doList } from "../list.js";
import { db } from "../../db.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";

// search to single record to identifier
// get random entry from sqllite with the label enabled (1)

// /admin suggest ateez = results limited to ateez
// /admin suggest = suggest of some bias overlap
export const suggest: AdminActionHandler = async (
  message,
  conversation,
  options
) => {
  const identifiers: string[] = [];

  if (options?.arguments) {
    const result = await selectBias(options.arguments);
    const [label, ultLabel] = await Promise.all([
      rowToLabel(result),
      rowToLabel(result, true),
    ]);
    identifiers.push(toIdentifier(label.name), toIdentifier(ultLabel.name));
  } else {
    // use users bias/ult list
    const { bias, ult } = await doList(message.senderDid);
    identifiers.push(...bias.map((b) => b.val), ...ult.map((b) => b.val));
  }

  // order by created ASC
  const stmt = await db.prepare(`
    SELECT * FROM labels
    WHERE val IN ('${identifiers.map(ident => ident).join("', '")}')
    ORDER BY cts DESC
    LIMIT 100
  `);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();

  const fans: Record<string, Set<string>> = {};
  for (const row of rows.reverse()) {
    const label = row.val;
    const fan = row.uri;
    const negate = row.neg;

    if (!fans[fan]) {
      fans[fan] = new Set();
    }

    if (negate) {
      fans[fan].delete(label);
    } else {
      fans[fan].add(label);
    }
  }

  const debug = Object.entries(fans).map(([fan, dids]) => {
    return `${fan}: ${Array.from(dids).join(", ")}`;
  });

  await conversation.sendMessage({
    text: dedent`
      ${message.text}
      Suggestions for ${message.senderDid}:
      ${identifiers.join(", ")}
      ---
      ${debug.join("\n")}
    `,
  });
};
