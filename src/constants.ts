import "dotenv/config";

export const DID = process.env.DID ?? "";
export const HANDLE = "@github-labeler.bsky.social";
export const SIGNING_KEY = process.env.SIGNING_KEY ?? "";
export const PORT = Number(process.env.PORT ?? 4001);
export const MAXLABELS = 4;
