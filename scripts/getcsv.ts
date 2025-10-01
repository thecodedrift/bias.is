// required first import
import "dotenv/config.js";

import { dirname, resolve } from "path";
import {
  createReadStream,
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
import { parse } from "csv-parse";

// do not attempt to fetch without a valid soridata key,
// or you will get banned you've been warned.
const SORIDATA_KEY = process.env.SORIDATA_KEY;
const SORIDATA_CONTACT = process.env.SORIDATA_CONTACT;
const SORIDATA_URL = "https://soridata.com/download.php";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpdir = resolve(__dirname, "../tmp");
const targetdir = resolve(__dirname, "../db");
const ZIPFILE = "csv.zip";
const soridataAlreadyExists = existsSync(resolve(tmpdir, ZIPFILE));

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
  fd.set("getcsv", "y");
  fd.set("pass", SORIDATA_KEY ?? "");

  const headers = new Headers();
  headers.set("User-Agent", `bias.is (${SORIDATA_CONTACT})`);

  const zipResp = await fetch(SORIDATA_URL, {
    method: "POST",
    headers,
    body: fd,
  });

  const data = await zipResp.arrayBuffer();
  writeFileSync(resolve(tmpdir, ZIPFILE), Buffer.from(data));
} else if (soridataAlreadyExists) {
  console.log("Soridata exists. Not downloading again.");
}

// check if dbdownload.zip exists
if (!existsSync(resolve(tmpdir, ZIPFILE))) {
  console.log("No .zip found. Please download soridata, run again.");
  process.exit(0);
}

// remove all files from the tmpdir that are not dbdownload.zip
const toClean = readdirSync(tmpdir);
for (const file of toClean) {
  if (file !== ZIPFILE) {
    const filePath = resolve(tmpdir, file);
    if (existsSync(filePath)) {
      console.log(`Removing file: ${filePath}`);
      rimrafSync(filePath);
    }
  }
}

// open and extract the sql dump
console.log("Extracting");
const zipdir = await unzipper.Open.file(resolve(tmpdir, ZIPFILE));
await zipdir.extract({ path: tmpdir });

console.log("Parsing CSV");
const records = [];
const parser = createReadStream(resolve(tmpdir, "korean_artists.csv")).pipe(
  parse({
    // Configure CSV parsing options here, e.g.:
    columns: true, // Treat the first row as column headers
    ltrim: true, // Remove surrounding whitespace
    rtrim: true,
    skip_empty_lines: true,
  })
);

for await (const record of parser) {
  records.push(record);
}

console.log("Writing artist data");
// write the JSON to artists.json
writeFileSync(
  resolve(targetdir, "artists.json"),
  JSON.stringify(records, null, 2)
);
