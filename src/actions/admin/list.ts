import dedent from "dedent";
import { doList } from "../list.js";
import { AdminActionHandler } from "./types.js";


export const list:AdminActionHandler = async (message, conversation) => {
  const { bias, ult } = await doList(message.senderDid);
  await conversation.sendMessage({
    text: dedent`
      ${message.text}
      Labels assigned to ${message.senderDid}:
      Bias: ${bias.map(b => {
        const en = b.details?.locales.find(l => l.lang === "en");
        return en?.name || b.val;
      }).join(", ")}
      Ult: ${ult.map(b => {
        const en = b.details?.locales.find(l => l.lang === "en");
        return en?.name || b.val;
      }).join(", ")}
    `,
  });
}
