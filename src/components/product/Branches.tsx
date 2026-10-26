"use client";
import { useEffect, useState } from "react";
import { Plus, Building2 } from "lucide-react";
import type { ModuleProps } from "./modules";
import { Modal, Empty, Badge } from "./ui";
import { workspaceFetch } from "@/lib/product/use-workspace";
import { DEMO_KEY, seedWorkspace } from "@/lib/product/demo";
import { demoOrganisations } from "@/lib/dashboard/demo-session";
type Branch = {
  id: string;
  name: string;
  parentId?: string | null;
  members: number;
  programmes: number;
  status: string;
};
export function Branches(p: ModuleProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [add, setAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (p.data.subscription.plan !== "NETWORK") return;
    if (p.demo) {
      const all =
        JSON.parse(localStorage.getItem("ybngo.demoClubs") ?? "null") ??
        demoOrganisations;
      setBranches(
        all
          .filter(
            (b: { id: string; parentId?: string }) =>
              b.id === p.data.club.id || b.parentId === p.data.club.id,
          )
          .map((b: { id: string; name: string; parentId?: string }) => {
            const stored = JSON.parse(
              localStorage.getItem(`${DEMO_KEY}.${b.id}`) ?? "null",
            );
            return {
              ...b,
              members: stored?.members?.length ?? 0,
              programmes: stored?.programmes?.length ?? 0,
              status: "ACTIVE",
            };
          }),
      );
    } else
      workspaceFetch<Branch[]>(
        `/api/workspace/organisations?organisationId=${p.data.club.id}`,
      )
        .then(setBranches)
        .catch((e) => p.setError(e.message));
  }, [p.data.club.id, p.data.subscription.plan, version]);
  if (p.data.subscription.plan !== "NETWORK")
    return (
      <section className="workspace-section">
        <div className="block-heading">
          <div>
            <h2>One organisation. Every branch.</h2>
            <p>
              Network brings national, state and district workspaces together.
            </p>
          </div>
          <Building2 size={23} />
        </div>
        <button className="text-link" onClick={() => p.navigate("billing")}>
          Explore Network
        </button>
      </section>
    );
  return (
    <section className="workspace-section">
      <div className="block-heading">
        <div>
          <h2>Branch workspaces</h2>
          <p>
            {branches.reduce((s, b) => s + b.members, 0)} memberships ·{" "}
            {branches.reduce((s, b) => s + b.programmes, 0)} programmes across
            this network
          </p>
        </div>
        <button className="btn secondary" onClick={() => setAdd(true)}>
          <Plus size={16} />
          Add branch
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Organisation / branch</th>
              <th>Members</th>
              <th>Programmes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.members}</td>
                <td>{b.programmes}</td>
                <td>
                  <Badge>{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {add && (
        <Modal title="Create a branch workspace" onClose={() => setAdd(false)}>
          <form
            className="product-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setSaving(true);
              try {
                const name = String(form.get("name"));
                if (p.demo) {
                  const id = "demo-" + crypto.randomUUID();
                  const branch = seedWorkspace(id, p.data.club.role);
                  branch.club = {
                    ...branch.club,
                    id,
                    name,
                    parentId: p.data.club.id,
                    state: String(form.get("state")),
                    type: String(form.get("type")),
                  };
                  branch.subscription = { ...p.data.subscription };
                  branch.members = [
                    {
                      ...p.data.members.find((m) => m.id === p.selfId)!,
                      role: "OWNER",
                    },
                  ];
                  branch.programmes = [];
                  branch.tasks = [];
                  branch.meetings = [];
                  branch.documents = [];
                  branch.volunteerEntries = [];
                  branch.announcements = [];
                  branch.audit = [];
                  localStorage.setItem(
                    `${DEMO_KEY}.${id}`,
                    JSON.stringify(branch),
                  );
                  const all =
                    JSON.parse(
                      localStorage.getItem("ybngo.demoClubs") ?? "null",
                    ) ?? demoOrganisations;
                  all.push({
                    id,
                    name,
                    description: "",
                    inviteCode: branch.club.inviteCode,
                    memberCount: 1,
                    parentId: p.data.club.id,
                  });
                  localStorage.setItem("ybngo.demoClubs", JSON.stringify(all));
                  window.dispatchEvent(new Event("ybngo.clubsChanged"));
                } else
                  await workspaceFetch(
                    `/api/workspace/organisations?organisationId=${p.data.club.id}`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        action: "branch",
                        name,
                        state: String(form.get("state")),
                        organisationType: String(form.get("type")),
                      }),
                    },
                  );
                setAdd(false);
                setVersion((v) => v + 1);
                p.setNotice(
                  "Branch created. Its members and programmes have a separate workspace.",
                );
              } catch (error) {
                p.setError(
                  error instanceof Error
                    ? error.message
                    : "Branch couldn't be created.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Branch name
              <input name="name" required minLength={2} />
            </label>
            <label>
              Level
              <select name="type">
                <option>State branch</option>
                <option>District branch</option>
                <option>Local branch</option>
              </select>
            </label>
            <label>
              State
              <input name="state" required defaultValue={p.data.club.state} />
            </label>
            <button className="btn primary" disabled={saving}>
              {saving ? "Creating…" : "Create branch"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
