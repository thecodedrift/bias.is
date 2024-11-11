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
import { octokit } from "./octokit.js";
import {
  addUserLabel,
  clearUserLabels,
  getStoredSession,
  setStoredSession,
} from "./label-server.js";
import { DID, HANDLE } from "./constants.js";

const SUCCESS_MESSAGE = "Success! We've verified your GitHub account.";

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
    identifier: process.env.DID!,
    password: process.env.LABELER_PASSWORD!,
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
    text: dedent`
      Hello! Let's onboard you to the GitHub labeler bot!

      This bot lets you add labels for repos you are a contributor to. You can add up to 4.

      First let's verify your GitHub account. For this to work you must list your Bluesky handle in your GitHub profile.

      Send your GitHub username in this format:

      github: your-username
    `,
  });
});

async function verifyUser(message: ChatMessage, conversation: Conversation) {
  const username = (message.text.split(":")[1] || "").trim();

  if (!username) {
    await conversation.sendMessage({
      text: dedent`
        You must provide a GitHub username.
      `,
    });
    return;
  }

  const socials = await octokit.users.listSocialAccountsForUser({ username });
  const listedBlueskyHandle = socials.data.find(
    (account) => account.provider === "bluesky"
  );

  if (!listedBlueskyHandle) {
    await conversation.sendMessage({
      text: dedent`
        You must list your Bluesky handle in your GitHub profile.
      `,
    });
    return;
  }

  const [profileErr, userForListedBlueskyHandle] = await to(
    bot.agent.get("app.bsky.actor.getProfile", {
      params: {
        actor: listedBlueskyHandle.url.replace("https://bsky.app/profile/", ""),
      },
    })
  );

  if (profileErr) {
    await conversation.sendMessage({
      text: dedent`
        Couldn't find your Bluesky profile.
      `,
    });
    return;
  }

  if (userForListedBlueskyHandle.data.did !== message.senderDid) {
    await conversation.sendMessage({
      text: dedent`
        The account your sending the message from is not the same as the account you listed in your GitHub profile.
      `,
    });
    return;
  }

  await conversation.sendMessage({
    text: dedent`
      ${SUCCESS_MESSAGE}

      To link github repo send a message like the follow. We will confirm you are a collaborator on the repo.

      repo: your-username/your-repo

      > Note: Only public repos are supported for now.
    `,
  });
}

async function findGithubUsername(conversation: Conversation) {
  let cursor: string | undefined | null = null;
  let messages: Array<ChatMessage | DeletedChatMessage> = [];
  let confirmMessageIndex = -1;

  while (confirmMessageIndex === -1 && cursor !== undefined) {
    ({ messages, cursor } = await conversation.getMessages(
      cursor || undefined
    ));

    confirmMessageIndex = messages.findIndex(
      (message) =>
        message instanceof ChatMessage &&
        message.text.startsWith(SUCCESS_MESSAGE)
    );
  }

  if (confirmMessageIndex !== -1) {
    let previousMessage = messages[confirmMessageIndex + 1];

    // If the success message is the last message, we need to fetch more
    if (!previousMessage) {
      ({ messages, cursor } = await conversation.getMessages(
        cursor || undefined
      ));
      previousMessage = messages[0];
    }

    if (!previousMessage || !(previousMessage instanceof ChatMessage)) {
      await conversation.sendMessage({
        text: dedent`
          Something went wrong. Please try again.
        `,
      });
      return;
    }

    return (previousMessage.text.split(":")[1] || "").trim();
  }
}

async function addRepoLabelForUser(
  message: ChatMessage,
  conversation: Conversation
) {
  const githubUsername = await findGithubUsername(conversation);
  console.log("Found github username", githubUsername);

  if (!githubUsername) {
    await conversation.sendMessage({
      text: "Could not find your GitHub username. Please try again.",
    });
    return;
  }

  const input = (message.text.split(":")[1] || "").trim();
  const [org, repo] = input.split("/");

  if (!org) {
    await conversation.sendMessage({
      text: "Could not find the org name in the provided slug. Please try again.",
    });
    return;
  }

  if (!repo) {
    await conversation.sendMessage({
      text: "Could not find the repo name in the provided slug. Please try again.",
    });
    return;
  }

  if (org === githubUsername) {
    await conversation.sendMessage({
      text: dedent`
          Success! You own the ${input} repo. And qualified for the label.
          
          > Note: It will take a few seconds for the label to be appear.
        `,
    });
  } else {
    const { data: mergedPrs } = await octokit.search.issuesAndPullRequests({
      q: `repo:${input} author:${githubUsername} is:merged`,
    });

    if (mergedPrs.items.length === 0) {
      await conversation.sendMessage({
        text: dedent`
            You have not merged any PRs to the repo so we cannot add the label.
          `,
      });
      return;
    } else {
      await conversation.sendMessage({
        text: dedent`
            Success! You contributed to ${input}. And qualified for the label.
            
            > Note: It will take a few seconds for the label to be appear.
          `,
      });
    }
  }

  const [repoErr, targetRepo] = await to(
    octokit.repos.get({
      owner: org,
      repo,
    })
  );

  if (repoErr) {
    await conversation.sendMessage({
      text: dedent`
          Something went wrong. ${repoErr.message}
        `,
    });
    return;
  }

  await addUserLabel(message.senderDid, {
    name: input,
    description: dedent`
        ${targetRepo?.data.description || ""}
        ${targetRepo.data.html_url}
      `,
  });
}

bot.on("message", async (message: ChatMessage) => {
  console.log(`Received message: ${message.text}`);

  const [err, conversation] = await to(
    bot.getConversationForMembers([message.senderDid])
  );

  if (err) {
    console.error(err);
    return;
  }

  if (message.text.startsWith("github:")) {
    await verifyUser(message, conversation);
  } else if (message.text.startsWith("repo:")) {
    await addRepoLabelForUser(message, conversation);
  } else if (message.text.trim() === "/reset") {
    await clearUserLabels(message.senderDid);
    await conversation.sendMessage({
      text: "All labels have been cleared! It may take a few minutes for the changes to be reflected.",
    });
  } else {
    await conversation.sendMessage({
      text: dedent`
          These are the commands you can use:

          - "github: your-username" to verify your GitHub account
          - "repo: your-username/your-repo" to add a label to your repo
          - "/reset" to clear all labels
          - "/help" to see these commands

          If you want to see the source code or fix a bug check out the repo: https://github.com/hipstersmoothie/github-labeler-bot
        `,
    });
  }
});
