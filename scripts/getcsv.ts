// required first import
import "dotenv/config.js";

import { dirname, resolve } from "path";
import {
  createReadStream,
  existsSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { mkdirpSync } from "mkdirp";
import unzipper from "unzipper";
import { rimrafSync } from "rimraf";

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

// find the main backup file, it ends in .sql and is mysql format
const sqlFiles = readdirSync(tmpdir).filter((f) => f.endsWith(".sql"));
if (sqlFiles.length === 0) {
  console.log("No .sql file found in extracted data.");
  process.exit(1);
}
const sqlFileName = sqlFiles[0]!;
const sqlFile = resolve(tmpdir, sqlFileName);
console.log(`Parsing SQL dump: ${sqlFileName}`);

const COLUMNS = [
  "id",
  "is_collab",
  "artiststyle",
  "name",
  "kname",
  "previous_name",
  "previous_kname",
  "fname",
  "alias",
  "members",
  "issolo",
  "id_parentgroup",
  "formation",
  "disband",
  "fanclub",
  "id_debut",
  "debut_date",
  "date_birth",
  "is_deceased",
  "sales",
  "releases",
  "awards",
  "views",
  "pak_total",
  "gaondigital_times",
  "gaondigital_firsts",
  "yawards_total",
  "social",
  "melonid",
  "mslevel",
];

/** Parse the comma-separated values inside a MySQL VALUES tuple. */
function parseMySQLValues(inner: string): (string | number | null)[] {
  const values: (string | number | null)[] = [];
  let i = 0;

  while (i < inner.length) {
    // skip whitespace
    while (i < inner.length && inner[i] === " ") i++;
    if (i >= inner.length) break;

    if (inner[i] === "N" || inner[i] === "n") {
      // NULL
      if (inner.substring(i, i + 4).toLowerCase() === "null") {
        values.push(null);
        i += 4;
      }
    } else if (inner[i] === '"' || inner[i] === "'") {
      // quoted string
      const quote = inner[i];
      i++;
      let value = "";
      while (i < inner.length) {
        if (inner[i] === "\\") {
          i++;
          if (i < inner.length) {
            switch (inner[i]) {
              case "n":
                value += "\n";
                break;
              case "r":
                value += "\r";
                break;
              case "t":
                value += "\t";
                break;
              case "0":
                value += "\0";
                break;
              default:
                value += inner[i];
                break;
            }
          }
          i++;
        } else if (inner[i] === quote) {
          // '' or "" is an escaped quote within the string
          if (i + 1 < inner.length && inner[i + 1] === quote) {
            value += quote;
            i += 2;
          } else {
            i++; // closing quote
            break;
          }
        } else {
          value += inner[i];
          i++;
        }
      }
      values.push(value);
    } else {
      // unquoted value (number)
      let numStr = "";
      while (i < inner.length && inner[i] !== ",") {
        numStr += inner[i];
        i++;
      }
      numStr = numStr.trim();
      const num = Number(numStr);
      values.push(isNaN(num) ? numStr : num);
    }

    // skip comma separator
    while (i < inner.length && inner[i] === " ") i++;
    if (i < inner.length && inner[i] === ",") i++;
  }

  return values;
}

const records: Record<string, any>[] = [];
const INSERT_PREFIX = "INSERT INTO app_kpop_group VALUES ";
let inInsert = false;

const rl = createInterface({
  input: createReadStream(sqlFile),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  let tupleLine: string;

  if (line.startsWith(INSERT_PREFIX)) {
    inInsert = true;
    tupleLine = line.substring(INSERT_PREFIX.length);
  } else if (inInsert && line.startsWith("(")) {
    tupleLine = line;
  } else {
    inInsert = false;
    continue;
  }

  // extract content between outermost ( and )
  const start = tupleLine.indexOf("(");
  const end = tupleLine.lastIndexOf(")");
  if (start === -1 || end === -1 || end <= start) continue;

  const inner = tupleLine.substring(start + 1, end);
  const values = parseMySQLValues(inner);

  if (values.length !== COLUMNS.length) {
    console.warn(
      `Warning: expected ${COLUMNS.length} columns, got ${values.length} for id=${values[0]}`
    );
    continue;
  }

  const record: Record<string, any> = {};
  for (let j = 0; j < COLUMNS.length; j++) {
    record[COLUMNS[j]!] = values[j];
  }
  records.push(record);

  if (tupleLine.trimEnd().endsWith(");")) {
    inInsert = false;
  }
}

console.log(`Parsed ${records.length} artists from SQL dump`);

const artists = records.map((r) => ({
  id: String(r.id),
  name: r.name,
  hangul: r.kname,
  "solo/group": r.issolo === "y" ? "solo" : "group",
  "date of birth (if solo)": r.issolo === "y" ? (r.date_birth ?? "") : "",
  "member gender (or soloist gender)": r.members,
  "full name (if solo)": r.issolo === "y" ? r.fname : "",
  "debut video ID": String(r.id_debut ?? ""),
  "debut date": r.debut_date ?? "",
  "disband date": r.disband,
  "fanclub name": r.fanclub ?? "",
  "sales (circle)": String(r.sales),
  views: String(r.views),
  "circle streaming number of times charted (weekly)": String(
    r.gaondigital_times
  ),
  "circle streaming first places (weekly)": String(r.gaondigital_firsts),
  "music show awards": String(r.awards),
  "yearly awards": String(r.yawards_total),
  paks: String(r.pak_total),
}));

console.log("Sample:", artists[0]);

console.log("Writing artist data");
writeFileSync(
  resolve(targetdir, "artists.json"),
  JSON.stringify(artists, null, 2)
);
