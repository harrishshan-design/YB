import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getDb() {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}
