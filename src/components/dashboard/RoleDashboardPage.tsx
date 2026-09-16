"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { allViews, canManage, roleSlugs } from "@/lib/dashboard/content";
import { demoOrganisations, isDemoUser } from "@/lib/dashboard/demo-session";
import { useAppSession } from "@/lib/dashboard/use-app-session";
import { useDashboardData } from "@/lib/dashboard/use-dashboard-data";
import type { Organisation, Role, View } from "@/lib/dashboard/types";
import { DashboardShell } from "./DashboardShell";
import {
  AdminView,
  HelpView,
  HomeView,
  MeetingsView,
  MembersView,
  MoneyView,
  NewsView,
  OrganizationView,
  ProgrammesView,
  ReportsView
} from "./views";

export function RoleDashboardPage({ role }: { role: Role }) {
  const router = useRouter();
  const { currentUser, loading, configError, logout } = useAppSession();
  const [activeView, setActiveView] = useState<View>("home");
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [activeOrganisationId, setActiveOrganisationId] = useState<string | null>(null);

  const allowedViews = allViews.filter((view) => view.roles.includes(role));
  const data = useDashboardData(currentUser, activeView, activeOrganisationId);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role !== role) {
      router.replace(`/${roleSlugs[currentUser.role]}`);
    }
  }, [loading, currentUser, role, router]);

  useEffect(() => {
    if (!currentUser) return;

    if (isDemoUser(currentUser)) {
      setOrganisations(demoOrganisations);
      setActiveOrganisationId((current) => current ?? currentUser.organisationId ?? demoOrganisations[0].id);
      return;
    }

    apiFetch<Organisation[]>("/api/organisations")
      .then((items) => {
        setOrganisations(items);
        const preferred = currentUser.organisationId && items.some((item) => item.id === currentUser.organisationId)
          ? currentUser.organisationId
          : items[0]?.id ?? null;
        setActiveOrganisationId((current) => current ?? preferred);
      })
      .catch(() => {
        setOrganisations([]);
        setActiveOrganisationId(currentUser.organisationId ?? null);
      });
  }, [currentUser]);

  if (loading) {
    return (
      <main className="login-page">
        <p className="lead">Loading...</p>
      </main>
    );
  }

  if (configError) {
    return (
      <main className="login-page">
        <p className="lead error-text">{configError}</p>
      </main>
    );
  }

  if (!currentUser || currentUser.role !== role) {
    return (
      <main className="login-page">
        <p className="lead">Redirecting...</p>
      </main>
    );
  }

  return (
    <DashboardShell
      user={currentUser}
      views={allowedViews}
      activeView={activeView}
      setActiveView={setActiveView}
      notice={data.notice}
      organisations={organisations}
      activeOrganisationId={activeOrganisationId}
      setActiveOrganisationId={setActiveOrganisationId}
      logout={async () => {
        await logout();
        router.replace("/");
      }}
    >
      {activeView === "home" && <HomeView role={currentUser.role} summary={data.summary} setActiveView={setActiveView} />}
      {activeView === "news" && (
        <NewsView announcements={data.announcements} canPost={canManage(currentUser.role)} sendAnnouncement={data.sendAnnouncement} />
      )}
      {activeView === "programmes" && <ProgrammesView programmes={data.programmes} />}
      {activeView === "help" && <HelpView cases={data.cases} submitCase={data.submitCase} />}
      {activeView === "members" && (
        <MembersView members={data.members} canPlaceAnywhere={canManage(currentUser.role)} addMember={data.addMember} />
      )}
      {activeView === "meetings" && <MeetingsView meetings={data.meetings} />}
      {activeView === "money" && <MoneyView summary={data.summary} />}
      {activeView === "reports" && <ReportsView summary={data.summary} />}
      {activeView === "admin" && <AdminView role={currentUser.role} approvals={data.approvals} decideApproval={data.decideApproval} />}
      {activeView === "organization" && <OrganizationView currentUser={currentUser} organisationId={activeOrganisationId} />}
    </DashboardShell>
  );
}
