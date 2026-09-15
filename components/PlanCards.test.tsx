import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JSDOM } from "jsdom";
import React from "react";
import { PlanCards } from "./PlanCards";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/planes",
});

Object.assign(globalThis, {
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  sessionStorage: dom.window.sessionStorage,
  getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
});

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

test("renders aligned native radios with a distinct recommendation and disabled initial CTA", () => {
  const view = render(<PlanCards />);
  const radios = view.getAllByRole("radio") as HTMLInputElement[];
  const cards = radios.map((radio) => radio.nextElementSibling as HTMLElement);

  assert.equal(view.getByRole("group", { name: "Selecciona un plan" }).tagName, "FIELDSET");
  assert.equal(radios.length, 3);
  assert.ok(radios.every((radio) => !radio.checked && !radio.disabled));
  assert.ok(cards.every((card) => card.className.includes("h-full")));
  assert.equal(view.getAllByText("Más popular").length, 1);
  assert.equal(view.getByRole("button", { name: "Continuar →" }).hasAttribute("disabled"), true);
});

test("selects from the full card surface, persists the choice, and enables the single CTA", async () => {
  const user = userEvent.setup({ document });
  const view = render(<PlanCards />);
  const initial = view.getByRole("radio", { name: /Inicial/ }) as HTMLInputElement;

  await user.click(initial.closest("label")!);

  assert.equal(initial.checked, true);
  assert.equal(sessionStorage.getItem("docli.plan"), "inicial");
  assert.equal(view.getByText("Plan seleccionado").closest("span")?.className.includes("bg-primary"), true);
  assert.equal(view.getByRole("link", { name: "Continuar con Inicial →" }).getAttribute("href"), "/registro?plan=inicial");
  assert.equal(view.queryByRole("button", { name: "Continuar →" }), null);
});

test("supports radio keyboard navigation and exposes the checked state", async () => {
  const user = userEvent.setup({ document });
  const view = render(<PlanCards />);
  const initial = view.getByRole("radio", { name: /Inicial/ }) as HTMLInputElement;
  const team = view.getAllByRole("radio").find((radio) => (radio as HTMLInputElement).value === "equipo") as HTMLInputElement;

  initial.focus();
  await user.keyboard("{ArrowRight}");

  assert.equal(team.checked, true);
  assert.equal(document.activeElement, team);
  assert.equal(sessionStorage.getItem("docli.plan"), "equipo");
  assert.match(team.nextElementSibling?.className ?? "", /peer-focus-visible/);
  assert.match(team.nextElementSibling?.className ?? "", /peer-checked/);
});

test("restores a saved selection without conflating it with the popular badge", async () => {
  sessionStorage.setItem("docli.plan", "organizacion");
  const view = render(<PlanCards />);
  const organization = view.getByRole("radio", { name: /Organización/ }) as HTMLInputElement;

  await waitFor(() => assert.equal(organization.checked, true));

  assert.equal(view.getAllByText("Más popular").length, 1);
  assert.equal(view.getByRole("link", { name: "Continuar con Organización →" }).getAttribute("href"), "/registro?plan=organizacion");
});
