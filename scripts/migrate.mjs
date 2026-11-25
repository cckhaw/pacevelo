// Applies db/migrations over Neon's HTTP driver and prints the full error on
// failure (drizzle-kit's CLI swallows it in CI logs). Used by the deploy workflow.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

try {
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:");
  let current = err;
  while (current) {
    console.error(`- ${current.name ?? "Error"}: ${current.message}`);
    for (const key of ["code", "detail", "hint", "table", "column", "constraint", "severity"]) {
      if (current[key]) console.error(`    ${key}: ${current[key]}`);
    }
    current = current.cause;
  }
  process.exit(1);
}
