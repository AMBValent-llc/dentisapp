import assert from "node:assert/strict";
import { test } from "node:test";
import { containsPattern } from "../lib/db/search";

test("substring searches treat SQL wildcards and escape characters literally", () => {
  assert.equal(containsPattern("normal"), "%normal%");
  assert.equal(containsPattern("50%_done\\"), String.raw`%50\%\_done\\%`);
  assert.equal(containsPattern(""), "%%");
});
