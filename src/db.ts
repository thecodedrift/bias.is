import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { DB_PATH } from "./constants.js";
import { resolve } from "path";

export const db = await open({
  filename: DB_PATH,
  mode: sqlite3.OPEN_READONLY,
  driver: sqlite3.Database,
});

export const kpopdb = await open({
  filename: resolve(import.meta.dirname, "../db/kpop.db"),
  mode: sqlite3.OPEN_READONLY,
  driver: sqlite3.Database,
});