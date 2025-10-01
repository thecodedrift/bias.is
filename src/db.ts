import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { DB_PATH } from "./constants.js";

export const db = await open({
  filename: DB_PATH,
  mode: sqlite3.OPEN_READONLY,
  driver: sqlite3.Database,
});
