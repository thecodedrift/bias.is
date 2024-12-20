import dedent from "dedent";
import { AdminActionHandler } from "./types.js";
import { selectBias } from "../../commonSql/selectBias.js";
import { rowToLabel } from "../add.js";
import { toIdentifier } from "../../util/toIdentifier.js";
import { doList } from "../list.js";

// search to single record to identifier
// get random entry from sqllite with the label enabled (1)

// /suggest ateez = results limited to ateez
// /suggest = suggest of some bias overlap
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

  await conversation.sendMessage({
    text: dedent`
      ${message.text}
      Suggestions for ${message.senderDid}:
      ${identifiers.join(", ")}
    `,
  });
};
