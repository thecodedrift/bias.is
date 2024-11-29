// required first import
import "dotenv/config.js";

import { dirname, resolve } from "path";
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { fileURLToPath } from "url";
import { mkdirpSync } from "mkdirp";
import unzipper from "unzipper";
import { rimrafSync } from "rimraf";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { mysql2sqlite } from "../src/vendor/mysql2sqlite.js";

// do not attempt to fetch without a valid soridata key,
// or you will get banned you've been warned.
const SORIDATA_KEY = process.env.SORIDATA_KEY;
const SORIDATA_CONTACT = process.env.SORIDATA_CONTACT;
const SORIDATA_URL = "https://soridata.com/download.php";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpdir = resolve(__dirname, "../tmp");
const targetdir = resolve(__dirname, "../db");
const soridataAlreadyExists = existsSync(resolve(tmpdir, "dbdownload.zip"));

// mkdirp the tmpdir
mkdirpSync(tmpdir);
mkdirpSync(targetdir);

// If you do not have a soridata key, just download the database manually
// seriously. It is free. Don't ruin it for others.
// https://soridata.com/en/database_download.html
if (!soridataAlreadyExists && SORIDATA_KEY && SORIDATA_CONTACT) {
  console.log("Downloading Soridata");
  const fd = new FormData();
  fd.set("safety", "");
  fd.set("pass", SORIDATA_KEY ?? "");

  const headers = new Headers();
  headers.set("User-Agent", `bias.is (${SORIDATA_CONTACT})`);

  const zipResp = await fetch(SORIDATA_URL, {
    method: "POST",
    headers,
    body: fd,
  });

  const data = await zipResp.arrayBuffer();
  writeFileSync(resolve(tmpdir, "dbdownload.zip"), Buffer.from(data));
} else if (soridataAlreadyExists) {
  console.log("Soridata exists. Not downloading again.");
}

// check if dbdownload.zip exists
if (!existsSync(resolve(tmpdir, "dbdownload.zip"))) {
  console.log("No dbdownload.zip found. Please download soridata, run again.");
  process.exit(0);
}

// open and extract the sql dump
console.log("Extracting dbdownload.zip");
const zipdir = await unzipper.Open.file(resolve(tmpdir, "dbdownload.zip"));
await zipdir.extract({ path: tmpdir });

// find the mainbackup file
const files = readdirSync(tmpdir);
const backupFile = files.find((file) => file.match(/^mainbackup_.*\.sql$/));
const outputFile = resolve(tmpdir, "output.sql");

if (backupFile) {
  console.log(`Found backup file: ${backupFile}`);
} else {
  console.log("No backup file found.");
  process.exit(1);
}

// read the file into memory
console.log("Reading backup file");
const contents = readFileSync(resolve(tmpdir, backupFile), "utf-8");

// grab the table and insert sections
console.log("Parsing backup file");
const createTable =
  contents.match(/(CREATE TABLE `app_kpop_group` [\s\S]+?;)/gm)?.[0] ?? "";
const insertValues =
  contents.match(/(INSERT INTO app_kpop_group [\s\S]+?)\r?\n--/gm)?.[0] ?? "";

// write to outputFile
console.log("Writing output file");
const combinedOutput = `${createTable}\n\n${insertValues}`;
writeFileSync(outputFile, combinedOutput, "utf8");

// convert to sqlite
console.log("Converting to SQLite");
const sqlite = mysql2sqlite(combinedOutput);

// write to sqlite.sql
console.log("Writing SQLite file");
writeFileSync(resolve(tmpdir, "sqlite.sql"), sqlite);

// open the sqlite db
console.log("Opening SQLite database");
rimrafSync(resolve(tmpdir, "kpop.db"));

const db = await open({
  filename: resolve(tmpdir, "kpop.db"),
  driver: sqlite3.Database,
});
await db.exec(sqlite);
await db.close();

console.log("Replacing kpop.db");
renameSync(resolve(tmpdir, "kpop.db"), resolve(targetdir, "kpop.db"));

console.log("Done");
