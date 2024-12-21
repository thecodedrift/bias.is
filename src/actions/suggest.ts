import dedent from "dedent";
import { Action } from "./action.js";
import { At, ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { selectBias } from "../commonSql/selectBias.js";
import { toIdentifier } from "../util/toIdentifier.js";
import { nameToUlt, rowToLabel, ultToName } from "./add.js";
import { doList } from "./list.js";
import { db } from "../db.js";
import { getLabelerLabelDefinitions } from "@skyware/labeler/scripts";
import { DID, LABELER_PASSWORD } from "../constants.js";
import { DidDocument } from "@atcute/client/utils/did";
import { RichText } from "@skyware/bot";

export const doSuggest = async (userDid: At.DID, suggestGroup?: string) => {
  const identifiers: string[] = [];

  if (suggestGroup && suggestGroup.length > 0) {
    const result = await selectBias(suggestGroup);
    identifiers.push(
      toIdentifier(rowToLabel(result).name),
      toIdentifier(rowToLabel(result, true).name)
    );
  } else {
    // use users bias/ult list
    // the "ult" version comes from the labeler, where we convert the en
    // name to back to an identifier, turning the emoji back into dashes
    // like "💖 ATEEZ" -> "--ATEEZ"
    const { bias, ult } = await doList(userDid);
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
      if (did !== userDid) {
        allFans.push({ label, did });
      }
    }
  }

  if (allFans.length === 0) {
    return undefined;
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
    return undefined;
  }

  const groupName = ultToName(group.locales?.[0]?.name ?? "a shared group");

  // fetch did info from plc directory
  const plcResult = await fetch(`https://plc.directory/${random.did}`);
  const plcData = await plcResult.json() as DidDocument;
  const handleUrl = plcData.alsoKnownAs?.find(aka => aka.startsWith("at://")) ?? "";
  const handle = handleUrl.replace(/^at:\/\//, "");

  return {
    groupName,
    user: {
      did: random.did,
      handle,
    },
  };
}

export const suggest: Action = {
  match: /^\/suggest/,
  cmd: "/suggest",
  description: "Suggest someone to follow who shares a bias with you",
  async handler(message, conversation, options) {
    const suggestGroup = message.text.replace(suggest.match, "").trim();
    const suggestion = await doSuggest(message.senderDid, suggestGroup);

    if (!suggestion) {
      await conversation.sendMessage({
        text: "No suggestions available right now"
      });
      return;
    }
  
    const outgoing = new RichText();
    outgoing.addText("Hey! Have you met ");
    outgoing.addMention(`@${suggestion.user.handle}`, suggestion.user.did as At.DID);
    outgoing.addText("? They're also a fan of ");
    outgoing.addText(suggestion.groupName);
    outgoing.addText("!");
  
    await conversation.sendMessage({
      text: outgoing
    })
  },
};
