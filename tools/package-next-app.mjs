// Builds a Next.js app in apps/<name> and packages it for upload (no command line needed on the host).
//
//   node tools/package-next-app.mjs admin  --api=https://api.example.com/api/v1
//   node tools/package-next-app.mjs client --api=https://api.example.com/api/v1 --site=https://www.example.com
//
// Output: deploy/<name>/ and deploy/archer-<name>.zip
// NEXT_PUBLIC_* values are baked in at build time, so pass the real addresses here.
//
// Layout (same idea as src/scripts/package-deploy.mjs, for hosts with a "Node.js app" preset):
//   package.json                 start = node .next/standalone/server.js (nothing to install or build)
//   .next/standalone/...         server + the few node_modules it needs, public/, .next/static
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

const [name, ...rest] = process.argv.slice(2);
if (!["admin", "client"].includes(name ?? "")) {
  console.error("Usage: node tools/package-next-app.mjs <admin|client> --api=<url> [--site=<url>]");
  process.exit(1);
}
const arg = (k, d) => rest.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;

const api = arg("api", "https://api.archerexecutivecar.com/api/v1");
const site = arg("site", "https://archerexecutivecar.com");
if (!/^https:\/\//.test(api)) {
  console.error(`--api must be an https:// address (got "${api}"). Browsers block mixed content.`);
  process.exit(1);
}

const repo = resolve(import.meta.dirname, "..");
const appDir = join(repo, "apps", name);
const out = join(repo, "deploy", name);
const std = join(out, ".next", "standalone");

const run = (cmd, cwd = appDir, env = {}) => execSync(cmd, { stdio: "inherit", cwd, env: { ...process.env, ...env } });

// Standalone output must be on for this build only; the dev config is left untouched.
const cfgPath = join(appDir, "next.config.mjs");
const original = readFileSync(cfgPath, "utf8");
writeFileSync(cfgPath, `/** @type {import('next').NextConfig} */\nexport default { reactStrictMode: true, output: 'standalone' };\n`);

try {
  rmSync(join(appDir, ".next"), { recursive: true, force: true });
  run("npx next build", appDir, {
    NODE_ENV: "production",
    NEXT_PUBLIC_API_BASE_URL: api,
    ...(name === "client" ? { NEXT_PUBLIC_SITE_URL: site } : {}),
  });
} finally {
  writeFileSync(cfgPath, original);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(std, { recursive: true });
cpSync(join(appDir, ".next", "standalone"), std, { recursive: true });
cpSync(join(appDir, ".next", "static"), join(std, ".next", "static"), { recursive: true });
cpSync(join(appDir, ".next", "static"), join(out, ".next", "static"), { recursive: true });
if (existsSync(join(appDir, "public"))) cpSync(join(appDir, "public"), join(std, "public"), { recursive: true });

// Never ship secrets or local env files.
for (const p of [".env", ".env.local", ".env.production"]) rmSync(join(std, p), { force: true });

if (!existsSync(join(std, "server.js"))) throw new Error("server.js missing from standalone output; check outputFileTracingRoot");

writeFileSync(
  join(out, "package.json"),
  JSON.stringify({ name: `archer-${name}`, private: true, scripts: { build: "echo prebuilt", start: "node .next/standalone/server.js" } }, null, 2),
);
writeFileSync(
  join(out, "README.txt"),
  [
    `Archer ${name} (prebuilt)`,
    `Built for API: ${api}`,
    name === "client" ? `Website link: ${site}` : "",
    "",
    "Upload the CONTENTS of this folder (or the zip) to the Node.js app folder on the host.",
    "Start command: npm start   (runs node .next/standalone/server.js)",
    "The host sets PORT; the server reads it. Serve over HTTPS.",
    "To point at a different API address, rebuild with: node tools/package-next-app.mjs " + name + " --api=https://...",
  ].filter(Boolean).join("\n") + "\n",
);

const tar = process.platform === "win32" ? "C:/Windows/System32/tar.exe" : "tar";
const zip = join(repo, "deploy", `archer-${name}.zip`);
rmSync(zip, { force: true });
execSync(`"${tar}" -a -cf "${zip}" .`, { stdio: "inherit", cwd: out });
console.log(`\nPackage ready: ${zip}`);
