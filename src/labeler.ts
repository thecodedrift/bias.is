import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import {
  getLabelerLabelDefinitions,
  setLabelerLabelDefinitions,
} from "@skyware/labeler/scripts";
import { DID, PORT, MAXLABELS, SIGNING_KEY, LABELER_PASSWORD, DB_PATH } from "./constants.js";
import { LabelerServer } from "@skyware/labeler";
import { db } from "./db.js";
import { toIdentifier } from "./util/toIdentifier.js";

export class MaxLabelsExceededError extends Error {
  constructor() {
    super("Max labels exceeded");
    this.name = "MaxLabelsExceededError";
  }
}

export const server = new LabelerServer({
  did: DID,
  signingKey: SIGNING_KEY,
  dbPath: DB_PATH,
});

server.app.listen({ port: PORT, host: "::" }, (error, address) => {
  if (error) console.error(error);
  else console.log(`Labeler server listening on ${address}`);
});

const credentials = {
  identifier: DID,
  password: LABELER_PASSWORD,
};

export type Label = {
  name: string;
  description: string;
}

// internal function to create a label on atproto
async function createLabel({ name, description }: Label) {
  const identifier = toIdentifier(name);
  const currentLabels = (await getLabelerLabelDefinitions(credentials)) || [];

  if (currentLabels.find((label) => label.identifier === identifier)) {
    console.log(`Label ${identifier} already exists`);
    return;
  }

  await setLabelerLabelDefinitions(credentials, [
    ...currentLabels,
    {
      identifier,
      severity: "inform",
      blurs: "none",
      defaultSetting: "warn",
      adultOnly: false,
      locales: [{ lang: "en", description, name }],
    },
  ]);
  console.log(`Created label ${identifier}!`);
}

/** Add a given label for a DID, automatically converting the labels to identifiers */
export const addUserLabel = async (did: string, label: Label) => {
  // reduce label name to a valid atproto identifier
  const identifier = toIdentifier(label.name);

  // get current labels
  const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, did);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();

  // make a set of the current labels
  const labels = rows.reduce((set, label) => {
    if (!label.neg) set.add(label.val);
    else set.delete(label.val);
    return set;
  }, new Set<string>());

  if (labels.size >= MAXLABELS) {
    throw new MaxLabelsExceededError();
  }

  // create the label on atproto
  await createLabel(label);

  const saved = server.createLabel({ uri: did, val: identifier });

  return saved;
};

/** Removes all labels for a given DID */
export const clearUserLabels = async (did: string) => {
  const stmt = await db.prepare(`SELECT * FROM labels WHERE uri = ?`, did);
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();
  const toNegate = new Set<string>();
  for (const row of rows) {
    if (!row.neg) {
      toNegate.add(row.val);
    }
  }

  if (toNegate.size === 0) {
    return toNegate;
  }

  // change labels on server
  server.createLabels({ uri: did }, { negate: [...toNegate] });

  // delete from labeler
  const deleteStmt = await db.prepare(`DELETE FROM labels WHERE uri = ? AND val IN ?`, did, [...toNegate]);
  await deleteStmt.run();

  return toNegate;
};

interface Session {
  accessJwt: string;
  refreshJwt: string;
}

export const getStoredSession = () => {
  // initialize session table if it doesn't exist
  server.db
    .prepare(
      `CREATE TABLE IF NOT EXISTS session (uri TEXT PRIMARY KEY, accessJwt TEXT, refreshJwt TEXT)`
    )
    .run();

  // TODO: https://github.com/skyware-js/bot/issues/16
  return null as Session | null;
  // return server.db
  //   .prepare<string[]>(`SELECT * FROM session WHERE uri = ?`)
  //   .get(DID) as unknown as Session | null;
};

export const setStoredSession = (session: Session) => {
  server.db
    .prepare(
      `INSERT OR REPLACE INTO session (uri, accessJwt, refreshJwt) VALUES (?, ?, ?)`
    )
    .run(DID, session.accessJwt, session.refreshJwt);
};
