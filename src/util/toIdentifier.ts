import romanizer from "hangul-romanization";

const table: [RegExp, string][] = [
  // phase 1, numbers to words
  [/0/g, "zero"],
  [/1/g, "one"],
  [/2/g, "two"],
  [/3/g, "three"],
  [/4/g, "four"],
  [/5/g, "five"],
  [/6/g, "six"],
  [/7/g, "seven"],
  [/8/g, "eight"],
  [/9/g, "nine"],
  // phase 2 remove anything not labeler friendly for a dash
  [/[^a-z-]/g, "-"]
];

export const toIdentifier = (name: string) => {
  // TODO this is where future Jakob is gonna be sad
  // 2NE1 becomes "two-ne-one"
  // ref: https://github.com/hipstersmoothie/github-labeler-bot/blob/c08d551e9f10a03908619c73b9f0c51a4e5bd982/src/label-server.ts#L43
  let current = romanizer.convert(name.toLowerCase());
  for (const [regex, replace] of table) {
    current = current.replace(regex, replace);
  }

  return current;
}