"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
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
    apiFetch<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

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
