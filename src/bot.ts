import {
  Bot,
  ChatMessage,
  Conversation,
  DeletedChatMessage,
  IncomingChatPreference,
  Labeler,
} from "@skyware/bot";
import dedent from "dedent";
import { to } from "await-to-js";
import {
  addUserLabel,
  clearUserLabels,
  getStoredSession,
  setStoredSession,
} from "./labeler.js";
import { ADMINS, DID, HANDLE, LABELER_PASSWORD } from "./constants.js";
import { en } from "./lang.js";
import { kprofiles } from "./sources/kprofiles.com.js";
import { help } from "./actions/help.js";
import { reset } from "./actions/reset.js";
import { add } from "./actions/add.js";
import { ult } from "./actions/ult.js";
import { admin } from "./actions/admin.js";
import { list } from "./actions/list.js";

const sources = [kprofiles];

const actions = [help, add, ult, list, reset, admin];

const defaultAction = help;

const bot = new Bot({
  emitChatEvents: true,
});

let session = getStoredSession();

if (session) {
  try {
    await bot.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      active: true,
      did: DID,
      handle: HANDLE,
    });
    console.log("Resumed session");
  } catch (err) {
    console.error(err);
    session = null;
  }
}

if (!session) {
  const session = await bot.login({
    identifier: DID!,
    password: LABELER_PASSWORD,
  });

  setStoredSession(session);
  console.log("Logged in");
}

await bot.setChatPreference(IncomingChatPreference.All);

bot.on("like", async ({ subject, user }) => {
  // We only care if the user liked the labeler
  if (subject instanceof Labeler !== true) {
    return;
  }

  const [err, conversation] = await to(
    bot.getConversationForMembers([user.did])
  );

  if (err) {
    console.error(err);
    return;
  }

  await conversation.sendMessage({
    text: en.welcome,
  });
});

// async function addRepoLabelForUser(
//   message: ChatMessage,
//   conversation: Conversation
// ) {

//   const didAdd = await addUserLabel(message.senderDid, {
//     name: input,
//     description: dedent`
//         ${targetRepo?.data.description || ""}
//         ${targetRepo.data.html_url}
//       `,
//   });

// }

bot.on("message", async (message: ChatMessage) => {
  console.log(`Received message: ${message.text}`);
  const isAdmin = ADMINS.includes(message.senderDid);

  const validActions = actions.filter((action) => {
    return !action.admin || isAdmin;
  });

  const [err, conversation] = await to(
    bot.getConversationForMembers([message.senderDid])
  );

  if (err) {
    console.error(err);
    return;
  }

  let handler = defaultAction.handler;
  for (const action of validActions) {
    if (message.text.match(action.match)) {
      handler = action.handler;
      break;
    }
  }

  try {
    await handler(message, conversation, {
      getActions: () => validActions,
    });
  } catch (err) {
    console.error(err);
    await conversation.sendMessage({
      text: "Encountered an error. Give us a moment to recover.",
    });
  }
});
