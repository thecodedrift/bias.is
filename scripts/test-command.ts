import { sprintf } from "sprintf-js";
import { add } from "../src/actions/add.js";
import { help } from "../src/actions/help.js";
import { reset } from "../src/actions/reset.js";
import { ult } from "../src/actions/ult.js";
import { en } from "../src/lang.js";

const actions = [help, reset, add, ult];

const list = actions
  .map((action) => `${action.cmd} - ${action.description}`)
  .join("\n");

console.log(en.help);

console.log({
  text: sprintf(en.help, {
    commands: list,
  }),
});
