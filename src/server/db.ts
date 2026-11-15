import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Neon's pooler drops connections that sit idle, and reusing one fails
    // with ETIMEDOUT. Close idle connections first, keep active ones alive,
    // and fail fast instead of hanging when a new one cannot be opened.
    idleTimeoutMillis: 20_000,
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// One client per process. In development, hot reload re-evaluates modules,
// so the instance is parked on globalThis to avoid opening a pool per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
