import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { Action } from "./action.js";
import { DB_PATH } from "../constants.js";

export const admin: Action = {
  match: /^\/admin[\s]+/,
  cmd: "/admin <command>",
  description: "Do admin commands (must have admin DID)",
  admin: true,
  async handler(message, conversation) {
    const db = await open({
      filename: DB_PATH,
      mode: sqlite3.OPEN_READONLY,
      driver: sqlite3.Database,
    });
    const stmt = await db.prepare("SELECT * FROM labels WHERE did = ?", message.senderDid);
    const rows = await stmt.run();
    console.log(rows);

    await conversation.sendMessage({
      text: "DONE (sent to logs)"
    })
  }
}


