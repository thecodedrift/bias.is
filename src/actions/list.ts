import { At } from "@atcute/client/lexicons";
import { Action } from "./action.js";
import { getLabelerLabelDefinitions } from "@skyware/labeler/scripts";
import { DID, LABELER_PASSWORD } from "../constants.js";
import dedent from "dedent";
import { getUserLabels } from "../labeler.js";

/**
 * Get the list of biases and ults for a user
 */
export const doList = async (did: At.DID) => {
  // get the active labels list
  const active = await getUserLabels(did);

  const currentLabels =
    (await getLabelerLabelDefinitions({
      identifier: DID,
      password: LABELER_PASSWORD,
    })) || [];

  // get all utls. The label begins with "💖"
  const ults = currentLabels.filter((label) =>
    label.locales?.[0]?.name.startsWith("💖")
  );

  // find the ults and biases, merge with the currentLabels data under the "details" key
  const bias = active
    .filter((label) => !ults.find((ult) => ult.identifier === label.val))
    .map((label) => {
      const details = currentLabels.find(
        (current) => current.identifier === label.val
      );
      // any locale will work, as name is the same across all
      const commonName = details?.locales?.[0]?.name;
      return { ...label, details, commonName };
    });

  const ult = active
    .filter((label) => ults.find((ult) => ult.identifier === label.val))
    .map((label) => {
      const details = currentLabels.find(
        (current) => current.identifier === label.val
      );
      // any locale will work, as name is the same across all
      const commonName = details?.locales?.[0]?.name;
      return { ...label, details, commonName };
    });

  return { bias, ult };
};

export const list: Action = {
  match: /^\/list$/,
  cmd: "/list",
  description: "List your current bias and ults",
  async handler(message, conversation) {
    const { bias, ult } = await doList(message.senderDid);

    const biasString =
      bias.length > 0
        ? `Your biases: ${bias
            .map((b) => {
              const en = b.details?.locales.find((l) => l.lang === "en");
              return en?.name || b.val;
            })
            .join(", ")}`
        : "";

    const ultString =
      ult.length > 0
        ? `Your ult: ${ult
            .map((b) => {
              const en = b.details?.locales.find((l) => l.lang === "en");
              return en?.name || b.val;
            })
            .join(", ")}`
        : "";

    if (bias.length === 0 && ult.length === 0) {
      await conversation.sendMessage({
        text: "You have no biases or ults... yet!",
      });
      return;
    }

    await conversation.sendMessage({
      text: dedent`
        Here's what I have for you:
        ${biasString}
        ${ultString}
      `.trim(),
    });
  },
};
