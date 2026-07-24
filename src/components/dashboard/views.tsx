import { FormEvent, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  HeartHandshake,
  Plus,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { roleLabels } from "@/lib/dashboard/content";
import { isDemoUser } from "@/lib/dashboard/demo-session";
import type {
  Announcement,
  AppUser,
  Approval,
  CaseItem,
  DashboardSummary,
  Meeting,
  Member,
  Organisation,
  Programme,
  Role,
  View
} from "@/lib/dashboard/types";
import { getSideDescription, getSideTitle } from "@/lib/dashboard/content";
import { Metric, Panel } from "./primitives";

export function HomeView({
  role,
  summary,
  setActiveView
}: {
  role: Role;
  summary: DashboardSummary | null;
  setActiveView: (view: View) => void;
}) {
  const actions: Array<{ title: string; detail: string; icon: React.ElementType; view: View; roles: Role[] }> = [
    { title: "Read news", detail: "Latest announcements and urgent notices.", icon: Bell, view: "news", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Join programme", detail: "Register for events and volunteer work.", icon: CalendarDays, view: "programmes", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Ask for help", detail: "Submit a case or complaint.", icon: HeartHandshake, view: "help", roles: ["MEMBER", "ADMIN", "MASTER"] },
    { title: "Add member", detail: "Invite a member into your circle.", icon: UserPlus, view: "members", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Review money", detail: "Budgets, grants, expenses, donations.", icon: WalletCards, view: "money", roles: ["PRESIDENT", "ADMIN", "MASTER"] },
    { title: "View reports", detail: "Impact, activity, and government reports.", icon: FileText, view: "reports", roles: ["PRESIDENT", "ADMIN", "MASTER"] }
  ];

  return (
    <>
      <section className="side-summary">
        <div>
          <p className="eyebrow">{roleLabels[role]} side</p>
          <h2>{getSideTitle(role)}</h2>
          <p>{getSideDescription(role)}</p>
        </div>
      </section>
      <section className="quick-grid">
        {actions
          .filter((action) => action.roles.includes(role))
          .map((action) => (
            <button className="quick-action" key={action.title} onClick={() => setActiveView(action.view)}>
              <action.icon size={30} />
              <span>{action.title}</span>
              <small>{action.detail}</small>
            </button>
          ))}
      </section>
      <section className="stats-grid">
        <Metric icon={Users} value={String(summary?.members ?? "-")} label="Active members" />
        <Metric icon={CalendarDays} value={String(summary?.openProgrammes ?? "-")} label="Open programmes" />
        <Metric icon={ClipboardList} value={String(summary?.openCases ?? "-")} label="Open help cases" />
        <Metric icon={CheckCircle2} value={String(summary?.pendingApprovals ?? "-")} label="Waiting approval" />
      </section>
    </>
  );
}

export function NewsView({
  announcements,
  canPost,
  sendAnnouncement
}: {
  announcements: Announcement[];
  canPost: boolean;
  sendAnnouncement: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const badgeClass: Record<Announcement["category"], string> = { EVENTS: "blue", URGENT: "red", OPPORTUNITIES: "gold" };
  const categoryLabel: Record<Announcement["category"], string> = { EVENTS: "Event", URGENT: "Urgent", OPPORTUNITIES: "Opportunity" };

  return (
    <section className="dashboard-grid">
      <Panel title="Latest News">
        {announcements.length === 0 && <p className="meta">No announcements yet.</p>}
        {announcements.map((item) => (
          <div className="row" key={item.id}>
            <div><strong>{item.title}</strong><span className="meta">{item.content}</span></div>
            <span className={`badge ${badgeClass[item.category]}`}>{categoryLabel[item.category]}</span>
          </div>
        ))}
      </Panel>
      {canPost && (
        <Panel title="Send Announcement">
          <form className="stack-form" onSubmit={sendAnnouncement}>
            <label>Title<input name="title" placeholder="Short title" required /></label>
            <label>Message<textarea name="content" placeholder="Write simple announcement" required /></label>
            <label>
              Category
              <select name="category" defaultValue="EVENTS">
                <option value="EVENTS">Event</option>
                <option value="URGENT">Urgent</option>
                <option value="OPPORTUNITIES">Opportunity</option>
              </select>
            </label>
            <button className="button primary" type="submit"><Plus size={18} /> Send to all</button>
          </form>
        </Panel>
      )}
    </section>
  );
}

export function ProgrammesView({ programmes }: { programmes: Programme[] }) {
  return (
    <section className="three-grid">
      {programmes.length === 0 && <p className="meta">No programmes yet.</p>}
      {programmes.map((item) => (
        <div className="card metric" key={item.id}>
          <CalendarDays size={24} color="#236c4a" />
          <div className="small-metric">{item.title}</div>
          <div className="metric-label">{item.description}</div>
          <span className="badge green">{item.status}</span>
        </div>
      ))}
    </section>
  );
}

export function HelpView({
  cases,
  submitCase
}: {
  cases: CaseItem[];
  submitCase: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Ask For Help">
        <form className="stack-form" onSubmit={submitCase}>
          <label>What do you need?<input name="title" placeholder="Example: Need food assistance" required /></label>
          <label>Details<textarea name="details" placeholder="Tell us what happened" /></label>
          <button className="button primary" type="submit"><HeartHandshake size={18} /> Submit request</button>
        </form>
      </Panel>
      <Panel title="Open Cases">
        {cases.length === 0 && <p className="meta">No cases yet.</p>}
        {cases.map((item) => (
          <div className="row" key={item.id}>
            <div><strong>{item.title}</strong><span className="meta">Handled by {item.assignedTo?.name ?? "Unassigned"}</span></div>
            <span className="badge gold">{item.status}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

export function MembersView({
  members,
  canPlaceAnywhere,
  addMember
}: {
  members: Member[];
  canPlaceAnywhere: boolean;
  addMember: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Add Member">
        <form className="stack-form" onSubmit={addMember}>
          <label>New member name<input name="name" placeholder="Full name" required /></label>
          <label>Email<input name="email" type="email" placeholder="member@example.com" required /></label>
          {canPlaceAnywhere && (
            <label>
              Place under
              <select name="invitedById" defaultValue="">
                <option value="">Directly under me</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="button primary" type="submit"><UserPlus size={18} /> Add member</button>
        </form>
      </Panel>
      <Panel title="Member Circle">
        {members.length === 0 && <p className="meta">No members yet.</p>}
        {members.map((member) => (
          <div className="leader-row" key={member.id}>
            <span className="rank">{member.name.slice(0, 1)}</span>
            <strong>{member.name}</strong>
            <span className="meta">{member.invitedBy ? `Under ${member.invitedBy.name}` : "Direct"}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

export function MeetingsView({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className="dashboard-grid">
      <Panel title="Upcoming Meetings">
        {meetings.length === 0 && <p className="meta">No meetings scheduled.</p>}
        {meetings.map((meeting) => (
          <div className="row" key={meeting.id}>
            <strong>{meeting.title}</strong>
            <span className="badge green">{new Date(meeting.startsAt).toLocaleString()}</span>
          </div>
        ))}
      </Panel>
      <Panel title="Meeting Minutes">
        <div className="row"><strong>Upload minutes</strong><span className="meta">Add PDF or document after meeting.</span></div>
        <div className="row"><strong>Attendance</strong><span className="meta">Mark who attended.</span></div>
      </Panel>
    </section>
  );
}

export function MoneyView({ summary }: { summary: DashboardSummary | null }) {
  return (
    <section className="three-grid">
      <Metric icon={WalletCards} value={`RM ${(summary?.money.approvedBudget ?? 0).toLocaleString()}`} label="Approved budget" />
      <Metric icon={FileText} value={String(summary?.money.expensesPending ?? "-")} label="Expenses waiting" />
      <Metric icon={ShieldCheck} value={String(summary?.money.grantApplications ?? "-")} label="Grant applications" />
    </section>
  );
}

export function ReportsView({ summary }: { summary: DashboardSummary | null }) {
  return (
    <section className="three-grid">
      <Metric icon={Users} value={String(summary?.members ?? "-")} label="Members reached" />
      <Metric icon={HeartHandshake} value={String(summary?.volunteerHours ?? "-")} label="Volunteer hours" />
      <Metric icon={Trophy} value={String(summary?.openCases ?? "-")} label="Open help cases" />
    </section>
  );
}

export function AdminView({
  role,
  approvals,
  decideApproval
}: {
  role: Role;
  approvals: Approval[];
  decideApproval: (id: string, status: "APPROVED" | "REJECTED") => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Pending Approvals">
        {approvals.length === 0 && <p className="meta">Nothing waiting for approval.</p>}
        {approvals.map((approval) => (
          <div className="row" key={approval.id}>
            <div>
              <strong>{approval.announcement?.title ?? approval.event?.title ?? approval.type}</strong>
              <span className="meta">{approval.type}</span>
            </div>
            <div className="inline-actions">
              <button className="button" type="button" onClick={() => decideApproval(approval.id, "REJECTED")}>Reject</button>
              <button className="button primary" type="button" onClick={() => decideApproval(approval.id, "APPROVED")}>Approve</button>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="System Setup">
        <div className="row"><strong>Your role</strong><span className="badge green">{roleLabels[role]}</span></div>
        <div className="row"><strong>Organisation profile</strong><span className="meta">Name, registration, committee, contact details.</span></div>
      </Panel>
    </section>
  );
}

export function OrganizationView({ currentUser }: { currentUser: AppUser }) {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isDemoUser(currentUser)) {
      setOrganisation({
        id: "demo-org",
        name: "Demo NGO",
        description: "A sample organisation for exploring the President dashboard.",
        inviteCode: "DEMO-ORG",
        memberCount: 3
      });
      setLoading(false);
      return;
    }

    apiFetch<Organisation>("/api/organisation")
      .then(setOrganisation)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Could not load your organisation."))
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (loading) return <p className="meta">Loading...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!organisation) return null;

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/join/${organisation.inviteCode}` : "";

  function copyLink() {
    if (isDemoUser(currentUser)) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="dashboard-grid">
      <Panel title={organisation.name}>
        <div className="row">
          <div>
            <strong>Description</strong>
            <span className="meta">{organisation.description || "No description yet."}</span>
          </div>
        </div>
        <div className="row">
          <div>
            <strong>Members and Admins</strong>
            <span className="meta">{organisation.memberCount} people in this organisation</span>
          </div>
        </div>
      </Panel>
      <Panel title="Invite link">
        <p className="meta">
          Share this link with people who should join {organisation.name}. Anyone who signs up through it becomes a
          Member or Admin of your organisation only &mdash; they choose which when they sign up.
        </p>
        <div className="composer">
          <input value={inviteLink} readOnly onFocus={(event) => event.currentTarget.select()} />
          <button className="icon-button solid" type="button" onClick={copyLink} aria-label="Copy invite link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </Panel>
    </section>
  );
}
