import dedent from "dedent";

type LanguageStrings =
  | "welcome"
  | "list"
  | "stanSuccess"
  | "ultSuccess"
  | "ultOnlyOne"
  | "stanMax"
  | "resetSuccess"
  | "help";

  type Language = Record<LanguageStrings, string>;

export const en: Language = {
  welcome: dedent`
    Hello! Welcome to the bias.is labeler! This bot let you add up to four biases to your bluesky profile.

    Here's a list of commands to get started:

    %(commands)
  `.trim(),
  list: dedent`
    Here's the groups and individuals you stan, plus your current 💖 ult
  `,
  stanSuccess: dedent`
    Done! You're now stanning %(bias). It may take a few minutes to show up.
  `.trim(),
  ultSuccess: dedent`
    💖 let's goooo~ %(bias) is now your ult. It may take a few minutes to show up.
  `.trim(),
  ultOnlyOne: dedent`
    We have to keep the number of ults down or we'll be here all day. Use /reset to start over.
  `.trim(),
  stanMax: dedent`
    I want to list everyone too, but we have to limit somewhere~
  `,
  resetSuccess: dedent`
    Okay, we reset your stan & ult lists. This is who you had before:

    %(list)
  `,
  help: dedent`
    For a refresher, here's the commands for bias.is

    %(commands)
  `,
};
