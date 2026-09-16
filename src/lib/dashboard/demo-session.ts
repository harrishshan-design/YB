import { roleLabels } from "./content";
import type { AppUser, Organisation, Role } from "./types";

const demoStorageKey = "ybngo.demoUser";

export const demoOrganisations: Organisation[] = [
  {
    id: "demo-hh-charity",
    name: "HH Charity",
    description: "Food aid, youth volunteers, and senior citizen assistance.",
    inviteCode: "ORG-HHDEMO",
    memberCount: 48,
    programmeCount: 5,
    caseCount: 7
  },
  {
    id: "demo-youth-club",
    name: "Youth Club",
    description: "Youth leadership, events, volunteer hours, and rewards.",
    inviteCode: "ORG-YOUTH",
    memberCount: 32,
    programmeCount: 3,
    caseCount: 2
  }
];

export function createDemoUser(role: Role): AppUser {
  return {
    id: `demo-${role.toLowerCase()}`,
    name: `${roleLabels[role]} Demo`,
    email: `${role.toLowerCase()}@demo.com`,
    role,
    points: role === "MEMBER" ? 120 : 0,
    organisationId: demoOrganisations[0].id
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
