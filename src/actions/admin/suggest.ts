import dedent from "dedent";
import { AdminActionHandler } from "./types.js";
import { selectBias } from "../../commonSql/selectBias.js";
import { nameToUlt, rowToLabel, ultToName } from "../add.js";
import { toIdentifier } from "../../util/toIdentifier.js";
import { doList } from "../list.js";
import { db } from "../../db.js";
import { At, ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { RichText } from "@skyware/bot";
import { getLabelerLabelDefinitions } from "@skyware/labeler/scripts";
import { DID, LABELER_PASSWORD } from "../../constants.js";
import { DidDocument } from "@atcute/client/utils/did";

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
    for (const b of bias) {
      if (b.commonName) {
        identifiers.push(toIdentifier(b.commonName));
        identifiers.push(toIdentifier(nameToUlt(b.commonName)));
      }
    }

    for (const u of ult) {
      if (u.commonName) {
        identifiers.push(toIdentifier(u.commonName));
        identifiers.push(toIdentifier(ultToName(u.commonName)));
      }
    }
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

  // combine all the fans into a single list with label info
  const allFans: Array<{label: string, did: string}> = [];
  for (const [label, dids] of Object.entries(fans)) {
    for (const did of Array.from(dids)) {
      if (did !== message.senderDid) {
        allFans.push({ label, did });
      }
    }
  }

  if (allFans.length === 0) {
    await conversation.sendMessage({
      text: "No suggestions found. You're the first to like these groups!",
    });
    return;
  }

  // select a possible person at random from allFans
  const random = allFans[Math.floor(Math.random() * allFans.length)]!;

  const currentLabels =
    (await getLabelerLabelDefinitions({
      identifier: DID,
      password: LABELER_PASSWORD,
    })) || [];

  const group = currentLabels.find((label) => label.identifier === random.label);

  if (!group) {
    console.error("Missing group from labeler", random.label);
    await conversation.sendMessage({
      text: "We found a suggestion, but for some reason, the group is missing from the labeler. Please try again.",
    });
    return;
  }

  const groupName = ultToName(group.locales?.[0]?.name ?? "a shared group");

  // fetch did info from plc directory
  const plcResult = await fetch(`https://plc.directory/${random.did}`);
  const plcData = await plcResult.json() as DidDocument;
  const handleUrl = plcData.alsoKnownAs?.find(aka => aka.startsWith("at://")) ?? "";
  const handle = handleUrl.replace(/^at:\/\//, "");

  const outgoing = new RichText();
  outgoing.addText("Hey! Have you met ");
  outgoing.addMention(`@${handle}`, random.did as At.DID);
  outgoing.addText("? They're also a fan of ");
  outgoing.addText(groupName);
  outgoing.addText("!");

  await conversation.sendMessage({
    text: outgoing
  })
};
