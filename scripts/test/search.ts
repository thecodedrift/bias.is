import { doSearch } from "../../src/actions/search.js";

const result = await doSearch("seokjin", { raw: false });
console.log(result);

const groupResult = await doSearch("ateez", { raw: true });
console.log(groupResult);
