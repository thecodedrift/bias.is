// required first import
import "dotenv/config.js";

import process from "node:process";
import { getLabelerLabelDefinitions, setLabelerLabelDefinitions } from "@skyware/labeler/scripts";
import { DID, LABELER_PASSWORD } from "../../src/constants.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpdir = resolve(__dirname, "../tmp");
const action = process.argv[2];

if (action === "dump") {
  const defs = (await getLabelerLabelDefinitions({
      identifier: DID,
      password: LABELER_PASSWORD,
  })) ?? [];

  const out = JSON.stringify(defs, null, 2);
  await writeFile(resolve(tmpdir, "labels.json"), out);
}
else if (action === "load") {
  const data = await readFile(resolve(tmpdir, "labels.json"), "utf8");
  const defs = JSON.parse(data);
  await setLabelerLabelDefinitions({
    identifier: DID,
    password: LABELER_PASSWORD,
  }, defs);
}
else {
  console.error("Invalid action")
  process.exit(1)
}

console.log("DONE")
process.exit(0);
