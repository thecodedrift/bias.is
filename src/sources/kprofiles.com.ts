import { DataSource } from "./source.js";

export const kprofiles: DataSource = {
  domain: /^https:\/\/(?:www\.)kprofiles\.com\/(.+)/i,
  extract(contents) {
    return false;
  }
}