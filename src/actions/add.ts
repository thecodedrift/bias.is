import { Action } from "./action.js";
import { addUserLabel, type Label } from "../labeler.js";
import { At } from "@atcute/client/lexicons";
import dedent from "dedent";
import { BiasNotFoundError } from "../errors/notfound.js";
import { MAX_LABELS } from "../constants.js";
import { getInstance } from "../db/csv.js";

type AddOptions = {
  ult?: boolean;
};

export const ultToName = (name: string) => {
  return name.replace(/^💖\s/, "");
};

export const nameToUlt = (name: string) => {
  return `💖 ${name}`;
};

/**
 * convert a kpop db row to a label
 */
export const rowToLabel = (row: any, ult?: boolean): Label => {
  const biasName = ult ? nameToUlt(row.name) : (row.name as string);
  const ultLine = ult ? "...in fact, it's their 💖 ult~" : "";
  const biasDescription = dedent`
    ${row.fanclub ? `${row.fanclub}\n` : ""}User is a fan of ${row.name}
    ${ultLine}
  `;

  return {
    name: biasName,
    description: biasDescription,
  };
};

/**
 * add labels to a given DID
 */
export const doAdd = async (
  did: At.DID,
  bias: string,
  options?: AddOptions
) => {
  const search = bias
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\(fandom:[\s]+.+?\)/, "")
    .trim();

  const artists = await getInstance();

  // search order:
  // 1. full name (if solo) - case insensitive
  // 2. name - case insensitive
  // 3. hangul - exact

  const fullNameMatch = artists.find(
    (a) => a["full name (if solo)"].toLowerCase() === search.toLowerCase()
  );

  const nameMatch = artists.find(
    (a) => a.name.toLowerCase() === search.toLowerCase()
  );

  const hangulMatch = artists.find((a) => a.hangul === search);

  const artist = fullNameMatch ?? nameMatch ?? hangulMatch;

  if (!artist) {
    throw new BiasNotFoundError(bias);
  }

  const originalName = artist.name;
  artist.name =
    artist["full name (if solo)"] !== ""
      ? artist["full name (if solo)"]
      : artist.name;

  const labelData = rowToLabel(artist, options?.ult);
  const label = await addUserLabel(did, labelData);

  return label;
};

export const add: Action = {
  match: /^\/add[\s]+/,
  cmd: "/add",
  description: `Add a group or soloist as a bias (max: ${MAX_LABELS})`,
  async handler(message, conversation) {
    const bias = message.text.replace(add.match, "").trim();
    const result = await doAdd(message.senderDid, bias);

    console.log(`LABEL ADD: ${message.senderDid} added ${result.name}`);
    await conversation.sendMessage({
      text: `❤️ Got you. ${result.name} is now your bias (if this is wrong, you might need to /search and get their full name)~`,
    });

    // if (result.ambiguous) {
    //   await conversation.sendMessage({
    //     text: `Just a heads up, more than one artist goes by the name "${bias}".`,
    //   });
    // }
  },
};
