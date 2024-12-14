import { sprintf } from "sprintf-js";
import { add } from "../src/actions/add.js";
import { help } from "../src/actions/help.js";
import { reset } from "../src/actions/reset.js";
import { ult } from "../src/actions/ult.js";

const actions = [help, reset, add, ult];

const list = actions
  .map((action) => `${action.cmd} - ${action.description}`)
  .join("\n");

console.log({
  text: sprintf("%(commands)s", {
    commands: list,
  }),
});
