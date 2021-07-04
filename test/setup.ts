import fetch from "node-fetch";

declare let global: any;

Object.assign(global, {
  fetch: fetch,
});
