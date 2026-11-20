// 2026-11-16 bank request: "Can we hide/remove this [CardFusion] from the menu for now. The page will be visited through
// direct url visit only."
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('CardFusion is not in the sidebar menu but /cardfusion still opens its page', () => {
  const sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
  const start = sidebar.indexOf('const navItems'); const items = sidebar.slice(start, sidebar.indexOf('\n]', start));
  const active = items.split('\n').filter(l => !l.trim().startsWith('//'));
  assert.ok(!active.some(l => l.includes("'cardfusion'")), 'no active CardFusion menu item');
  assert.ok(active.some(l => l.includes("'cards'")), 'Card Management stays');
  // Still a valid section, and the shell still renders the page for it.
  assert.match(sidebar.slice(0, sidebar.indexOf('const navItems')), /'cardfusion'/);
  assert.match(fs.readFileSync('src/components/layout/AppShell.tsx', 'utf8'), /cardfusion: <CardFusionPage \/>/);
});
