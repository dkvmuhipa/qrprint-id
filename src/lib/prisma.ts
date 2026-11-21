import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSqliteConfigured: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Configure SQLite for concurrent reads + writes (eliminates P1008 lock timeouts)
if (!globalForPrisma.prismaSqliteConfigured) {
  globalForPrisma.prismaSqliteConfigured = true;
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .then(() => prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch(() => {
      // Ignore if database is not SQLite or unavailable during build-time prerender
    });
}
