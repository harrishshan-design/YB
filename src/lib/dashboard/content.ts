import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  HeartHandshake,
  Home,
  MessageSquareText,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import type { Role, View } from "./types";

export const roles: Role[] = ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"];

export const roleLabels: Record<Role, string> = {
  MEMBER: "Member",
  PRESIDENT: "President",
  ADMIN: "Admin",
  MASTER: "Master"
};

export const roleSlugs: Record<Role, string> = {
  MEMBER: "member",
  PRESIDENT: "president",
  ADMIN: "admin",
  MASTER: "master"
};

export const demoAccounts: Array<{ email: string; role: Role }> = [
  { email: "member@demo.com", role: "MEMBER" },
  { email: "president@demo.com", role: "PRESIDENT" },
  { email: "admin@demo.com", role: "ADMIN" },
  { email: "master@demo.com", role: "MASTER" }
];

export const allViews: Array<{ id: View; label: string; icon: React.ElementType; roles: Role[] }> = [
  { id: "home", label: "Home", icon: Home, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "news", label: "News", icon: Bell, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "programmes", label: "Programmes", icon: CalendarDays, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "help", label: "Ask For Help", icon: HeartHandshake, roles: ["MEMBER", "ADMIN", "MASTER"] },
  { id: "members", label: "Members", icon: Users, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "meetings", label: "Meetings", icon: MessageSquareText, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "money", label: "Money", icon: WalletCards, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "reports", label: "Reports", icon: FileText, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "admin", label: "Settings", icon: ShieldCheck, roles: ["ADMIN", "MASTER"] },
  { id: "organization", label: "My Organization", icon: Building2, roles: ["PRESIDENT"] }
];

export function canManage(role: Role) {
  return role === "PRESIDENT" || role === "ADMIN" || role === "MASTER";
}

export function getSideTitle(role: Role) {
  const titles: Record<Role, string> = {
    MEMBER: "Simple member area",
    PRESIDENT: "President control area",
    ADMIN: "Operations admin area",
    MASTER: "Master system area"
  };
  return titles[role];
}

export function getSideDescription(role: Role) {
  const descriptions: Record<Role, string> = {
    MEMBER: "Members can read news, join programmes, ask for help, add members under their circle, and check points.",
    PRESIDENT: "The president can manage members, meetings, approvals, reports, money reviews, and committee work.",
    ADMIN: "Admins can run daily operations: members, programmes, help cases, finance, announcements, and settings.",
    MASTER: "The master account can see and control every organisation, user role, setting, report, and access rule."
  };
  return descriptions[role];
}

export function getViewTitle(view: View) {
  const titles: Record<View, string> = {
    home: "What do you want to do today?",
    news: "News and announcements",
    programmes: "Programmes and events",
    help: "Ask for help",
    members: "Members and circles",
    meetings: "Meetings and minutes",
    money: "Money and grants",
    reports: "Reports",
    admin: "Settings and access",
    organization: "My Organization"
  };
  return titles[view];
}

export function getViewDescription(view: View, role: Role) {
  if (view === "home") return `You are signed in as ${roleLabels[role]}. Only your side is shown.`;
  const descriptions: Record<View, string> = {
    home: "",
    news: "Read or send important updates in simple words.",
    programmes: "Join, create, or manage activities and volunteer programmes.",
    help: "Submit cases, complaints, or assistance requests and follow up clearly.",
    members: "Add members and keep a simple member hierarchy.",
    meetings: "Schedule president and committee meetings, upload minutes, and track attendance.",
    money: "Manage budgets, expenses, donations, and grant applications.",
    reports: "See simple impact numbers for members, volunteers, money, and cases.",
    admin: "Control login access, organisation settings, and audit records.",
    organization: "Share your invite link so Members and Admins can join your NGO."
  };
  return descriptions[view];
}
