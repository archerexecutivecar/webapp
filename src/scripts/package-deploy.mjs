// Builds a Linux-ready review package: node scripts/package-deploy.mjs
// Output: ../deploy/archer-review/ and ../deploy/archer-review.zip
//
// Layout matches what Hostinger's Next.js preset expects after "npm run build":
//   package.json                (no dependencies, no-op build, start = standalone server)
//   .next/standalone/server.js  (+ node_modules, public, .next/static, db-template)
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "..", "deploy", "archer-review");
const app = join(out, ".next", "standalone");
const run = (cmd, env = {}) =>
  execSync(cmd, { stdio: "inherit", cwd: root, env: { ...process.env, ...env } });

run("npx prisma generate");
run("npx next build");

rmSync(join(root, "..", "deploy"), { recursive: true, force: true });
mkdirSync(app, { recursive: true });
cpSync(join(root, ".next", "standalone"), app, { recursive: true });
cpSync(join(root, ".next", "static"), join(app, ".next", "static"), { recursive: true });
cpSync(join(root, ".next", "static"), join(out, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(app, "public"), { recursive: true });

// Review builds must never be indexed
writeFileSync(join(app, "public", "robots.txt"), "User-agent: *\nDisallow: /\n");

// Never ship local data or secrets
for (const p of ["db", ".env", ".env.local"]) rmSync(join(app, p), { recursive: true, force: true });

// Already built: the host installs nothing and builds nothing
writeFileSync(
  join(out, "package.json"),
  JSON.stringify(
    {
      name: "archer-review",
      private: true,
      scripts: {
        build: "echo prebuilt",
        start: "node .next/standalone/server.js",
      },
    },
    null,
    2
  )
);

// Fresh empty SQLite database with the current schema, shipped as a template
mkdirSync(join(app, "db-template"), { recursive: true });
const tpl = join(app, "db-template", "custom.db");
run("npx prisma db push --skip-generate", { DATABASE_URL: `file:${tpl}` });
if (!existsSync(tpl)) throw new Error("template database was not created");

const tar = process.platform === "win32" ? "C:/Windows/System32/tar.exe" : "tar";
execSync(`"${tar}" -a -cf ../archer-review.zip .`, { stdio: "inherit", cwd: out });
console.log("\nPackage ready:", join(out, "..", "archer-review.zip"));
