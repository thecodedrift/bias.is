export type DataSource = {
  // ensures we only do a fetch on a proper domain
  domain: RegExp,
  // pulls the name of the group or idol from the html
  extract: (contents: string) => false | string;
}