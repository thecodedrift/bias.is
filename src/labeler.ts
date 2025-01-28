import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import {
  getLabelerLabelDefinitions,
  setLabelerLabelDefinitions,
} from "@skyware/labeler/scripts";
import {
  DID,
  PORT,
  MAX_LABELS,
  SIGNING_KEY,
  LABELER_PASSWORD,
  DB_PATH,
} from "./constants.js";
import { LabelerServer } from "@skyware/labeler";
import { db } from "./db.js";
import { toIdentifier } from "./util/toIdentifier.js";
import { TooManyLabelsError } from "./errors/overlabeled.js";

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
  ambiguous?: boolean;
};

type Options = {
  edit?: boolean;
};

// internal function to create a label on atproto
export const createLabel = async (
  { name, description }: Label,
  options?: Options
) => {
  const identifier = toIdentifier(name);
  const currentLabels = (await getLabelerLabelDefinitions(credentials)) || [];

  if (
    !options?.edit &&
    currentLabels.find((label) => label.identifier === identifier)
  ) {
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
};

/**
 * Walks the label history, ensuring the most recent "active" labels are
 * returned, and that the labels are in the correct order as applied
 */
export const getUserLabels = async (did: string) => {
  // order by created ASC
  const stmt = await db.prepare(
    `SELECT * FROM labels WHERE uri = ? ORDER BY cts ASC`,
    did
  );
  const rows = await stmt.all<ComAtprotoLabelDefs.Label[]>();

  const active = new Set<string>();
  // walk forward through rows, toggling active state by adding or removing
  for (const row of rows) {
    if (row.neg) {
      active.delete(row.val);
    } else {
      active.add(row.val);
    }
  }

  // then find the most recent rows matching active off the reverse of rows
  // but use active as our loop to minimize iterations
  const labels: ComAtprotoLabelDefs.Label[] = [];
  const reversed = rows.slice().reverse();
  for (const val of Array.from(active)) {
    const row = reversed.find((row) => row.val === val);
    if (row) {
      labels.push(row);
    }
  }

  return labels;
};

/** Add a given label for a DID, automatically converting the labels to identifiers */
export const addUserLabel = async (did: string, label: Label) => {
  // reduce label name to a valid atproto identifier
  const identifier = toIdentifier(label.name);

  // get current labels
  const active = await getUserLabels(did);

  if (active.length >= MAX_LABELS) {
    throw new TooManyLabelsError(label.name);
  }

  // create the label on atproto
  await createLabel(label);

  server.createLabel({ uri: did, val: identifier });

  return label;
};

/**
 * Removes all labels for a given DID
 * Gets a list of all positive labels on your
 */
export const clearUserLabels = async (did: string) => {
  // get current labels
  const active = await getUserLabels(did);
  const toNegate = active.map((label) => label.val);

  if (toNegate.length === 0) {
    return toNegate;
  }

  // change labels on server
  server.createLabels({ uri: did }, { negate: [...toNegate] });

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
