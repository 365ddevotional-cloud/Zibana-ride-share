import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function prepareDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set, skipping database preparation.");
    return;
  }

  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("backfilling NULL average_rating values before schema push...");
    await pool.query(`UPDATE rider_profiles SET average_rating = 5.00 WHERE average_rating IS NULL`);
    await pool.query(`UPDATE driver_profiles SET average_rating = 5.00 WHERE average_rating IS NULL`);
    console.log("backfill complete.");
  } catch (err) {
    console.warn("backfill warning (non-fatal):", (err as Error).message);
  } finally {
    await pool.end();
  }
}

async function buildAll() {
  await prepareDatabase();

  console.log("pushing database schema...");
  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("database schema push complete.");
  } catch (err) {
    console.warn("db:push warning (non-fatal):", (err as Error).message);
  }

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
