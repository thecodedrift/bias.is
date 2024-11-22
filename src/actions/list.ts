import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { Action } from "./action.js";
import { DB_PATH } from "../constants.js";

export const list: Action = {
  match: /^\/list/,
  cmd: "/list",
  description: "List your current bias and utls",
  async handler(message, conversation) {
    // TODO

  }
}
