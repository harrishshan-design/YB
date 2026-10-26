"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ScanLine,
  HandHeart,
  ClipboardList,
  FolderOpen,
  Bell,
  BarChart3,
  Settings,
  CreditCard,
  ShieldCheck,
  Building2,
  UserRound,
  IdCard,
  LogOut,
  Search,
  ChevronDown,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  HelpCircle,
  Globe,
  CheckCircle2,
  PanelLeftClose,
  ArrowRight,
} from "lucide-react";
import { Logo } from "./PublicShell";
import { Avatar, Badge, Empty, date } from "./ui";
import { useAppSession } from "@/lib/dashboard/use-app-session";
import { useWorkspace } from "@/lib/product/use-workspace";
import { getPlan } from "@/lib/product/plans";
import {
  workspaceRoleLabels,
  canManage,
  canProgramme,
  canBill,
  type WorkspaceView,
} from "@/lib/product/types";
import {
  Members,
  Programmes,
  Attendance,
  Volunteers,
  Meetings,
  Tasks,
  Documents,
  Announcements,
  Reports,
  ClubSettings,
  Billing,
  Membership,
  DigitalCard,
  Profile,
  Platform,
} from "./modules";
import type { ModuleProps } from "./modules";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
const menu: {
  group: string;
  items: { id: WorkspaceView; label: string; icon: typeof Users }[];
}[] = [
  {
    group: "",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Organisation",
    items: [
      { id: "members", label: "Members", icon: Users },
      { id: "committee", label: "Committee", icon: ShieldCheck },
      { id: "applications", label: "Applications", icon: UserRound },
    ],
  },
  {
    group: "Activities",
    items: [
      { id: "programmes", label: "Programmes", icon: CalendarDays },
      { id: "attendance", label: "Attendance", icon: ScanLine },
      { id: "volunteers", label: "Volunteers", icon: HandHeart },
    ],
  },
  {
    group: "Management",
    items: [
      { id: "meetings", label: "Meetings", icon: CalendarDays },
      { id: "tasks", label: "Tasks", icon: ClipboardList },
      { id: "documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    group: "Communication",
    items: [{ id: "announcements", label: "Announcements", icon: Bell }],
  },
  {
    group: "Insights",
    items: [{ id: "reports", label: "Reports & impact", icon: BarChart3 }],
  },
  {
    group: "Workspace",
    items: [
      { id: "settings", label: "Organisation settings", icon: Settings },
      { id: "permissions", label: "Roles & permissions", icon: ShieldCheck },
      { id: "branding", label: "Branding", icon: Building2 },
      { id: "billing", label: "Plans & billing", icon: CreditCard },
    ],
  },
];
const memberMenu = [
  { id: "dashboard" as const, label: "Home", icon: LayoutDashboard },
  { id: "settings" as const, label: "My organisation", icon: Building2 },
  { id: "programmes" as const, label: "Programmes", icon: CalendarDays },
  { id: "announcements" as const, label: "Announcements", icon: Bell },
  { id: "membership" as const, label: "My membership", icon: Users },
  { id: "card" as const, label: "My card", icon: IdCard },
  { id: "volunteers" as const, label: "My volunteer hours", icon: HandHeart },
  { id: "profile" as const, label: "Profile", icon: UserRound },
];
const labels: Partial<Record<WorkspaceView, string>> = {
  dashboard: "Dashboard",
  settings: "Organisation settings",
  permissions: "Roles & permissions",
  branding: "Organisation branding",
  billing: "Plans & billing",
  membership: "My membership",
  card: "My digital card",
  profile: "My profile",
  platform: "Platform overview",
  reports: "Reports & impact",
};
export default function WorkspaceApp() {
  const router = useRouter();
  const session = useAppSession();
  const work = useWorkspace(session.currentUser);
  const [view, setView] = useState<WorkspaceView>("dashboard");
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [quickAdd, setQuickAdd] = useState(false);
  const user = session.currentUser;
  const data = work.data;
  const role = data?.club.role ?? "MEMBER";
  const member = role === "MEMBER";
  const selfId = work.demo ? "demo-self" : (user?.id ?? "");
  useEffect(() => {
    if (!session.loading && !user) router.replace("/login");
  }, [session.loading, user, router]);
  function navigate(next: WorkspaceView) {
    setView(next);
    setSearch("");
    setMobile(false);
    history.replaceState(null, "", `?view=${next}`);
  }
  const visibleMenu = member
    ? [{ group: "Your membership", items: memberMenu }]
    : menu
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => {
            if (
              i.id === "permissions" ||
              i.id === "billing" ||
              i.id === "branding"
            )
              return canBill(role);
            if (["members", "applications", "settings"].includes(i.id))
              return canManage(role);
            if (i.id === "committee")
              return canManage(role) || role === "COMMITTEE";
            if (["attendance", "reports"].includes(i.id))
              return canProgramme(role);
            if (i.id === "volunteers") return role !== "COMMITTEE";
            return true;
          }),
        }))
        .filter((g) => g.items.length);
  const allowed = new Set(visibleMenu.flatMap((g) => g.items.map((i) => i.id)));
  if (role === "PLATFORM_ADMIN") allowed.add("platform");
  allowed.add("profile");
  useEffect(() => {
    if (!data) return;
    const query = new URLSearchParams(window.location.search).get(
      "view",
    ) as WorkspaceView;
    if (query && allowed.has(query)) setView(query);
    else if (!allowed.has(view)) setView("dashboard");
  }, [data?.club.id, data?.club.role]);
  if (session.loading || !user)
    return (
      <main className="app-loading">
        <Logo />
        <span className="loading-spinner" />
        Opening your workspace…
      </main>
    );
  const title =
    labels[view] ??
    visibleMenu.flatMap((g) => g.items).find((i) => i.id === view)?.label ??
    "Dashboard";
  const props: ModuleProps = data
    ? {
        data,
        selfId,
        demo: work.demo,
        busy: work.busy,
        error: work.error,
        act: work.act,
        setError: work.setError,
        setNotice: work.setNotice,
        navigate,
        reload: work.reload,
        search,
      }
    : (null as unknown as ModuleProps);
  return (
    <div className={`workspace ${mobile ? "nav-open" : ""}`}>
      <div className="mobile-scrim" onClick={() => setMobile(false)} />
      <aside className="workspace-sidebar">
        <div className="sidebar-logo">
          <Logo />
          <button
            className="icon-btn mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="club-picker">
          <span className="club-avatar">
            {data?.club.logo ? (
              <img src={data.club.logo} alt="" />
            ) : (
              (data?.club.name.slice(0, 2).toUpperCase() ?? "YB")
            )}
          </span>
          <label>
            <strong>{data?.club.name ?? "Organisation workspace"}</strong>
            <select
              aria-label="Active organisation"
              value={work.clubId}
              onChange={(e) => {
                work.switchClub(e.target.value);
                navigate("dashboard");
              }}
            >
              {work.clubs.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/register"
            className="icon-btn"
            aria-label="Create or join an organisation"
            title="Create or join an organisation"
          >
            <Plus size={15} />
          </Link>
          <ChevronDown size={15} />
        </div>
        <nav className="workspace-nav" aria-label="Workspace">
          {role === "PLATFORM_ADMIN" && (
            <button
              onClick={() => navigate("platform")}
              className={view === "platform" ? "selected" : ""}
            >
              <Globe size={19} />
              Platform overview
            </button>
          )}
          {visibleMenu.map((g) => (
            <div className="nav-group" key={g.group}>
              {g.group && <span>{g.group}</span>}
              {g.items.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(i.id)}
                  className={view === i.id ? "selected" : ""}
                >
                  <i.icon size={18} />
                  <span>{i.label}</span>
                  {i.id === "applications" &&
                    !!data?.members.filter((m) => m.status === "PENDING")
                      .length && (
                      <b>
                        {
                          data.members.filter((m) => m.status === "PENDING")
                            .length
                        }
                      </b>
                    )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {data && canBill(role) && (
            <button
              className="plan-sidebar"
              onClick={() => navigate("billing")}
            >
              <span>
                <ShieldCheck size={16} />
                {getPlan(data.subscription.plan).name}
              </span>
              <small>
                {data.subscription.status === "trialing"
                  ? "Your Professional trial"
                  : "Your organisation plan"}
                <ArrowUpRight size={14} />
              </small>
            </button>
          )}
          <Link className="sidebar-help" href="/legal/support">
            <HelpCircle size={17} />
            Help & support <ArrowUpRight size={14} />
          </Link>
          <div className="sidebar-user">
            <button onClick={() => navigate("profile")}>
              <Avatar name={user.name} />
              <span>
                <strong>{user.name}</strong>
                <small>{workspaceRoleLabels[role]}</small>
              </span>
            </button>
            <button
              className="icon-btn"
              title="Log out"
              aria-label="Log out"
              onClick={async () => {
                await session.logout();
                router.push("/login");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>{data?.club.name ?? "Workspace"}</span>
            <span className="crumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="Search workspace"
                placeholder="Search your workspace…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (
                    e.target.value &&
                    !["members", "programmes", "documents"].includes(view)
                  )
                    setView(canManage(role) ? "members" : "programmes");
                }}
              />
            </div>
            <button
              className="icon-btn notification-btn"
              aria-label="Open announcements"
              title="Announcements"
              onClick={() => navigate("announcements")}
            >
              <Bell size={19} />
              <i />
            </button>
            <button
              className="avatar-button"
              aria-label="Open profile"
              onClick={() => navigate("profile")}
            >
              <Avatar name={user.name} />
            </button>
          </div>
        </header>
        {work.demo && (
          <div className="demo-strip">
            <span>
              <span className="demo-dot" /> Demo workspace · Changes stay in
              this browser
            </span>
            <div>
              <button onClick={work.reset}>Reset sample data</button>
              <Link href="/demo">
                Switch role <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}
        <main className="workspace-main">
          <div className="page-heading">
            <div>
              <p className="overline">
                {view === "dashboard"
                  ? date(new Date().toISOString(), {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : data?.club.name}
              </p>
              <h1>
                {view === "dashboard"
                  ? `Welcome back, ${work.demo ? "Aisha" : user.name.split(" ")[0]}.`
                  : title}
              </h1>
              <p>
                {view === "dashboard"
                  ? member
                    ? "A little time. A meaningful difference. Here's what's happening in your community."
                    : "Here's what's happening in your organisation today."
                  : view === "members"
                    ? "Your people, connected and organised."
                    : view === "programmes"
                      ? "Good ideas, brought to life together."
                      : view === "billing"
                        ? "A plan that grows with your organisation."
                        : "Keep your organisation moving forward."}
              </p>
            </div>
            {view === "dashboard" && canProgramme(role) && (
              <button
                className="btn primary"
                onClick={() => {
                  navigate("programmes");
                  setQuickAdd(true);
                }}
              >
                <Plus size={17} />
                Create programme
              </button>
            )}
          </div>
          {work.error && (
            <div className="feedback error" role="alert">
              <span>{work.error}</span>
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => work.setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {work.notice && (
            <div className="feedback success" role="status">
              <CheckCircle2 size={17} />
              {work.notice}
              <button
                className="icon-btn"
                aria-label="Dismiss notification"
                onClick={() => work.setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {work.loading ? (
            <div className="workspace-skeleton">
              <div />
              <div />
              <div />
            </div>
          ) : !data ? (
            <Empty
              title="Workspace unavailable"
              copy={work.error || "Try opening your organisation again."}
            />
          ) : (
            <>
              {view === "dashboard" && <Overview {...props} />}
              {["members", "committee", "applications", "permissions"].includes(
                view,
              ) && <Members {...props} mode={view} />}
              {view === "programmes" && (
                <Programmes
                  {...props}
                  quickAdd={quickAdd}
                  clearQuickAdd={() => setQuickAdd(false)}
                />
              )}
              {view === "attendance" && <Attendance {...props} />}
              {view === "volunteers" && <Volunteers {...props} />}
              {view === "meetings" && <Meetings {...props} />}
              {view === "tasks" && <Tasks {...props} />}
              {view === "documents" && <Documents {...props} />}
              {view === "announcements" && <Announcements {...props} />}
              {view === "reports" && <Reports {...props} />}
              {["settings", "branding"].includes(view) && (
                <ClubSettings {...props} branding={view === "branding"} />
              )}
              {view === "billing" && <Billing {...props} />}
              {view === "membership" && <Membership {...props} />}
              {view === "card" && <DigitalCard {...props} />}
              {view === "profile" && <Profile {...props} />}
              {view === "platform" && <Platform {...props} />}
            </>
          )}
          <footer className="workspace-footer">
            <span>YBNGO · A shared purpose. A shared workspace.</span>
            <Link href="/legal/privacy">
              Privacy & data protection <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Overview(p: ModuleProps) {
  const { data, navigate, selfId } = p;
  const member = data.club.role === "MEMBER";
  const people = data.members;
  const active = people.filter((m) => m.status === "ACTIVE");
  const approved = people.filter(
    (m) => !["PENDING", "REJECTED"].includes(m.status),
  );
  const pending = people.filter((m) => m.status === "PENDING");
  const upcoming = data.programmes
    .filter((p) => p.status === "ACTIVE" && new Date(p.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const entries = member
    ? data.volunteerEntries.filter((v) => v.userId === selfId)
    : data.volunteerEntries;
  const hours = entries.reduce((n, v) => n + v.hours, 0);
  const tasks = data.tasks.filter((t) => t.status !== "DONE");
  const mine = people.find((m) => m.id === selfId);
  const metrics = member
    ? [
        {
          name: "Membership",
          value: mine?.status === "ACTIVE" ? "Active" : "Pending",
          icon: IdCard,
          tone: "mint",
          note: mine?.number ?? "Application received",
        },
        {
          name: "Programmes joined",
          value: data.programmes.filter((p) =>
            p.registrationIds.includes(selfId),
          ).length,
          icon: CalendarDays,
          tone: "blue",
          note: "Your community participation",
        },
        {
          name: "Volunteer hours",
          value: hours,
          icon: HandHeart,
          tone: "peach",
          note: "Thank you for showing up",
        },
      ]
    : [
        {
          name: "Total members",
          value: approved.length,
          icon: Users,
          tone: "mint",
          note: `${pending.length} pending application${pending.length === 1 ? "" : "s"}`,
        },
        {
          name: "Active members",
          value: active.length,
          icon: CheckCircle2,
          tone: "blue",
          note: `${approved.length ? Math.round((active.length / approved.length) * 100) : 0}% of your community`,
        },
        {
          name: "Upcoming programmes",
          value: upcoming.length,
          icon: CalendarDays,
          tone: "peach",
          note: "Opportunities to make a difference",
        },
        {
          name: "Volunteer hours",
          value: hours,
          icon: HandHeart,
          tone: "purple",
          note: "Every hour makes a difference",
        },
        {
          name: "Programmes this year",
          value: data.programmes.filter(
            (programme) =>
              new Date(programme.startsAt).getFullYear() ===
              new Date().getFullYear(),
          ).length,
          icon: BarChart3,
          tone: "blue",
          note: "Your ideas put into action",
        },
        {
          name: "Pending applications",
          value: pending.length,
          icon: Users,
          tone: "peach",
          note: "New people ready to join",
        },
      ];
  const growth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleDateString("en-MY", { month: "short" }),
      members: people.filter(
        (p) =>
          new Date(p.joinedAt) <=
          new Date(d.getFullYear(), d.getMonth() + 1, 0),
      ).length,
    };
  });
  const attendance = data.programmes
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(-5)
    .map((p) => ({
      name: p.title.split(" ").slice(0, 2).join(" "),
      registered: p.registrationIds.length,
      attended: p.attendance.length,
    }));
  return (
    <>
      <div className={`metric-grid ${member ? "three" : "six"}`}>
        {metrics.map((m) => (
          <article className="metric-tile" key={m.name}>
            <div>
              <span>{m.name}</span>
              <span className={`metric-icon ${m.tone}`}>
                <m.icon size={19} />
              </span>
            </div>
            <strong>{m.value}</strong>
            <small>{m.note}</small>
          </article>
        ))}
      </div>
      {!member && data.subscription.status === "trialing" && (
        <div className="trial-banner">
          <span className="feature-icon">
            <HandHeart size={20} />
          </span>
          <div>
            <strong>A little extra room to explore.</strong>
            <p>
              Your Professional trial runs until{" "}
              {date(data.subscription.trialEnd ?? "")}. Try the tools that give
              your team time back.
            </p>
          </div>
          {canBill(data.club.role) && (
            <button className="text-link" onClick={() => navigate("billing")}>
              View your plan <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
      <div className="overview-columns">
        <section className="workspace-section">
          <div className="block-heading">
            <div>
              <h2>Upcoming programmes</h2>
              <p>The next opportunities to get involved.</p>
            </div>
            <button
              className="text-link"
              onClick={() => navigate("programmes")}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {!upcoming.length ? (
            <Empty
              title="A little room for your next idea"
              copy="Create a programme to bring your community together."
            />
          ) : (
            <div className="upcoming-list">
              {upcoming.slice(0, 2).map((item) => (
                <button
                  className="upcoming-item"
                  key={item.id}
                  onClick={() => navigate("programmes")}
                >
                  <img src={item.image} alt="" />
                  <div>
                    <Badge>
                      {item.status === "ACTIVE"
                        ? "Registration open"
                        : item.status}
                    </Badge>
                    <h3>{item.title}</h3>
                    <p>
                      <CalendarDays size={14} />
                      {date(item.startsAt)}
                      <span>·</span>
                      {item.location}
                    </p>
                    <div className="programme-progress">
                      <div>
                        <i
                          style={{
                            width: `${Math.min(100, (item.registrationIds.length / item.capacity) * 100)}%`,
                          }}
                        />
                      </div>
                      <small>
                        {item.registrationIds.length} / {item.capacity}{" "}
                        registered
                      </small>
                    </div>
                  </div>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="workspace-section attention-section">
          <div className="block-heading">
            <div>
              <h2>
                {member ? "Latest announcements" : "Needs your attention"}
              </h2>
              <p>
                {member
                  ? "A note from your organisation."
                  : "A few small steps to keep things moving."}
              </p>
            </div>
            <span className="count-badge">
              {member
                ? data.announcements.length
                : tasks.length + pending.length}
            </span>
          </div>
          {member ? (
            data.announcements.slice(0, 3).map((a) => (
              <button
                className="attention-item"
                key={a.id}
                onClick={() => navigate("announcements")}
              >
                <span className="attention-icon blue">
                  <Bell size={18} />
                </span>
                <span>
                  <strong>{a.title}</strong>
                  <small>{date(a.createdAt)}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))
          ) : (
            <>
              {!!pending.length && (
                <button
                  className="attention-item"
                  onClick={() => navigate("applications")}
                >
                  <span className="attention-icon peach">
                    <Users size={18} />
                  </span>
                  <span>
                    <strong>
                      Review {pending.length} membership application
                    </strong>
                    <small>Help someone join your community</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              )}
              {tasks.slice(0, 3).map((t) => (
                <button
                  className="attention-item"
                  key={t.id}
                  onClick={() => navigate("tasks")}
                >
                  <span className="attention-icon blue">
                    <ClipboardList size={18} />
                  </span>
                  <span>
                    <strong>{t.title}</strong>
                    <small>Due {date(t.dueAt)}</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
              {!tasks.length && !pending.length && (
                <Empty
                  title="All caught up"
                  copy="Your team is ready for what comes next."
                />
              )}
            </>
          )}
        </section>
      </div>
      {!member && (
        <>
          <div className="overview-columns chart-columns">
            <section className="workspace-section">
              <div className="block-heading">
                <div>
                  <h2>Membership growth</h2>
                  <p>More people. More possibilities.</p>
                </div>
                <Badge tone="neutral">Last 6 months</Badge>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={growth}
                    margin={{ left: -25, right: 12, top: 12, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#edf0ee" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#7c8982" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#7c8982" }}
                    />
                    <Tooltip />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="members"
                      stroke="#22775b"
                      fill="#e5f3ec"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="workspace-section">
              <div className="block-heading">
                <div>
                  <h2>Programme attendance</h2>
                  <p>Participation that turns plans into impact.</p>
                </div>
                <div className="chart-legend">
                  <span>
                    <i />
                    Registered
                  </span>
                  <span>
                    <i />
                    Attended
                  </span>
                </div>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attendance}
                    margin={{ left: -25, right: 8, top: 12 }}
                  >
                    <CartesianGrid vertical={false} stroke="#edf0ee" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#7c8982" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#7c8982" }}
                    />
                    <Tooltip />
                    <Bar
                      isAnimationActive={false}
                      dataKey="registered"
                      fill="#b6dcca"
                      radius={[3, 3, 0, 0]}
                      barSize={18}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="attended"
                      fill="#26775a"
                      radius={[3, 3, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <section className="workspace-section activity-section">
            <div className="block-heading">
              <div>
                <h2>Recent activity</h2>
                <p>A shared record of your team's progress.</p>
              </div>
              <button className="text-link" onClick={() => navigate("reports")}>
                View reports <ArrowRight size={15} />
              </button>
            </div>
            {data.audit.slice(0, 4).map((a, i) => (
              <div className="activity-row" key={a.id}>
                <Avatar name={a.actor} index={i} />
                <div>
                  <strong>{a.action}</strong>
                  <small>{a.actor}</small>
                </div>
                <time>{date(a.createdAt)}</time>
              </div>
            ))}
            {!data.audit.length && (
              <Empty
                title="Your story starts here"
                copy="Activity will appear as your team adds records."
              />
            )}
          </section>
        </>
      )}
      {member && (
        <section className="workspace-section">
          <div className="block-heading">
            <h2>Recent participation</h2>
            <button
              className="text-link"
              onClick={() => navigate("membership")}
            >
              My membership <ArrowRight size={15} />
            </button>
          </div>
          {data.programmes
            .filter((p) => p.attendance.some((a) => a.userId === selfId))
            .map((p) => (
              <div className="activity-row" key={p.id}>
                <CheckCircle2 size={20} />
                <div>
                  <strong>{p.title}</strong>
                  <small>{p.location}</small>
                </div>
                <Badge>Attended</Badge>
              </div>
            ))}
        </section>
      )}
    </>
  );
}
