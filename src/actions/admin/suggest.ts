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
    identifiers.push(
      toIdentifier(rowToLabel(result).name),
      toIdentifier(rowToLabel(result, true).name)
    );
  } else {
    // use users bias/ult list
    // the "ult" version comes from the labeler, where we convert the en
    // name to back to an identifier, turning the emoji back into dashes
    // like "💖 ATEEZ" -> "--ATEEZ"
    const { bias, ult } = await doList(message.senderDid);
    const all = [...bias, ...ult]
      .map((b) => b.details?.locales?.find((l) => l.lang === "en")?.name)
      .filter((v) => v !== undefined)
      .map((v) => toIdentifier(v));
    identifiers.push(...all);
  }

  // order by created ASC
  const stmt = await db.prepare(`
    SELECT * FROM labels
    WHERE val IN ('${identifiers.map((ident) => ident).join("', '")}')
    ORDER BY cts DESC
    LIMIT 100
  `);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();

  const fans: Record<string, Set<string>> = {};
  for (const row of rows.reverse()) {
    const label = row.val;
    const fan = row.uri;
    const negate = row.neg;

    if (!fans[label]) {
      fans[label] = new Set();
    }

    if (negate) {
      fans[label].delete(fan);
    } else {
      fans[label].add(fan);
    }
  }

  const debug = Object.entries(fans).map(([group, dids]) => {
    return `${group}: ${Array.from(dids).join(", ")}`;
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
