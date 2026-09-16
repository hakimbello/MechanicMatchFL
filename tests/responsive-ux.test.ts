import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync("app/globals.css", "utf8");

test("page and footer shells avoid viewport-plus-padding overflow", () => {
  assert.match(globalCss, /\.page-shell\s*{[^}]*width:\s*100%;[^}]*max-width:\s*1120px;/s);
  assert.match(globalCss, /\.site-footer\s*{[^}]*width:\s*100%;[^}]*max-width:\s*1120px;/s);
});

test("small navigation links keep comfortable touch targets", () => {
  assert.match(globalCss, /\.back-link\s*{[^}]*min-height:\s*44px;/s);
  assert.match(globalCss, /\.site-footer a\s*{[^}]*min-height:\s*44px;/s);
});

test("long profile and admin detail text can wrap on narrow screens", () => {
  assert.match(globalCss, /\.contact-action span\s*{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(globalCss, /\.detail-list dd\s*{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(globalCss, /@media\s*\(max-width:\s*480px\)\s*{[^}]*\.detail-list,\s*\.admin-detail-list\s*{[^}]*grid-template-columns:\s*1fr;/s);
});
