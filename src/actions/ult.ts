import { MAX_ULTS } from "../constants.js";
import { TooManyUlts } from "../errors/overlabeled.js";
import { Action } from "./action.js";
import { doAdd } from "./add.js";
import { doList } from "./list.js";

export const ult: Action = {
  match: /^\/ult[\s]+/,
  cmd: "/ult bias",
  description: 'Add a group or soloist as your "ultimate" bias (max 1)',
  async handler(message, conversation) {
    const bias = message.text.replace(ult.match, "").trim();
    const { ult: ultList } = await doList(message.senderDid);

    if (ultList.length >= MAX_ULTS) {
      throw new TooManyUlts()
    }

    const result = await doAdd(message.senderDid, bias, {
      ult: true,
    });

    console.log(`LABEL ULT: ${message.senderDid} ult ${result.name}`);
    await conversation.sendMessage({
      text: `💖 Got you. ${result.name} is now marked as your favorite group~`,
    });
  },
};
