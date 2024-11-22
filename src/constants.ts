import "dotenv/config";
import process from "node:process";

export const HANDLE = "@bias.is";
export const DID = (process.env.DID ?? "") as `did:${string}`;
export const SIGNING_KEY = process.env.SIGNING_KEY ?? "";
export const LABELER_PASSWORD = process.env.LABELER_PASSWORD ?? "";
export const PORT = Number(process.env.PORT ?? 4001);
export const MAXLABELS = 4;
export const ADMINS = (process.env.ADMINS ?? "").split(",").map((x) => x.trim());

export const DB_PATH = process.env.DB_PATH!;
if (!DB_PATH) {
  throw new Error("DB_PATH is required");
}

