import { basename, resolve } from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __dirname = basename(import.meta.url);

const db = await open({
  filename: resolve(__dirname, "../db/kpop.db"),
  mode: sqlite3.OPEN_READONLY,
  driver: sqlite3.Database,
});

// select 3 rows from app_kpop_group
const rows = await db.all("SELECT * FROM app_kpop_group LIMIT 3");

console.log(rows);
