"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { isDemoUser } from "./demo-session";
import type {
  Announcement,
  AppUser,
  Approval,
  CaseItem,
  DashboardSummary,
  Meeting,
  Member,
  Programme,
  View
} from "./types";

const demoSummary: DashboardSummary = {
  members: 48,
  pendingApprovals: 3,
  openCases: 7,
  openProgrammes: 5,
  volunteerHours: 320,
  money: { approvedBudget: 12500, expensesPending: 4, grantApplications: 2 }
};

const demoAnnouncements: Announcement[] = [
  { id: "demo-news-1", title: "Food basket programme this Saturday", content: "Members can register and volunteer from 9 AM.", category: "EVENTS" },
  { id: "demo-news-2", title: "Urgent: flood assistance list", content: "Please update affected families before 6 PM.", category: "URGENT" },
  { id: "demo-news-3", title: "Youth skill workshop", content: "Free basic computer class seats are open.", category: "OPPORTUNITIES" }
];

const demoProgrammes: Programme[] = [
  { id: "demo-programme-1", title: "Community Food Aid", description: "Pack and distribute essentials to families.", status: "ACTIVE" },
  { id: "demo-programme-2", title: "Youth Volunteer Day", description: "Clean-up and registration support.", status: "ACTIVE" },
  { id: "demo-programme-3", title: "Senior Help Desk", description: "Assist elderly citizens with forms.", status: "DRAFT" }
];

const demoCases: CaseItem[] = [
  { id: "demo-case-1", title: "Need wheelchair support", status: "IN_REVIEW", assignedTo: { name: "Admin Demo" } },
  { id: "demo-case-2", title: "Food assistance request", status: "OPEN", assignedTo: null }
];

const demoMembers: Member[] = [
  { id: "demo-member-1", name: "Asha Kumar", points: 180, invitedBy: { name: "Member Demo" } },
  { id: "demo-member-2", name: "Lim Wei", points: 150, invitedBy: { name: "Asha Kumar" } },
  { id: "demo-member-3", name: "Nur Aina", points: 130, invitedBy: { name: "Member Demo" } }
];

const demoMeetings: Meeting[] = [
  { id: "demo-meeting-1", title: "Committee planning meeting", startsAt: new Date(Date.now() + 86400000).toISOString() },
  { id: "demo-meeting-2", title: "Monthly approval review", startsAt: new Date(Date.now() + 259200000).toISOString() }
];

const demoApprovals: Approval[] = [
  { id: "demo-approval-1", type: "ANNOUNCEMENT", announcement: { title: "Emergency fund notice" }, event: null },
  { id: "demo-approval-2", type: "EVENT", announcement: null, event: { title: "Youth Sports Day" } }
];

export function useDashboardData(currentUser: AppUser | null, activeView: View) {
  const [notice, setNotice] = useState("Welcome. Choose a task to begin.");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) {
      setSummary(demoSummary);
      setAnnouncements(demoAnnouncements);
      setProgrammes(demoProgrammes);
      setCases(demoCases);
      setMembers(demoMembers);
      setMeetings(demoMeetings);
      setApprovals(demoApprovals);
      setNotice(`Demo mode: using the ${currentUser.role.toLowerCase()} side.`);
      return;
    }

    apiFetch<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) return;

    if (activeView === "news") {
      apiFetch<Announcement[]>("/api/announcements").then(setAnnouncements).catch(() => {});
    }
    if (activeView === "programmes") {
      apiFetch<Programme[]>("/api/programmes").then(setProgrammes).catch(() => {});
    }
    if (activeView === "help") {
      apiFetch<CaseItem[]>("/api/cases").then(setCases).catch(() => {});
    }
    if (activeView === "members") {
      apiFetch<Member[]>("/api/members").then(setMembers).catch(() => {});
    }
    if (activeView === "meetings") {
      apiFetch<Meeting[]>("/api/meetings").then(setMeetings).catch(() => {});
    }
    if (activeView === "admin" && (currentUser.role === "ADMIN" || currentUser.role === "MASTER")) {
      apiFetch<Approval[]>("/api/approvals").then(setApprovals).catch(() => {});
    }
  }, [activeView, currentUser]);

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const description = String(form.get("details") ?? "").trim();
    if (!title) return;

    if (isDemoUser(currentUser)) {
      setCases((current) => [{ id: `demo-case-${Date.now()}`, title, status: "OPEN", assignedTo: null }, ...current]);
      setNotice("Demo: your help request was submitted.");
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<CaseItem>("/api/cases", {
        method: "POST",
        body: JSON.stringify({ title, description })
      });
      setCases((current) => [created, ...current]);
      setNotice("Your help request was submitted.");
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not submit your request.");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const invitedById = String(form.get("invitedById") ?? "") || undefined;
    if (!name || !email) return;

    if (isDemoUser(currentUser)) {
      const inviter = invitedById ? members.find((member) => member.id === invitedById)?.name : currentUser?.name;
      setMembers((current) => [
        { id: `demo-member-${Date.now()}`, name, points: 0, invitedBy: inviter ? { name: inviter } : null },
        ...current
      ]);
      setNotice(`Demo: ${name} was added.`);
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<Member>("/api/members", {
        method: "POST",
        body: JSON.stringify({ name, email, invitedById })
      });
      setMembers((current) => [created, ...current]);
      setNotice(`${created.name} was added.`);
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not add that member.");
    }
  }

  async function sendAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const content = String(form.get("content")).trim();
    const category = String(form.get("category") ?? "EVENTS") as Announcement["category"];
    if (!title || !content) return;

    if (isDemoUser(currentUser)) {
      setAnnouncements((current) => [{ id: `demo-news-${Date.now()}`, title, content, category }, ...current]);
      setNotice("Demo: announcement sent.");
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<Announcement>("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ title, content, category, publishNow: true })
      });
      setAnnouncements((current) => [created, ...current]);
      setNotice("Announcement sent.");
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not send that announcement.");
    }
  }

  async function decideApproval(id: string, status: "APPROVED" | "REJECTED") {
    if (isDemoUser(currentUser)) {
      setApprovals((current) => current.filter((item) => item.id !== id));
      setNotice(status === "APPROVED" ? "Demo: approved." : "Demo: rejected.");
      return;
    }

    try {
      await apiFetch(`/api/approvals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setApprovals((current) => current.filter((item) => item.id !== id));
      setNotice(status === "APPROVED" ? "Approved." : "Rejected.");
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not update that approval.");
    }
  }

  return {
    notice,
    setNotice,
    summary,
    announcements,
    programmes,
    cases,
    members,
    meetings,
    approvals,
    submitCase,
    addMember,
    sendAnnouncement,
    decideApproval
  };
}
