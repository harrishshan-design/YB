"use client";

import { LogOut } from "lucide-react";
import { roleLabels } from "@/lib/dashboard/content";
import { getViewDescription, getViewTitle } from "@/lib/dashboard/content";
import type { AppUser, Organisation, View } from "@/lib/dashboard/types";

export function DashboardShell({
  user,
  views,
  activeView,
  setActiveView,
  notice,
  organisations,
  activeOrganisationId,
  setActiveOrganisationId,
  logout,
  children
}: {
  user: AppUser;
  views: Array<{ id: View; label: string; icon: React.ElementType }>;
  activeView: View;
  setActiveView: (view: View) => void;
  notice: string;
  organisations: Organisation[];
  activeOrganisationId: string | null;
  setActiveOrganisationId: (id: string) => void;
  logout: () => void;
  children: React.ReactNode;
}) {
  const activeOrganisation = organisations.find((organisation) => organisation.id === activeOrganisationId);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => setActiveView("home")} aria-label="Open home">
          <div className="brand-mark">YB</div>
          <div>
            <h2 className="brand-title">YB NGO</h2>
            <p className="brand-subtitle">ybngo.my</p>
          </div>
        </button>

        <div className="user-panel">
          <strong>{user.name}</strong>
          <span>{roleLabels[user.role]}</span>
        </div>

        <div className="user-panel">
          <span>Active club</span>
          {organisations.length > 1 ? (
            <select className="sidebar-select" value={activeOrganisationId ?? ""} onChange={(event) => setActiveOrganisationId(event.target.value)}>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>{organisation.name}</option>
              ))}
            </select>
          ) : (
            <strong>{activeOrganisation?.name ?? "No club selected"}</strong>
          )}
        </div>

        <nav className="nav" aria-label="Primary">
          {views.map((view) => (
            <button className={`nav-item ${activeView === view.id ? "active" : ""}`} key={view.id} onClick={() => setActiveView(view.id)}>
              <view.icon size={20} /> {view.label}
            </button>
          ))}
        </nav>

        <button className="sidebar-panel panel-button" onClick={logout}>
          <p className="eyebrow">Account</p>
          <h3><LogOut size={18} /> Logout</h3>
          <p className="brand-subtitle">End this session safely.</p>
        </button>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">{roleLabels[user.role]} dashboard</p>
            <h1>{activeOrganisation ? `${activeOrganisation.name}: ${getViewTitle(activeView)}` : getViewTitle(activeView)}</h1>
            <p className="lead">{getViewDescription(activeView, user.role)}</p>
          </div>
        </div>

        <div className="toast" role="status">{notice}</div>

        {children}
      </section>
    </main>
  );
}
