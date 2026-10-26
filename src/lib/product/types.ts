import type { PlanId, BillingCycle } from "./plans";
export type WorkspaceRole =
  | "MEMBER"
  | "COMMITTEE"
  | "PROGRAMME_MANAGER"
  | "ADMIN"
  | "OWNER"
  | "PLATFORM_ADMIN";
export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  MEMBER: "Member",
  COMMITTEE: "Committee member",
  PROGRAMME_MANAGER: "Programme manager",
  ADMIN: "Organisation admin",
  OWNER: "Organisation owner",
  PLATFORM_ADMIN: "Platform admin",
};
export type WorkspaceView =
  | "dashboard"
  | "members"
  | "committee"
  | "applications"
  | "programmes"
  | "attendance"
  | "volunteers"
  | "meetings"
  | "tasks"
  | "documents"
  | "announcements"
  | "reports"
  | "settings"
  | "permissions"
  | "branding"
  | "billing"
  | "membership"
  | "card"
  | "profile"
  | "platform";
export type Person = {
  id: string;
  name: string;
  email: string;
  number: string;
  category: string;
  role: WorkspaceRole;
  status: string;
  joinedAt: string;
  expiresAt: string | null;
  invitedById?: string | null;
  hours: number;
  skills: string[];
};
export type ProgrammeItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  image: string;
  objective: string;
  outcomes: string;
  challenges: string;
  recommendations: string;
  expenses: number;
  photos: string[];
  registrationIds: string[];
  attendance: { userId: string; checkedInAt: string; checkedOutAt?: string }[];
};
export type VolunteerEntry = {
  id: string;
  userId: string;
  programmeId: string;
  hours: number;
  date: string;
  description: string;
};
export type TaskItem = {
  id: string;
  title: string;
  programmeId: string;
  assignedTo: string;
  dueAt: string;
  status: string;
};
export type MeetingItem = {
  id: string;
  title: string;
  agenda: string;
  startsAt: string;
  location: string;
  minutes: string;
  status: string;
};
export type DocumentItem = {
  id: string;
  name: string;
  category: string;
  size: number;
  createdAt: string;
  storageKey?: string;
  url?: string;
  status: string;
};
export type NoticeItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  scheduledAt?: string;
  status: string;
};
export type AuditItem = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};
export type SubscriptionInfo = {
  plan: PlanId;
  status: string;
  cycle: BillingCycle;
  periodEnd: string | null;
  trialEnd: string | null;
  graceEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
  storageBytes: number;
  memberUsage?: number;
  providerCustomerId?: string | null;
};
export type Club = {
  id: string;
  parentId?: string | null;
  name: string;
  description: string;
  inviteCode: string;
  type: string;
  state: string;
  registrationNo: string;
  email: string;
  phone: string;
  logo: string;
  role: WorkspaceRole;
};
export type WorkspaceData = {
  club: Club;
  members: Person[];
  programmes: ProgrammeItem[];
  volunteerEntries: VolunteerEntry[];
  tasks: TaskItem[];
  meetings: MeetingItem[];
  documents: DocumentItem[];
  announcements: NoticeItem[];
  audit: AuditItem[];
  subscription: SubscriptionInfo;
  membershipTypes: { name: string; fee: number; duration: number }[];
};
export type Action = { type: string; [key: string]: unknown };
export function canManage(role: WorkspaceRole) {
  return ["OWNER", "ADMIN", "PLATFORM_ADMIN"].includes(role);
}
export function canProgramme(role: WorkspaceRole) {
  return canManage(role) || role === "PROGRAMME_MANAGER";
}
export function canBill(role: WorkspaceRole) {
  return role === "OWNER" || role === "PLATFORM_ADMIN";
}
