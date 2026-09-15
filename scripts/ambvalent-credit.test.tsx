import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AmbValentCredit } from "../components/AmbValentCredit";

const expectedCopyright = "© 2026 AMBVALENT LLC. TODOS LOS DERECHOS RESERVADOS.";

test("renders the complete AMBValent copyright with a direct corporate link", () => {
  const markup = renderToStaticMarkup(<AmbValentCredit />);
  const visibleText = markup.replace(/<[^>]+>/g, "");

  assert.equal(visibleText, expectedCopyright);
  assert.match(markup, /href="https:\/\/ambvalent\.com"/);
  assert.doesNotMatch(markup, /target=|rel=|ambvalent-logo|Diseñado y desarrollado por|whitespace-nowrap/);
});

test("preserves readable light and dark footer variants", () => {
  assert.match(renderToStaticMarkup(<AmbValentCredit />), /text-muted/);
  assert.match(renderToStaticMarkup(<AmbValentCredit dark />), /text-\[#cbd8db\]/);
});
