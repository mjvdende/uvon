import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Non-pooling URL is required for Prisma migrations/CLI
    url: process.env["POSTGRES_URL_NON_POOLING"] || process.env["DATABASE_URL"],
  },
});
