import { roleLabels } from "./content";
import type { AppUser, Role } from "./types";

const demoStorageKey = "ybngo.demoUser";

export function createDemoUser(role: Role): AppUser {
  return {
    id: `demo-${role.toLowerCase()}`,
    name: `${roleLabels[role]} Demo`,
    email: `${role.toLowerCase()}@demo.com`,
    role,
    points: role === "MEMBER" ? 120 : 0
  };
}

export function isDemoUser(user: AppUser | null) {
  return Boolean(user?.id.startsWith("demo-"));
}

export function getStoredDemoUser() {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(demoStorageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AppUser;
  } catch {
    window.localStorage.removeItem(demoStorageKey);
    return null;
  }
}

export function storeDemoUser(user: AppUser) {
  window.localStorage.setItem(demoStorageKey, JSON.stringify(user));
}

export function clearDemoUser() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(demoStorageKey);
  }
}
