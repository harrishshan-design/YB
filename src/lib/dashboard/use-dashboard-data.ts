"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { demoOrganisations, isDemoUser } from "./demo-session";
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

function demoSeed(organisationId: string | null) {
  const organisation = demoOrganisations.find((item) => item.id === organisationId) ?? demoOrganisations[0];
  const shortName = organisation.name;

  return {
    summary: {
      members: organisation.memberCount,
      pendingApprovals: shortName === "HH Charity" ? 3 : 1,
      openCases: organisation.caseCount ?? 0,
      openProgrammes: organisation.programmeCount ?? 0,
      volunteerHours: shortName === "HH Charity" ? 320 : 145,
      money: {
        approvedBudget: shortName === "HH Charity" ? 12500 : 6800,
        expensesPending: shortName === "HH Charity" ? 4 : 2,
        grantApplications: shortName === "HH Charity" ? 2 : 1
      }
    },
    announcements: [
      { id: `${organisation.id}-news-1`, title: `${shortName} weekly update`, content: "Latest club news, volunteer tasks, and urgent notices.", category: "EVENTS" as const },
      { id: `${organisation.id}-news-2`, title: "Urgent member check-in", content: "Please update member status before tonight.", category: "URGENT" as const }
    ],
    programmes: [
      { id: `${organisation.id}-programme-1`, title: `${shortName} Food Aid`, description: "Pack and distribute essentials.", status: "ACTIVE" },
      { id: `${organisation.id}-programme-2`, title: "Volunteer Day", description: "Community service and attendance points.", status: "ACTIVE" }
    ],
    cases: [
      { id: `${organisation.id}-case-1`, title: "Assistance request", status: "OPEN", assignedTo: null },
      { id: `${organisation.id}-case-2`, title: "Follow-up visit", status: "IN_REVIEW", assignedTo: { name: "Admin Demo" } }
    ],
    members: [
      { id: `${organisation.id}-member-1`, name: "Asha Kumar", points: 180, invitedBy: { name: "President Demo" } },
      { id: `${organisation.id}-member-2`, name: "Lim Wei", points: 150, invitedBy: { name: "Asha Kumar" } },
      { id: `${organisation.id}-member-3`, name: "Nur Aina", points: 130, invitedBy: { name: "President Demo" } }
    ],
    meetings: [
      { id: `${organisation.id}-meeting-1`, title: `${shortName} committee meeting`, startsAt: new Date(Date.now() + 86400000).toISOString() },
      { id: `${organisation.id}-meeting-2`, title: "Monthly approval review", startsAt: new Date(Date.now() + 259200000).toISOString() }
    ],
    approvals: [
      { id: `${organisation.id}-approval-1`, type: "ANNOUNCEMENT", announcement: { title: `${shortName} public notice` }, event: null },
      { id: `${organisation.id}-approval-2`, type: "EVENT", announcement: null, event: { title: "Volunteer campaign" } }
    ]
  };
}

function scopedPath(path: string, organisationId: string | null) {
  if (!organisationId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}organisationId=${encodeURIComponent(organisationId)}`;
}

export function useDashboardData(currentUser: AppUser | null, activeView: View, organisationId: string | null) {
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
    if (currentUser && isDemoUser(currentUser)) {
      const seed = demoSeed(organisationId);
      setSummary(seed.summary);
      setAnnouncements(seed.announcements);
      setProgrammes(seed.programmes);
      setCases(seed.cases);
      setMembers(seed.members);
      setMeetings(seed.meetings);
      setApprovals(seed.approvals);
      setNotice(`Demo mode: managing ${demoOrganisations.find((item) => item.id === organisationId)?.name ?? "a club"}.`);
      return;
    }

    apiFetch<DashboardSummary>(scopedPath("/api/dashboard/summary", organisationId))
      .then(setSummary)
      .catch(() => {});
  }, [currentUser, organisationId]);

  useEffect(() => {
    if (!currentUser) return;
    if (isDemoUser(currentUser)) return;

    if (activeView === "news") {
      apiFetch<Announcement[]>(scopedPath("/api/announcements", organisationId)).then(setAnnouncements).catch(() => {});
    }
    if (activeView === "programmes") {
      apiFetch<Programme[]>(scopedPath("/api/programmes", organisationId)).then(setProgrammes).catch(() => {});
    }
    if (activeView === "help") {
      apiFetch<CaseItem[]>(scopedPath("/api/cases", organisationId)).then(setCases).catch(() => {});
    }
    if (activeView === "members") {
      apiFetch<Member[]>(scopedPath("/api/members", organisationId)).then(setMembers).catch(() => {});
    }
    if (activeView === "meetings") {
      apiFetch<Meeting[]>(scopedPath("/api/meetings", organisationId)).then(setMeetings).catch(() => {});
    }
    if (activeView === "admin" && (currentUser.role === "ADMIN" || currentUser.role === "MASTER")) {
      apiFetch<Approval[]>(scopedPath("/api/approvals", organisationId)).then(setApprovals).catch(() => {});
    }
  }, [activeView, currentUser, organisationId]);

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const description = String(form.get("details") ?? "").trim();
    if (!title) return;

    if (currentUser && isDemoUser(currentUser)) {
      setCases((current) => [{ id: `demo-case-${Date.now()}`, title, status: "OPEN", assignedTo: null }, ...current]);
      setNotice("Demo: help case submitted inside this club.");
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<CaseItem>(scopedPath("/api/cases", organisationId), {
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
      const demoUser = currentUser as AppUser;
      const inviter = invitedById ? members.find((member) => member.id === invitedById)?.name : demoUser.name;
      setMembers((current) => [{ id: `demo-member-${Date.now()}`, name, points: 0, invitedBy: inviter ? { name: inviter } : null }, ...current]);
      setNotice(`Demo: ${name} was added to this club.`);
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<Member>(scopedPath("/api/members", organisationId), {
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
      setNotice("Demo: announcement sent inside this club.");
      event.currentTarget.reset();
      return;
    }

    try {
      const created = await apiFetch<Announcement>(scopedPath("/api/announcements", organisationId), {
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
      setNotice(status === "APPROVED" ? "Demo: approved for this club." : "Demo: rejected for this club.");
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
