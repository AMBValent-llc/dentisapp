import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AmbValentCredit } from "../components/AmbValentCredit";
import { AppFooter } from "../components/AppShell";
import { PublicFooter } from "../components/PublicShell";

const expectedCopyright = "© 2026 AMBVALENT LLC. TODOS LOS DERECHOS RESERVADOS.";

function visibleText(markup: string) {
  return markup.replace(/<[^>]+>/g, "");
}

test("renders the complete AMBValent copyright with a direct corporate link", () => {
  const markup = renderToStaticMarkup(<AmbValentCredit />);

  assert.equal(visibleText(markup), expectedCopyright);
  assert.match(markup, /href="https:\/\/ambvalent\.com"/);
  assert.doesNotMatch(markup, /target=|rel=|ambvalent-logo|Diseñado y desarrollado por|whitespace-nowrap/);
});

test("preserves readable light and dark footer variants", () => {
  assert.match(renderToStaticMarkup(<AmbValentCredit />), /text-muted/);
  assert.match(renderToStaticMarkup(<AmbValentCredit dark />), /text-\[#cbd8db\]/);
});

test("renders one copyright in the public footer while preserving its brand and legal links", () => {
  const markup = renderToStaticMarkup(<PublicFooter />);
  const copyrightOccurrences = visibleText(markup).match(/© 2026/g) ?? [];

  assert.equal(copyrightOccurrences.length, 1);
  assert.match(markup, /href="https:\/\/ambvalent\.com"/);
  assert.match(markup, /aria-label="Docli, inicio"/);
  assert.match(markup, /href="\/privacidad"/);
  assert.match(markup, /href="\/terminos"/);
});

test("renders one copyright with the official link in the dark app footer", () => {
  const markup = renderToStaticMarkup(<AppFooter />);
  const copyrightOccurrences = visibleText(markup).match(/© 2026/g) ?? [];

  assert.equal(copyrightOccurrences.length, 1);
  assert.match(markup, /href="https:\/\/ambvalent\.com"/);
  assert.match(markup, /text-\[#cbd8db\]/);
});
