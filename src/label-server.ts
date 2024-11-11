import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import {
  getLabelerLabelDefinitions,
  setLabelerLabelDefinitions,
} from "@skyware/labeler/scripts";
import { DID, PORT, MAXLABELS, SIGNING_KEY } from "./constants.js";
import { LabelerServer } from "@skyware/labeler";

const server = new LabelerServer({
  did: DID,
  signingKey: SIGNING_KEY,
  dbPath: process.env.DB_PATH,
});

server.app.listen({ port: PORT, host: "::" }, (error, address) => {
  if (error) console.error(error);
  else console.log(`Labeler server listening on ${address}`);
});

const credentials = {
  identifier: DID,
  password: process.env.LABELER_PASSWORD!,
};

interface Label {
  name: string;
  description: string;
}

function getIdentifier(name: string) {
  return name.replace("/", "-");
}

async function createLabel({ name, description }: Label) {
  const identifier = getIdentifier(name);
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

export const addUserLabel = async (did: string, label: Label) => {
  const identifier = getIdentifier(label.name);
  // Get the current labels for the did
  const query = server.db
    .prepare<string[]>(`SELECT * FROM labels WHERE uri = ?`)
    .all(did) as ComAtprotoLabelDefs.Label[];

  await createLabel(label);

  // make a set of the current labels
  const labels = query.reduce((set, label) => {
    if (!label.neg) set.add(label.val);
    else set.delete(label.val);
    return set;
  }, new Set<string>());

  try {
    if (labels.size < MAXLABELS) {
      server.createLabel({ uri: did, val: identifier });
      console.log(`${new Date().toISOString()} Labeled ${did}: ${identifier}`);
    }
  } catch (err) {
    console.error(err);
  }
};

// if (rkey.includes(DELETE)) {
//   server.createLabels({ uri: did }, { negate: [...labels] });
//   console.log(`${new Date().toISOString()} Deleted labels: ${did}`);
// }
