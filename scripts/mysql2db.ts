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

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpdir = resolve(__dirname, "../tmp");
const targetdir = resolve(__dirname, "../db");

// mkdirp the tmpdir
mkdirpSync(tmpdir);
mkdirpSync(targetdir);

// TODO, use soridata permanent download URL
// downloads file into ./tmp
// until we have the URL, place dbdownload.zip into the tmpdir manually

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
