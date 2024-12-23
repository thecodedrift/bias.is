import {
  Bot,
  ChatMessage,
  IncomingChatPreference,
  Labeler,
} from "@skyware/bot";
import { to } from "await-to-js";
import {
  getStoredSession,
  setStoredSession,
} from "./labeler.js";
import { ADMINS, DID, HANDLE, LABELER_PASSWORD } from "./constants.js";
import { help } from "./actions/help.js";
import { reset } from "./actions/reset.js";
import { add } from "./actions/add.js";
import { ult } from "./actions/ult.js";
import { admin } from "./actions/admin.js";
import { list } from "./actions/list.js";
import { search } from "./actions/search.js";
import { suggest } from "./actions/suggest.js";
import { hi, messageWelcome } from "./actions/hi.js";

const actions = [hi, help, add, ult, list, search, suggest, reset, admin];

const defaultAction = help;

const bot = new Bot({
  emitChatEvents: true,
});

const onBotError = (error: unknown) => {
  console.error(error);
};

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

// simple error to logs for now, removes unhandled errors
bot.on("error", onBotError);

bot.on("like", async ({ subject, user }) => {
  try {
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
      text: messageWelcome
    });
  } catch (error) {
    onBotError(error);
  }
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
  try {
    console.log(`Received message: ${message.text}`);
    const isAdmin = ADMINS.includes(message.senderDid);

    const validActions = actions.filter((action) => {
      return !action.admin || isAdmin;
    });

    const [err, conversation] = await to(
      bot.getConversationForMembers([message.senderDid])
    );

    if (err) {
      onBotError(err);
      return;
    }

    let handler = defaultAction.handler;
    for (const action of validActions) {
      if (message.text.match(action.match)) {
        handler = action.handler;
        break;
      }
    }

    // nested in order to split bot errors from action errors
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
  } catch (error) {
    onBotError(error);
  }
});
