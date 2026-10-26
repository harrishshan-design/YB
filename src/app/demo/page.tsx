"use client";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Users,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  Building2,
  Globe,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/product/PublicShell";
import { createDemoUser, storeDemoUser } from "@/lib/dashboard/demo-session";
import type { WorkspaceRole } from "@/lib/product/types";
const options: { role: WorkspaceRole; icon: typeof Users; copy: string }[] = [
  {
    role: "OWNER",
    icon: Building2,
    copy: "Run your club, manage permissions and explore billing.",
  },
  {
    role: "ADMIN",
    icon: ShieldCheck,
    copy: "Manage members, programmes and daily operations.",
  },
  {
    role: "PROGRAMME_MANAGER",
    icon: CalendarDays,
    copy: "Create programmes, record attendance and prepare reports.",
  },
  {
    role: "COMMITTEE",
    icon: ClipboardList,
    copy: "Keep up with meetings, documents and your assigned tasks.",
  },
  {
    role: "MEMBER",
    icon: Users,
    copy: "Join programmes and see your card and volunteer history.",
  },
  {
    role: "PLATFORM_ADMIN",
    icon: Globe,
    copy: "View organisations, subscription mix and platform activity.",
  },
];
const names = {
  OWNER: "Organisation owner",
  ADMIN: "Organisation admin",
  PROGRAMME_MANAGER: "Programme manager",
  COMMITTEE: "Committee member",
  MEMBER: "Member",
  PLATFORM_ADMIN: "YBNGO platform admin",
};
export default function DemoPage() {
  const router = useRouter();
  function enter(role: WorkspaceRole) {
    const global =
      role === "OWNER"
        ? "PRESIDENT"
        : role === "PLATFORM_ADMIN"
          ? "MASTER"
          : role === "ADMIN"
            ? "ADMIN"
            : "MEMBER";
    const user = { ...createDemoUser(global), workspaceRole: role };
    storeDemoUser(user);
    router.push(
      `/${global === "PRESIDENT" ? "president" : global.toLowerCase()}`,
    );
  }
  return (
    <>
      <PublicHeader />
      <main className="public-container public-section demo-page">
        <div className="section-heading centered">
          <p className="overline">Take a look around</p>
          <h1>
            Your community.
            <br />A clearer way to run it.
          </h1>
          <p>
            Choose a role to explore HH Charity's sample workspace. Changes are
            saved in this browser and don't affect a real organisation.
          </p>
        </div>
        <div className="demo-role-grid">
          {options.map((o) => (
            <button
              className="demo-role"
              onClick={() => enter(o.role)}
              key={o.role}
            >
              <span className="feature-icon">
                <o.icon size={24} />
              </span>
              <h2>{names[o.role]}</h2>
              <p>{o.copy}</p>
              <span>
                Open workspace <ArrowRight size={18} />
              </span>
            </button>
          ))}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
