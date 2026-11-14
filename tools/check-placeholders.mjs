#!/usr/bin/env node
// Launch gate (QA report 2026-11-13): lists editorial placeholders hardcoded in frontend source.
// Database content is checked separately by `php artisan site:placeholders`.
// Usage: node tools/check-placeholders.mjs   → exit 1 while any placeholder remains.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/src", "apps/client/src", "apps/admin/src"];
const SKIP = new Set(["node_modules", ".next"]);
const PATTERN = /\[(?:ARCHER TO CONFIRM[^\]]*|CONFIRM[^\]]*|#|TBD|TODO)\]/gi;
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(tsx?|jsx?|json|md)$/.test(name)) continue;
    readFileSync(p, "utf8").split("\n").forEach((line, i) => {
      for (const m of line.matchAll(PATTERN)) hits.push(`${relative(process.cwd(), p)}:${i + 1}  ${m[0]}`);
    });
  }
}
for (const r of ROOTS) { try { walk(r); } catch { /* app not present */ } }

if (hits.length === 0) { console.log("No placeholders in frontend source."); process.exit(0); }
console.log(hits.join("\n"));
console.error(`\n${hits.length} placeholder(s) must be replaced before launch.`);
process.exit(1);
