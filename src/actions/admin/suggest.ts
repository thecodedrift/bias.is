import { AdminActionHandler } from "./types.js";
import { At } from "@atcute/client/lexicons";
import { RichText } from "@skyware/bot";
import { doSuggest } from "../suggest.js";

// search to single record to identifier
// get random entry from sqllite with the label enabled (1)

// /admin suggest ateez = results limited to ateez
// /admin suggest = suggest of some bias overlap
export const suggest: AdminActionHandler = async (
  message,
  conversation,
  options
) => {
  const suggestion = await doSuggest(message.senderDid, options?.arguments);

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
};
