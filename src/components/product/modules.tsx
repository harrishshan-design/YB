"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Papa from "papaparse";
import QRCode from "qrcode";
import {
  Plus,
  Download,
  Upload,
  Search,
  ArrowUpRight,
  ArrowRight,
  Users,
  CalendarDays,
  MapPin,
  Check,
  CheckCircle2,
  ScanLine,
  FileText,
  Trash2,
  Copy,
  HandHeart,
  Mail,
  Clock3,
  ShieldCheck,
  CreditCard,
  Building2,
  Globe,
  RefreshCw,
  Edit3,
  ExternalLink,
  ImagePlus,
} from "lucide-react";
import type {
  Action,
  WorkspaceData,
  WorkspaceView,
  WorkspaceRole,
  ProgrammeItem,
  Person,
} from "@/lib/product/types";
import {
  canManage,
  canProgramme,
  canBill,
  workspaceRoleLabels,
} from "@/lib/product/types";
import { getPlan, plans, type BillingCycle } from "@/lib/product/plans";
import { workspaceFetch } from "@/lib/product/use-workspace";
import {
  defaultReport,
  programmePdf,
  exportCsv,
  downloadFile,
  volunteerCertificate,
  type ReportText,
} from "@/lib/product/export";
import { Branches } from "./Branches";
import {
  DEMO_KEY,
  seedWorkspace,
  resolveSubscription,
} from "@/lib/product/demo";
import { demoOrganisations } from "@/lib/dashboard/demo-session";
import { revenueSummary } from "@/lib/product/revenue";
import { Badge, Empty, Modal, Avatar, date, inputDate, toIso } from "./ui";
export type ModuleProps = {
  data: WorkspaceData;
  selfId: string;
  demo: boolean;
  busy: boolean;
  error?: string;
  act: (a: Action) => Promise<boolean>;
  setError: (s: string) => void;
  setNotice: (s: string) => void;
  navigate: (v: WorkspaceView) => void;
  reload: () => Promise<void>;
  search: string;
};
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
};
function FormModal({
  title,
  fields,
  onClose,
  onSave,
  busy = false,
  error: remoteError = "",
  readOnly = false,
  children,
}: {
  title: string;
  fields: Field[];
  onClose: () => void;
  onSave: (f: FormData) => Promise<boolean>;
  busy?: boolean;
  error?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="product-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            if (await onSave(new FormData(e.currentTarget))) onClose();
            else
              setError(
                "The change could not be saved. Check the workspace notification for details.",
              );
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Please check the fields and try again.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                name={f.name}
                aria-label={f.label}
                defaultValue={f.value}
                required={f.required ?? true}
                rows={4}
              />
            ) : f.options ? (
              <select
                name={f.name}
                aria-label={f.label}
                defaultValue={f.value}
                required={f.required ?? true}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                step={f.type === "number" ? "any" : undefined}
                type={f.type ?? "text"}
                defaultValue={f.value}
                min={f.min}
                max={f.max}
                required={f.required ?? true}
              />
            )}
          </label>
        ))}
        {children}
        {error && (
          <p className="form-error" role="alert">
            {remoteError || error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button
              className="btn primary"
              disabled={busy || saving}
              type="submit"
            >
              {saving ? "Saving…" : "Save changes"}
              <Check size={17} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="module-toolbar">{children}</div>;
}
const str = (f: FormData, key: string) => String(f.get(key) ?? "");
const money = (n: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    n,
  );
const options = (values: string[]) =>
  values.map((v) => ({ value: v, label: v }));
function Gate({
  p,
  title,
  copy,
}: {
  p: ModuleProps;
  title: string;
  copy: string;
}) {
  return (
    <div className="feature-gate">
      <ShieldCheck size={30} />
      <h2>{title}</h2>
      <p>{copy}</p>
      <button
        className="btn primary"
        onClick={() =>
          p.navigate(canBill(p.data.club.role) ? "billing" : "settings")
        }
      >
        View plan <ArrowRight size={17} />
      </button>
    </div>
  );
}

export function Members(p: ModuleProps & { mode: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [add, setAdd] = useState(false);
  const [inspect, setInspect] = useState<Person | null>(null);
  const [membershipEditor, setMembershipEditor] = useState<Person | null>(null);
  const [importRows, setImportRows] = useState<
    { name: string; email: string }[] | null
  >(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const { data, mode } = p;
  const people = data.members
    .filter(
      (m) =>
        (mode !== "applications" || m.status === "PENDING") &&
        (mode !== "committee" ||
          ["OWNER", "ADMIN", "COMMITTEE", "PROGRAMME_MANAGER"].includes(
            m.role,
          )),
    )
    .filter(
      (m) =>
        `${m.name} ${m.email} ${m.number}`
          .toLowerCase()
          .includes((p.search || query).toLowerCase()) &&
        (status === "ALL" || m.status === status),
    );
  const paged = people.slice((page - 1) * 8, page * 8);
  async function readCsv(file: File) {
    Papa.parse<{ name: string; email: string }>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim(),
      complete: (result) => {
        if (
          result.errors.length ||
          !result.meta.fields?.includes("name") ||
          !result.meta.fields.includes("email")
        ) {
          p.setError(
            "Your CSV needs name and email columns. Download the template to get started.",
          );
          return;
        }
        if (result.data.length > 500) {
          p.setError("Import up to 500 members at a time.");
          return;
        }
        const invalid = result.data.find(
          (r) =>
            !r.name?.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email ?? ""),
        );
        if (invalid) {
          p.setError(
            "Check the CSV: every row needs a name and a valid email.",
          );
          return;
        }
        setImportRows(result.data);
        setImportResult("");
      },
    });
  }
  return (
    <>
      <Toolbar>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search members"
            placeholder="Search by name, email or number"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filter member status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All statuses</option>
          {["ACTIVE", "INACTIVE", "PENDING"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <button
          className="btn secondary"
          onClick={() =>
            exportCsv(
              "members.csv",
              people.map((m) => ({
                name: m.name,
                email: m.email,
                membership_number: m.number,
                category: m.category,
                status: m.status,
                role: workspaceRoleLabels[m.role],
                joined: date(m.joinedAt),
              })),
            )
          }
        >
          <Download size={16} />
          Export
        </button>
        {canManage(data.club.role) && mode !== "permissions" && (
          <>
            <label className="btn secondary file-btn">
              <Upload size={16} />
              Import CSV
              <input
                aria-label="Import member CSV"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (data.subscription.plan === "COMMUNITY") {
                    p.setError(
                      "CSV import is included in Organisation. View plans for more capacity.",
                    );
                    return;
                  }
                  const file = e.target.files?.[0];
                  if (file) void readCsv(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button className="btn primary" onClick={() => setAdd(true)}>
              <Plus size={17} />
              Add member
            </button>
          </>
        )}
      </Toolbar>
      <div className="workspace-section directory">
        <div className="block-heading">
          <div>
            <h2>
              {mode === "applications"
                ? "Membership applications"
                : mode === "committee"
                  ? "Your committee"
                  : mode === "permissions"
                    ? "Team permissions"
                    : "Member directory"}{" "}
              <span className="count-badge">{people.length}</span>
            </h2>
            <p>
              {mode === "permissions"
                ? "Only the organisation owner can assign staff access."
                : "The people behind your organisation."}
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Membership no.</th>
                <th>{mode === "permissions" ? "Permission" : "Category"}</th>
                <th>Status</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((m, i) => (
                <tr key={m.id}>
                  <td>
                    <button
                      className="person-cell"
                      onClick={() => setInspect(m)}
                    >
                      <Avatar name={m.name} index={i} />
                      <span>
                        <strong>{m.name}</strong>
                        <small>{m.email}</small>
                      </span>
                    </button>
                  </td>
                  <td>{m.number}</td>
                  <td>
                    {mode === "permissions" &&
                    canBill(data.club.role) &&
                    m.id !== p.selfId ? (
                      <select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        onChange={(e) =>
                          void p.act({
                            type: "member.role",
                            id: m.id,
                            role: e.target.value,
                          })
                        }
                        disabled={m.role === "OWNER"}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="COMMITTEE">Committee member</option>
                        <option value="PROGRAMME_MANAGER">
                          Programme manager
                        </option>
                        <option value="ADMIN">Organisation admin</option>
                        {m.role === "OWNER" && (
                          <option value="OWNER">Owner</option>
                        )}
                      </select>
                    ) : mode === "permissions" ? (
                      workspaceRoleLabels[m.role]
                    ) : (
                      m.category
                    )}
                  </td>
                  <td>
                    <Badge>{m.status}</Badge>
                  </td>
                  <td>{date(m.joinedAt)}</td>
                  <td>
                    {mode === "applications" ? (
                      <div className="row-actions">
                        <button
                          className="btn primary small"
                          disabled={p.busy}
                          onClick={() =>
                            void p.act({
                              type: "member.status",
                              id: m.id,
                              status: "ACTIVE",
                            })
                          }
                        >
                          <Check size={15} />
                          Approve
                        </button>
                        <button
                          className="text-link danger"
                          onClick={() =>
                            void p.act({
                              type: "member.status",
                              id: m.id,
                              status: "REJECTED",
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        className="icon-btn"
                        aria-label={`View ${m.name}`}
                        title="View member"
                        onClick={() => setInspect(m)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!people.length && (
          <Empty
            title={
              mode === "applications"
                ? "All applications reviewed"
                : "No members found"
            }
            copy="Try another search or add a member to get started."
          />
        )}
        <div className="table-pagination">
          <span>
            Showing {people.length ? (page - 1) * 8 + 1 : 0}–
            {Math.min(page * 8, people.length)} of {people.length}
          </span>
          <div>
            <button
              className="btn secondary small"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="btn secondary small"
              disabled={page * 8 >= people.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {add && (
        <FormModal
          error={p.error}
          title="Add a member"
          onClose={() => setAdd(false)}
          busy={p.busy}
          fields={[
            { name: "name", label: "Full name" },
            { name: "email", label: "Email", type: "email" },
            {
              name: "category",
              label: "Membership type",
              options: options(data.membershipTypes.map((t) => t.name)),
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "member.add",
              name: str(f, "name"),
              email: str(f, "email"),
              category: str(f, "category"),
            })
          }
        />
      )}
      {inspect && (
        <Modal title="Member profile" onClose={() => setInspect(null)}>
          <div className="member-profile-head">
            <Avatar name={inspect.name} />
            <h3>{inspect.name}</h3>
            <Badge>{inspect.status}</Badge>
          </div>
          <dl className="detail-list">
            <dt>Membership number</dt>
            <dd>{inspect.number}</dd>
            <dt>Email</dt>
            <dd>{inspect.email}</dd>
            <dt>Member category</dt>
            <dd>{inspect.category}</dd>
            <dt>Role</dt>
            <dd>{workspaceRoleLabels[inspect.role]}</dd>
            <dt>Joined</dt>
            <dd>{date(inspect.joinedAt)}</dd>
            <dt>Expires</dt>
            <dd>
              {inspect.expiresAt ? date(inspect.expiresAt) : "No expiry set"}
            </dd>
            <dt>Introduced by</dt>
            <dd>
              {data.members.find((m) => m.id === inspect.invitedById)?.name ??
                "Organisation"}
            </dd>
          </dl>
          {canManage(data.club.role) && (
            <button
              className="btn secondary"
              onClick={() => {
                setMembershipEditor(inspect);
                setInspect(null);
              }}
            >
              <Edit3 size={16} />
              Edit membership
            </button>
          )}
          {canManage(data.club.role) &&
            inspect.id !== p.selfId &&
            inspect.role !== "OWNER" && (
              <button
                className="btn secondary"
                onClick={async () => {
                  if (
                    await p.act({
                      type: "member.status",
                      id: inspect.id,
                      status:
                        inspect.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                    })
                  )
                    setInspect(null);
                }}
              >
                {inspect.status === "ACTIVE"
                  ? "Mark inactive"
                  : "Activate membership"}
              </button>
            )}
        </Modal>
      )}
      {membershipEditor && (
        <FormModal
          error={p.error}
          title="Edit membership"
          onClose={() => setMembershipEditor(null)}
          fields={[
            {
              name: "category",
              label: "Membership type",
              value: membershipEditor.category,
              options: options(data.membershipTypes.map((t) => t.name)),
            },
            {
              name: "expiresAt",
              label: "Expiry date (leave empty for no expiry)",
              type: "date",
              value: membershipEditor.expiresAt?.slice(0, 10) ?? "",
              required: false,
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "membership.update",
              id: membershipEditor.id,
              category: str(f, "category"),
              expiresAt: f.get("expiresAt") ? toIso(f.get("expiresAt")) : "",
            })
          }
        />
      )}
      {importRows && (
        <Modal
          title="Import member CSV"
          onClose={() => {
            if (!importing) setImportRows(null);
          }}
        >
          <p>
            {importRows.length} valid rows are ready to import into{" "}
            {data.club.name}.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importResult && <p role="status">{importResult}</p>}
          <button
            className="btn primary"
            disabled={importing || !!importResult}
            onClick={async () => {
              setImporting(true);
              let added = 0;
              for (const row of importRows) {
                if (
                  await p.act({
                    type: "member.add",
                    name: row.name.trim(),
                    email: row.email.trim(),
                    category: "Ordinary Member",
                  })
                )
                  added++;
              }
              setImportResult(
                `${added} members imported. ${importRows.length - added} rows skipped. Existing records were kept.`,
              );
              setImporting(false);
            }}
          >
            Import members <Upload size={16} />
          </button>
        </Modal>
      )}
      <p className="module-footnote">
        <button
          className="text-link"
          onClick={() =>
            exportCsv("member-import-template.csv", [
              { name: "Your member name", email: "member@example.com" },
            ])
          }
        >
          <Download size={14} />
          Download CSV template
        </button>
      </p>
    </>
  );
}

export function Programmes(
  p: ModuleProps & { quickAdd?: boolean; clearQuickAdd?: () => void },
) {
  const [filter, setFilter] = useState("ALL");
  const [editor, setEditor] = useState<ProgrammeItem | null | "new">(null);
  const [detail, setDetail] = useState<ProgrammeItem | null>(null);
  useEffect(() => {
    if (p.quickAdd) {
      setEditor("new");
      p.clearQuickAdd?.();
    }
  }, [p.quickAdd]);
  const managing = canProgramme(p.data.club.role);
  const list = p.data.programmes.filter(
    (e) =>
      (filter === "ALL" || e.status === filter) &&
      e.title.toLowerCase().includes(p.search.toLowerCase()),
  );
  const current = editor && editor !== "new" ? editor : null;
  return (
    <>
      <Toolbar>
        <div className="filter-tabs" role="group" aria-label="Programme status">
          {["ALL", "ACTIVE", "COMPLETED", "DRAFT"]
            .filter((s) => s !== "DRAFT" || managing)
            .map((s) => (
              <button
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
                key={s}
              >
                {s === "ALL"
                  ? "All programmes"
                  : s === "ACTIVE"
                    ? "Upcoming"
                    : s === "COMPLETED"
                      ? "Completed"
                      : "Drafts"}
              </button>
            ))}
        </div>
        <div className="toolbar-spacer" />
        {managing && (
          <button className="btn primary" onClick={() => setEditor("new")}>
            <Plus size={16} />
            Create programme
          </button>
        )}
      </Toolbar>
      <div className="programme-grid">
        {list.map((item) => (
          <article className="programme-card" key={item.id}>
            <button
              className="programme-image"
              onClick={() => setDetail(item)}
              aria-label={`View ${item.title}`}
            >
              <img src={item.image} alt="Community programme" />
              <Badge>{item.status}</Badge>
            </button>
            <div className="programme-card-body">
              <small className="programme-date">
                <CalendarDays size={14} />
                {date(item.startsAt)}
              </small>
              <button className="plain-title" onClick={() => setDetail(item)}>
                <h2>{item.title}</h2>
              </button>
              <p>{item.description}</p>
              <small className="programme-location">
                <MapPin size={14} />
                {item.location}
              </small>
              <div className="programme-progress">
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, (item.registrationIds.length / item.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {item.registrationIds.length} / {item.capacity} registered
                </small>
              </div>
              <div className="programme-card-actions">
                {managing ? (
                  <>
                    <button
                      className="btn secondary small"
                      onClick={() => setEditor(item)}
                    >
                      <Edit3 size={15} />
                      Manage
                    </button>
                    <button
                      className="text-link"
                      onClick={() => p.navigate("attendance")}
                    >
                      Attendance <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    className={`btn ${item.registrationIds.includes(p.selfId) ? "secondary" : "primary"}`}
                    disabled={p.busy || item.status !== "ACTIVE"}
                    onClick={() =>
                      void p.act({ type: "register", id: item.id })
                    }
                  >
                    {item.status !== "ACTIVE"
                      ? "Registration closed"
                      : item.registrationIds.includes(p.selfId)
                        ? "Cancel registration"
                        : "Join programme"}
                    {item.registrationIds.includes(p.selfId) ? (
                      <Check size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <Empty
          title="Make space for your next programme"
          copy="Your organisation's activities will appear here."
        />
      )}
      {editor && (
        <FormModal
          error={p.error}
          title={current ? "Manage programme" : "Create programme"}
          onClose={() => setEditor(null)}
          busy={p.busy}
          fields={[
            { name: "title", label: "Programme name", value: current?.title },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              value: current?.description,
            },
            {
              name: "objective",
              label: "Objective",
              type: "textarea",
              required: false,
              value: current?.objective,
            },
            { name: "location", label: "Location", value: current?.location },
            {
              name: "startsAt",
              label: "Start date and time",
              type: "datetime-local",
              value: inputDate(current?.startsAt),
            },
            {
              name: "endsAt",
              label: "End date and time",
              type: "datetime-local",
              value: inputDate(
                current?.endsAt ??
                  new Date(Date.now() + 4 * 3600000).toISOString(),
              ),
            },
            {
              name: "capacity",
              label: "Participant limit",
              type: "number",
              value: current?.capacity ?? 60,
              min: 1,
            },
            {
              name: "status",
              label: "Status",
              value: current?.status ?? "ACTIVE",
              options: options(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]),
            },
            {
              name: "outcomes",
              label: "Outcomes",
              type: "textarea",
              value: current?.outcomes,
              required: false,
            },
            {
              name: "expenses",
              label: "Total expenses (RM)",
              type: "number",
              value: current?.expenses ?? 0,
              min: 0,
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "programme.save",
              id: current?.id,
              title: str(f, "title"),
              description: str(f, "description"),
              objective: str(f, "objective"),
              location: str(f, "location"),
              startsAt: toIso(f.get("startsAt")),
              endsAt: toIso(f.get("endsAt")),
              capacity: Number(f.get("capacity")),
              status: str(f, "status"),
              outcomes: str(f, "outcomes"),
              challenges: current?.challenges ?? "",
              recommendations: current?.recommendations ?? "",
              expenses: Number(f.get("expenses")),
            })
          }
        />
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide>
          <img
            className="programme-detail-image"
            src={detail.image}
            alt="Community programme"
          />
          <p>{detail.description}</p>
          <dl className="detail-list">
            <dt>Date</dt>
            <dd>{date(detail.startsAt)}</dd>
            <dt>Location</dt>
            <dd>{detail.location}</dd>
            <dt>Registered</dt>
            <dd>
              {detail.registrationIds.length} / {detail.capacity}
            </dd>
            <dt>Attended</dt>
            <dd>{detail.attendance.length}</dd>
            <dt>Objective</dt>
            <dd>{detail.objective || "Not recorded"}</dd>
          </dl>
          {managing && (
            <>
              <h3>Programme photos</h3>
              <div className="photo-grid">
                {detail.photos.map((photo, i) => (
                  <img src={photo} key={i} alt={`Programme photo ${i + 1}`} />
                ))}
              </div>
              <label className="btn secondary file-btn">
                <ImagePlus size={17} />
                Upload programme photo
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await upload(p, file, "Programme photos", detail.id);
                      setDetail(null);
                    } catch (error) {
                      p.setError(
                        error instanceof Error
                          ? error.message
                          : "Photo upload failed.",
                      );
                    }
                  }}
                />
              </label>
              <div className="form-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    setDetail(null);
                    p.navigate("reports");
                  }}
                >
                  <FileText size={16} />
                  Prepare report
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

export function Attendance(p: ModuleProps) {
  const [programmeId, setProgrammeId] = useState(
    p.data.programmes[0]?.id ?? "",
  );
  const [person, setPerson] = useState(
    p.data.members.find((m) => m.status === "ACTIVE")?.id ?? "",
  );
  const [qr, setQr] = useState("");
  const [link, setLink] = useState("");
  const programme = p.data.programmes.find((e) => e.id === programmeId);
  async function generate() {
    if (p.data.subscription.plan === "COMMUNITY") {
      p.setError(
        "QR Attendance is available on Organisation for RM39/month. Manual attendance remains available.",
      );
      return;
    }
    try {
      let url: string;
      if (p.demo)
        url = `${location.origin}/check-in?demo=1&club=${p.data.club.id}&programme=${programmeId}`;
      else
        url = (
          await workspaceFetch<{ url: string }>(
            `/api/workspace/qr?organisationId=${p.data.club.id}&kind=attendance&id=${programmeId}`,
          )
        ).url;
      setLink(url);
      setQr(
        await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: { dark: "#173f32", light: "#ffffff" },
        }),
      );
    } catch (error) {
      p.setError(
        error instanceof Error ? error.message : "Could not create QR.",
      );
    }
  }
  return (
    <>
      <Toolbar>
        <select
          aria-label="Select programme for attendance"
          value={programmeId}
          onChange={(e) => {
            setProgrammeId(e.target.value);
            setQr("");
          }}
        >
          {p.data.programmes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <button
          className="btn secondary"
          onClick={() =>
            exportCsv(
              "attendance.csv",
              (programme?.attendance ?? []).map((a) => ({
                member:
                  p.data.members.find((m) => m.id === a.userId)?.name ??
                  "Member",
                checked_in: a.checkedInAt,
                checked_out: a.checkedOutAt ?? "",
              })),
            )
          }
        >
          <Download size={16} />
          Export attendance
        </button>
        <button
          className="btn primary"
          disabled={!programme}
          onClick={generate}
        >
          <ScanLine size={17} />
          Programme QR
        </button>
      </Toolbar>
      {programme ? (
        <>
          <div className="attendance-summary">
            <span>
              <strong>{programme.attendance.length}</strong> checked in
            </span>
            <span>
              <strong>{programme.registrationIds.length}</strong> registered
            </span>
            <span>
              <strong>
                {programme.registrationIds.length
                  ? Math.round(
                      (programme.attendance.length /
                        programme.registrationIds.length) *
                        100,
                    )
                  : 0}
                %
              </strong>{" "}
              attendance
            </span>
          </div>
          <section className="workspace-section">
            <div className="block-heading">
              <div>
                <h2>Record attendance</h2>
                <p>{programme.title}</p>
              </div>
              <Badge tone="neutral">Manual check-in</Badge>
            </div>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                void p.act({
                  type: "attendance.mark",
                  programmeId,
                  userId: person,
                });
              }}
            >
              <label>
                Member
                <select
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  required
                >
                  {p.data.members
                    .filter((m) => m.status === "ACTIVE")
                    .map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.name} · {m.number}
                      </option>
                    ))}
                </select>
              </label>
              <button className="btn primary" disabled={p.busy || !person}>
                <CheckCircle2 size={17} />
                Check in member
              </button>
            </form>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Membership no.</th>
                    <th>Checked in</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {programme.attendance.map((a) => {
                    const m = p.data.members.find((m) => m.id === a.userId);
                    return (
                      <tr key={a.userId}>
                        <td>{m?.name ?? "Member"}</td>
                        <td>{m?.number ?? "—"}</td>
                        <td>
                          {new Date(a.checkedInAt).toLocaleString("en-MY")}
                        </td>
                        <td>
                          <Badge>Present</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!programme.attendance.length && (
              <Empty
                title="Ready for your first participant"
                copy="Scan the programme QR or add a member manually."
              />
            )}
          </section>
        </>
      ) : (
        <Empty title="Create a programme first" />
      )}
      {qr && (
        <Modal title="Programme check-in" onClose={() => setQr("")}>
          <div className="qr-panel">
            <h3>{programme?.title}</h3>
            <img src={qr} alt="Scan to open programme check-in" />
            <p>Members scan this code and confirm their check-in.</p>
            <a
              className="text-link"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              Open check-in page <ExternalLink size={15} />
            </a>
            <button
              className="btn secondary"
              onClick={() => {
                const a = document.createElement("a");
                a.href = qr;
                a.download = "programme-check-in.png";
                a.click();
              }}
            >
              <Download size={16} />
              Download QR
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Volunteers(p: ModuleProps) {
  const [add, setAdd] = useState(false);
  const manage = canProgramme(p.data.club.role);
  const entries = manage
    ? p.data.volunteerEntries
    : p.data.volunteerEntries.filter((v) => v.userId === p.selfId);
  const total = entries.reduce((n, e) => n + e.hours, 0);
  if (p.data.subscription.plan === "COMMUNITY")
    return (
      <Gate
        p={p}
        title="Give every contribution credit"
        copy="Volunteer management is available on the Organisation plan. Record service hours and connect contributions to programmes."
      />
    );
  return (
    <>
      <Toolbar>
        <span className="toolbar-description">
          {total} hours contributed ·{" "}
          {new Set(entries.map((e) => e.userId)).size} volunteers
        </span>
        <div className="toolbar-spacer" />
        <button
          className="btn secondary"
          onClick={() =>
            exportCsv(
              "volunteer-hours.csv",
              entries.map((e) => ({
                member:
                  p.data.members.find((m) => m.id === e.userId)?.name ??
                  "Volunteer",
                programme: p.data.programmes.find((x) => x.id === e.programmeId)
                  ?.title,
                hours: e.hours,
                date: e.date,
                contribution: e.description,
              })),
            )
          }
        >
          <Download size={16} />
          Export hours
        </button>
        {["PROFESSIONAL", "NETWORK"].includes(p.data.subscription.plan) && (
          <button
            className="btn secondary"
            onClick={() =>
              volunteerCertificate(p.data, p.selfId).catch((e) =>
                p.setError(e.message),
              )
            }
          >
            <ShieldCheck size={16} />
            My certificate
          </button>
        )}
        <button className="btn primary" onClick={() => setAdd(true)}>
          <Plus size={16} />
          Log volunteer hours
        </button>
      </Toolbar>
      <section className="workspace-section">
        <div className="block-heading">
          <div>
            <h2>Every hour counts</h2>
            <p>Your community's time, recognised.</p>
          </div>
          <span className="metric-icon peach">
            <HandHeart size={24} />
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Programme</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    {p.data.members.find((m) => m.id === e.userId)?.name ??
                      "Volunteer"}
                  </td>
                  <td>
                    {p.data.programmes.find((x) => x.id === e.programmeId)
                      ?.title ?? "Programme"}
                  </td>
                  <td>{date(e.date)}</td>
                  <td>
                    <strong>{e.hours} h</strong>
                  </td>
                  <td>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!entries.length && (
          <Empty
            title="Your contribution starts here"
            copy="Log service hours after your next programme."
          />
        )}
      </section>
      {add && (
        <FormModal
          error={p.error}
          title="Log volunteer hours"
          onClose={() => setAdd(false)}
          fields={[
            ...(manage
              ? [
                  {
                    name: "userId",
                    label: "Volunteer",
                    options: p.data.members
                      .filter((m) => m.status === "ACTIVE")
                      .map((m) => ({ value: m.id, label: m.name })),
                  },
                ]
              : []),
            {
              name: "programmeId",
              label: "Programme",
              options: p.data.programmes.map((e) => ({
                value: e.id,
                label: e.title,
              })),
            },
            {
              name: "date",
              label: "Service date",
              type: "date",
              value: new Date().toISOString().slice(0, 10),
            },
            {
              name: "hours",
              label: "Hours contributed",
              type: "number",
              value: 1,
              min: 0.25,
              max: 24,
            },
            { name: "description", label: "Contribution", type: "textarea" },
          ]}
          onSave={(f) =>
            p.act({
              type: manage ? "volunteer.add" : "volunteer.self",
              userId: manage ? str(f, "userId") : p.selfId,
              programmeId: str(f, "programmeId"),
              date: toIso(f.get("date")),
              hours: Number(f.get("hours")),
              description: str(f, "description"),
            })
          }
        />
      )}
    </>
  );
}

export function Tasks(p: ModuleProps) {
  const [add, setAdd] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const list = p.data.tasks.filter((t) => showDone || t.status !== "DONE");
  return (
    <>
      <Toolbar>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          Show completed
        </label>
        <div className="toolbar-spacer" />
        {canProgramme(p.data.club.role) && (
          <button className="btn primary" onClick={() => setAdd(true)}>
            <Plus size={16} />
            Add task
          </button>
        )}
      </Toolbar>
      <section className="workspace-section task-list">
        {list.map((t) => (
          <div className="task-row" key={t.id}>
            <input
              type="checkbox"
              aria-label={`Complete ${t.title}`}
              checked={t.status === "DONE"}
              disabled={
                p.busy ||
                (!canManage(p.data.club.role) && t.assignedTo !== p.selfId)
              }
              onChange={() => void p.act({ type: "task.toggle", id: t.id })}
            />
            <div>
              <strong>{t.title}</strong>
              <small>
                {p.data.programmes.find((e) => e.id === t.programmeId)?.title}
              </small>
            </div>
            <span>
              {p.data.members.find((m) => m.id === t.assignedTo)?.name ??
                "Assigned member"}
            </span>
            <span>{date(t.dueAt)}</span>
            <Badge>{t.status.replaceAll("_", " ")}</Badge>
          </div>
        ))}
        {!list.length && (
          <Empty
            title="All caught up"
            copy="Your completed work leaves room for what comes next."
          />
        )}
      </section>
      {add && (
        <FormModal
          error={p.error}
          title="Add a task"
          onClose={() => setAdd(false)}
          fields={[
            { name: "title", label: "Task" },
            {
              name: "programmeId",
              label: "Programme",
              options: p.data.programmes.map((e) => ({
                value: e.id,
                label: e.title,
              })),
            },
            {
              name: "assignedTo",
              label: "Assign to",
              options: p.data.members.map((m) => ({
                value: m.id,
                label: m.name,
              })),
            },
            {
              name: "dueAt",
              label: "Due date",
              type: "date",
              value: new Date().toISOString().slice(0, 10),
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "task.save",
              title: str(f, "title"),
              programmeId: str(f, "programmeId"),
              assignedTo: str(f, "assignedTo"),
              dueAt: toIso(f.get("dueAt")),
            })
          }
        />
      )}
    </>
  );
}

export function Meetings(p: ModuleProps) {
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<
    WorkspaceData["meetings"][number] | null
  >(null);
  return (
    <>
      <Toolbar>
        <span className="toolbar-description">
          A shared record for your committee.
        </span>
        <div className="toolbar-spacer" />
        {canManage(p.data.club.role) && (
          <button className="btn primary" onClick={() => setAdd(true)}>
            <Plus size={16} />
            Schedule meeting
          </button>
        )}
      </Toolbar>
      <section className="workspace-section">
        {p.data.meetings.map((m) => (
          <button
            className="meeting-row"
            key={m.id}
            onClick={() => setSelected(m)}
          >
            <span className="calendar-tile">
              <b>{new Date(m.startsAt).getDate()}</b>
              {new Date(m.startsAt).toLocaleDateString("en-MY", {
                month: "short",
              })}
            </span>
            <div>
              <h3>{m.title}</h3>
              <p>{m.location}</p>
              <small>
                {new Date(m.startsAt).toLocaleTimeString("en-MY", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
            </div>
            <Badge>{m.status}</Badge>
            <ArrowUpRight size={18} />
          </button>
        ))}
        {!p.data.meetings.length && (
          <Empty
            title="Your next committee meeting"
            copy="Schedule a meeting and keep the agenda and minutes together."
          />
        )}
      </section>
      {add && (
        <FormModal
          error={p.error}
          title="Schedule a meeting"
          onClose={() => setAdd(false)}
          fields={[
            { name: "title", label: "Meeting title" },
            { name: "agenda", label: "Agenda", type: "textarea" },
            {
              name: "startsAt",
              label: "Date and time",
              type: "datetime-local",
              value: inputDate(),
            },
            { name: "location", label: "Location or meeting link" },
          ]}
          onSave={(f) =>
            p.act({
              type: "meeting.save",
              title: str(f, "title"),
              agenda: str(f, "agenda"),
              startsAt: toIso(f.get("startsAt")),
              location: str(f, "location"),
            })
          }
        />
      )}{" "}
      {selected && (
        <FormModal
          error={p.error}
          title={selected.title}
          readOnly={!canManage(p.data.club.role)}
          onClose={() => setSelected(null)}
          fields={
            canManage(p.data.club.role)
              ? [
                  {
                    name: "minutes",
                    label: "Meeting minutes & resolutions",
                    type: "textarea",
                    value: selected.minutes,
                  },
                ]
              : []
          }
          onSave={(f) =>
            p.act({
              type: "meeting.minutes",
              id: selected.id,
              minutes: str(f, "minutes"),
            })
          }
        >
          <h3>Agenda</h3>
          <p className="pre-wrap">{selected.agenda}</p>
          {!canManage(p.data.club.role) && (
            <p className="pre-wrap">
              {selected.minutes || "Minutes have not been recorded yet."}
            </p>
          )}
        </FormModal>
      )}
    </>
  );
}

export async function upload(
  p: ModuleProps,
  file: File,
  category: string,
  programmeId?: string,
) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a file smaller than 10 MB.");
  if (p.demo) {
    if (file.size > 1500000)
      throw new Error("For the browser demo, choose a file under 1.5 MB.");
    const content = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const ok = await p.act({
      type: programmeId ? "programme.photo" : "document.add",
      programmeId,
      name: file.name,
      size: file.size,
      category,
      url: content,
    });
    if (!ok) throw new Error("Upload couldn't be saved.");
  } else {
    const form = new FormData();
    form.set("file", file);
    form.set("category", category);
    if (programmeId) form.set("programmeId", programmeId);
    const { data } = await import("@/lib/supabase/client").then((m) =>
      m.getSupabaseBrowserClient().auth.getSession(),
    );
    const response = await fetch(
      `/api/workspace/files?organisationId=${p.data.club.id}`,
      {
        method: "POST",
        body: form,
        headers: data.session
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {},
      },
    );
    if (!response.ok)
      throw new Error((await response.json()).message ?? "Upload failed.");
    await p.reload();
  }
  p.setNotice("File saved to your organisation.");
}
export function Documents(p: ModuleProps) {
  const [category, setCategory] = useState("All documents");
  const list = p.data.documents.filter(
    (d) =>
      (category === "All documents" || d.category === category) &&
      d.name.toLowerCase().includes(p.search.toLowerCase()),
  );
  async function open(d: WorkspaceData["documents"][number]) {
    try {
      if (p.demo) {
        if (d.url) downloadFile(d.name, await (await fetch(d.url)).blob());
        else
          downloadFile(
            d.name + ".txt",
            `${p.data.club.name}\n${d.name}\nSample document for the YBNGO demo.`,
          );
        return;
      }
      const result = await workspaceFetch<{ url: string }>(
        `/api/workspace/files?organisationId=${p.data.club.id}&id=${d.id}`,
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      p.setError(
        error instanceof Error ? error.message : "Couldn't open the document.",
      );
    }
  }
  return (
    <>
      <Toolbar>
        <select
          aria-label="Document category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {[
            "All documents",
            ...new Set(p.data.documents.map((d) => d.category)),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        {canManage(p.data.club.role) && (
          <label className="btn primary file-btn">
            <Upload size={16} />
            Upload document
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await upload(
                    p,
                    file,
                    category === "All documents" ? "General" : category,
                  );
                } catch (error) {
                  p.setError(
                    error instanceof Error ? error.message : "Upload failed.",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        )}
      </Toolbar>
      <section className="workspace-section">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Size</th>
                <th>Added</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>
                    <button className="text-link" onClick={() => void open(d)}>
                      <FileText size={18} />
                      {d.name}
                    </button>
                  </td>
                  <td>{d.category}</td>
                  <td>
                    {d.size ? `${(d.size / 1024).toFixed(0)} KB` : "Sample"}
                  </td>
                  <td>{date(d.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        onClick={() => void open(d)}
                        aria-label={`Download ${d.name}`}
                        title="Download"
                      >
                        <Download size={17} />
                      </button>
                      {canManage(p.data.club.role) && (
                        <button
                          className="icon-btn danger"
                          onClick={() =>
                            void p.act({ type: "document.delete", id: d.id })
                          }
                          aria-label={`Archive ${d.name}`}
                          title="Archive document"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="Your organisation's library"
            copy="Upload records and keep important documents together."
          />
        )}
      </section>
    </>
  );
}

export function Announcements(p: ModuleProps) {
  const [add, setAdd] = useState(false);
  const list = p.data.announcements.filter(
    (a) =>
      canManage(p.data.club.role) ||
      (a.status === "PUBLISHED" &&
        (!a.scheduledAt || new Date(a.scheduledAt) <= new Date())),
  );
  return (
    <>
      <Toolbar>
        <span className="toolbar-description">
          Keep your people in the loop.
        </span>
        <div className="toolbar-spacer" />
        {canManage(p.data.club.role) && (
          <button className="btn primary" onClick={() => setAdd(true)}>
            <Plus size={16} />
            New announcement
          </button>
        )}
      </Toolbar>
      <div className="announcement-feed">
        {list.map((a) => (
          <article className="workspace-section announcement" key={a.id}>
            <div>
              <Badge
                tone={
                  a.category === "URGENT"
                    ? "red"
                    : a.category === "EVENTS"
                      ? "blue"
                      : "peach"
                }
              >
                {a.category}
              </Badge>
              <time>{date(a.scheduledAt || a.createdAt)}</time>
              {a.status === "SCHEDULED" && <Badge>Scheduled</Badge>}
            </div>
            <h2>{a.title}</h2>
            <p className="pre-wrap">{a.content}</p>
            <small>{p.data.club.name} · Organisation notice</small>
          </article>
        ))}
      </div>
      {!list.length && (
        <Empty
          title="No announcements yet"
          copy="Important updates from your organisation will appear here."
        />
      )}
      {add && (
        <FormModal
          error={p.error}
          title="New announcement"
          onClose={() => setAdd(false)}
          fields={[
            { name: "title", label: "Title" },
            { name: "content", label: "Message", type: "textarea" },
            {
              name: "category",
              label: "Category",
              options: options(["EVENTS", "URGENT", "OPPORTUNITIES"]),
            },
            ...(["PROFESSIONAL", "NETWORK"].includes(p.data.subscription.plan)
              ? [
                  {
                    name: "scheduledAt",
                    label: "Schedule for (optional)",
                    type: "datetime-local",
                    required: false,
                  },
                ]
              : []),
          ]}
          onSave={(f) =>
            p.act({
              type: "announcement.save",
              title: str(f, "title"),
              content: str(f, "content"),
              category: str(f, "category"),
              scheduledAt: f.get("scheduledAt")
                ? toIso(f.get("scheduledAt"))
                : "",
            })
          }
        />
      )}
    </>
  );
}

export function Reports(p: ModuleProps) {
  const [tab, setTab] = useState("Programmes");
  const [selected, setSelected] = useState(
    p.data.programmes.find((p) => p.status === "COMPLETED")?.id ??
      p.data.programmes[0]?.id ??
      "",
  );
  const programme = p.data.programmes.find((p) => p.id === selected);
  const [text, setText] = useState<ReportText | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (programme) setText(defaultReport(p.data, programme));
    setPreview("");
  }, [selected, p.data.club.id]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function generate(download: boolean) {
    if (!programme || !text) return;
    if (p.data.subscription.plan === "COMMUNITY") {
      p.setError(
        "Programme PDF reports are available on Organisation. You can export CSV reports on Community.",
      );
      return;
    }
    setGenerating(true);
    try {
      if (!(await p.act({ type: "report.save", id: programme.id }))) return;
      const pdf = await programmePdf(p.data, programme, text, download);
      if (!download) setPreview(URL.createObjectURL(pdf.output("blob")));
      p.setNotice(
        download
          ? "Your programme report has been downloaded."
          : "Report ready. Review it before downloading.",
      );
    } catch (error) {
      p.setError(
        error instanceof Error
          ? error.message
          : "Couldn't generate the report.",
      );
    } finally {
      setGenerating(false);
    }
  }
  function csv() {
    if (tab === "Membership")
      exportCsv(
        "membership-report.csv",
        p.data.members.map((m) => ({
          name: m.name,
          number: m.number,
          status: m.status,
          category: m.category,
        })),
      );
    else if (tab === "Volunteers")
      exportCsv(
        "volunteer-report.csv",
        p.data.volunteerEntries.map((v) => ({
          volunteer: p.data.members.find((m) => m.id === v.userId)?.name,
          hours: v.hours,
          date: v.date,
          programme: p.data.programmes.find((p) => p.id === v.programmeId)
            ?.title,
        })),
      );
    else
      exportCsv(
        "programme-report.csv",
        p.data.programmes.map((e) => ({
          programme: e.title,
          registered: e.registrationIds.length,
          attended: e.attendance.length,
          status: e.status,
          expenses: e.expenses,
        })),
      );
  }
  return (
    <>
      <Toolbar>
        <div className="filter-tabs" role="group" aria-label="Report type">
          {["Programmes", "Membership", "Volunteers", "Impact"].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn secondary" onClick={csv}>
          <Download size={16} />
          Export CSV
        </button>
      </Toolbar>
      {tab === "Programmes" ? (
        <div className="report-workspace">
          <section className="workspace-section">
            <div className="block-heading">
              <div>
                <h2>Official programme report</h2>
                <p>Edit the details, then generate your PDF.</p>
              </div>
              <FileText size={22} />
            </div>
            <label className="product-label">
              Programme
              <select
                value={selected}
                aria-label="Programme"
                onChange={(e) => setSelected(e.target.value)}
              >
                {p.data.programmes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            {text && (
              <div className="product-form report-editor">
                {(Object.keys(text) as (keyof ReportText)[]).map((key) => (
                  <label key={key}>
                    {
                      {
                        overview: "Programme overview",
                        objectives: "Objectives",
                        activities: "Activities conducted",
                        outcomes: "Outcomes",
                        challenges: "Challenges",
                        recommendations: "Recommendations",
                        preparedBy: "Prepared by",
                        approvedBy: "Approved by",
                      }[key]
                    }
                    {["preparedBy", "approvedBy"].includes(key) ? (
                      <input
                        aria-label={
                          key === "preparedBy" ? "Prepared by" : "Approved by"
                        }
                        value={text[key]}
                        onChange={(e) => {
                          setText({ ...text, [key]: e.target.value });
                          setPreview("");
                        }}
                      />
                    ) : (
                      <textarea
                        aria-label={
                          {
                            overview: "Programme overview",
                            objectives: "Objectives",
                            activities: "Activities conducted",
                            outcomes: "Outcomes",
                            challenges: "Challenges",
                            recommendations: "Recommendations",
                            preparedBy: "Prepared by",
                            approvedBy: "Approved by",
                          }[key]
                        }
                        rows={3}
                        value={text[key]}
                        onChange={(e) => {
                          setText({ ...text, [key]: e.target.value });
                          setPreview("");
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button
                className="btn secondary"
                disabled={generating || !programme}
                onClick={() => void generate(false)}
              >
                <RefreshCw size={16} />
                {preview ? "Regenerate" : "Generate PDF"}
              </button>
              <button
                className="btn primary"
                disabled={generating || !programme}
                onClick={() => void generate(true)}
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </section>
          <section className="report-preview">
            {preview ? (
              <iframe title="Programme report PDF preview" src={preview} />
            ) : (
              <div>
                <div className="report-paper mini">
                  <div className="paper-head">
                    <HandHeart size={23} />
                    <span>
                      {p.data.club.name}
                      <small>OFFICIAL PROGRAMME REPORT</small>
                    </span>
                  </div>
                  <h3>{programme?.title ?? "Your next programme"}</h3>
                  <p>
                    {date(programme?.startsAt ?? "")} · {programme?.location}
                  </p>
                  <img
                    src={programme?.image ?? "/images/food-aid.jpg"}
                    alt="Programme preview"
                  />
                  <div className="paper-stats">
                    <span>
                      <b>{programme?.registrationIds.length ?? 0}</b>Registered
                    </span>
                    <span>
                      <b>{programme?.attendance.length ?? 0}</b>Attended
                    </span>
                    <span>
                      <b>
                        {p.data.volunteerEntries
                          .filter((v) => v.programmeId === selected)
                          .reduce((n, v) => n + v.hours, 0)}
                      </b>
                      Hours
                    </span>
                  </div>
                  <div className="paper-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <p className="muted center-note">
                  Generate your PDF to review the full report.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="workspace-section">
          <div className="block-heading">
            <div>
              <h2>{tab} report</h2>
              <p>Records from {p.data.club.name}.</p>
            </div>
          </div>
          <div className="impact-totals">
            <div>
              <strong>
                {p.data.members.filter((m) => m.status === "ACTIVE").length}
              </strong>
              <span>Active members</span>
            </div>
            <div>
              <strong>
                {
                  p.data.programmes.filter((e) => e.status === "COMPLETED")
                    .length
                }
              </strong>
              <span>Completed programmes</span>
            </div>
            <div>
              <strong>
                {p.data.volunteerEntries.reduce((n, v) => n + v.hours, 0)}
              </strong>
              <span>Volunteer hours</span>
            </div>
            <div>
              <strong>
                {p.data.programmes.reduce((n, e) => n + e.attendance.length, 0)}
              </strong>
              <span>Participants attended</span>
            </div>
          </div>
          <h3>Organisation audit log</h3>
          {p.data.audit.map((a) => (
            <div className="activity-row" key={a.id}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{a.action}</strong>
                <small>{a.actor}</small>
              </div>
              <time>{date(a.createdAt)}</time>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export function ClubSettings(p: ModuleProps & { branding?: boolean }) {
  const [edit, setEdit] = useState(false);
  const [type, setType] = useState(false);
  const { club } = p.data;
  const link =
    typeof window !== "undefined"
      ? `${location.origin}/join/${club.inviteCode}`
      : "";
  return (
    <>
      <section className="workspace-section">
        <div className="block-heading">
          <div>
            <h2>{p.branding ? "Make this workspace yours" : club.name}</h2>
            <p>{club.description}</p>
          </div>
          {canManage(club.role) && (
            <button className="btn secondary" onClick={() => setEdit(true)}>
              <Edit3 size={16} />
              Edit organisation
            </button>
          )}
        </div>
        <dl className="detail-list">
          <dt>Organisation type</dt>
          <dd>{club.type}</dd>
          <dt>State</dt>
          <dd>{club.state || "Not set"}</dd>
          <dt>Registration no.</dt>
          <dd>{club.registrationNo || "Not set"}</dd>
          <dt>Contact email</dt>
          <dd>{club.email || "Not set"}</dd>
          <dt>Phone</dt>
          <dd>{club.phone || "Not set"}</dd>
        </dl>
        {p.branding && canBill(club.role) && (
          <label className="btn secondary file-btn">
            <ImagePlus size={16} />
            Upload organisation logo
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 250000) {
                  p.setError("Choose a logo smaller than 250 KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  void p.act({
                    ...club,
                    type: "organisation.save",
                    organisationType: club.type,
                    logo: String(reader.result),
                  });
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}
      </section>
      {canManage(club.role) && (
        <>
          <section className="workspace-section">
            <div className="block-heading">
              <div>
                <h2>Invite your community</h2>
                <p>
                  New members request to join. Your team approves their
                  applications.
                </p>
              </div>
            </div>
            <div className="copy-link">
              <input
                aria-label="Organisation invite link"
                value={link}
                readOnly
              />
              <button
                className="btn primary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(link)
                    .then(() => p.setNotice("Invite link copied."))
                    .catch(() =>
                      p.setError("Select the link and copy it from the field."),
                    )
                }
              >
                <Copy size={16} />
                Copy link
              </button>
            </div>
          </section>
          <section className="workspace-section">
            <div className="block-heading">
              <div>
                <h2>Membership types</h2>
                <p>Keep membership fees and renewal periods clear.</p>
              </div>
              <button className="btn secondary" onClick={() => setType(true)}>
                <Plus size={16} />
                Add type
              </button>
            </div>
            {p.data.membershipTypes.map((t) => (
              <div className="settings-row" key={t.name}>
                <strong>{t.name}</strong>
                <span>{money(t.fee)}</span>
                <span>{t.duration ? `${t.duration} months` : "Lifetime"}</span>
              </div>
            ))}
          </section>
        </>
      )}
      {canBill(club.role) && <Branches {...p} />}
      {edit && (
        <FormModal
          error={p.error}
          title="Organisation details"
          onClose={() => setEdit(false)}
          fields={[
            { name: "name", label: "Organisation name", value: club.name },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              value: club.description,
            },
            {
              name: "email",
              label: "Contact email",
              type: "email",
              value: club.email,
            },
            {
              name: "phone",
              label: "Phone",
              value: club.phone,
              required: false,
            },
            { name: "state", label: "State", value: club.state },
            {
              name: "organisationType",
              label: "Organisation type",
              value: club.type,
            },
            {
              name: "registrationNo",
              label: "Registration number",
              value: club.registrationNo,
              required: false,
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "organisation.save",
              ...Object.fromEntries(f),
              logo: club.logo,
            })
          }
        />
      )}{" "}
      {type && (
        <FormModal
          error={p.error}
          title="Membership type"
          onClose={() => setType(false)}
          fields={[
            { name: "name", label: "Type name" },
            {
              name: "fee",
              label: "Membership fee (RM)",
              type: "number",
              value: 0,
              min: 0,
            },
            {
              name: "duration",
              label: "Duration in months (0 for lifetime)",
              type: "number",
              value: 12,
              min: 0,
            },
          ]}
          onSave={(f) =>
            p.act({
              type: "membership.type",
              name: str(f, "name"),
              fee: Number(f.get("fee")),
              duration: Number(f.get("duration")),
            })
          }
        />
      )}
    </>
  );
}

export function Billing(p: ModuleProps) {
  const [cycle, setCycle] = useState<BillingCycle>(p.data.subscription.cycle);
  const [cancel, setCancel] = useState(false);
  const [working, setWorking] = useState(false);
  const [invoices, setInvoices] = useState(false);
  const plan = getPlan(p.data.subscription.plan);
  const used =
    p.data.subscription.memberUsage ??
    p.data.members.filter((m) => !["PENDING", "REJECTED"].includes(m.status))
      .length;
  async function provider(action: string, planId?: string) {
    setWorking(true);
    try {
      if (p.demo) {
        if (action === "invoices") {
          setInvoices(true);
          return;
        }
        if (action === "portal") {
          p.setNotice(
            "This demo uses sample billing. Choose a plan below to preview its capacity. No payment details are collected.",
          );
          return;
        }
        await p.act({
          type: action === "cancel" ? "billing.cancel" : "billing.plan",
          plan: planId ?? plan.id,
          cycle,
        });
        p.setNotice(
          action === "cancel"
            ? "Demo cancellation scheduled. Existing data stays available."
            : "Demo plan updated. No payment was taken.",
        );
        return;
      }
      const result = await workspaceFetch<{ url?: string; message?: string }>(
        `/api/billing?organisationId=${p.data.club.id}`,
        {
          method: "POST",
          body: JSON.stringify({ action, plan: planId, cycle }),
        },
      );
      if (result.url) location.assign(result.url);
      else {
        p.setNotice(result.message ?? "Billing updated.");
        await p.reload();
      }
    } catch (e) {
      p.setError(
        e instanceof Error ? e.message : "Billing couldn't be opened.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      {invoices && (
        <Modal title="Invoices" onClose={() => setInvoices(false)}>
          <Empty
            title="No invoices yet"
            copy="The demo trial is free. Paid invoices will appear in your billing account after a real subscription is connected."
          />
        </Modal>
      )}
      <section className="workspace-section current-plan">
        <div className="block-heading">
          <div>
            <p className="overline">Your current plan</p>
            <h2>
              {plan.name} <Badge>{p.data.subscription.status}</Badge>
            </h2>
            <p>
              {p.data.subscription.status === "trialing"
                ? `Your free trial ends ${date(p.data.subscription.trialEnd ?? "")}.`
                : `${money(plan.monthly)} / month · ${p.data.subscription.cycle} billing`}
            </p>
          </div>
          <button
            className="btn secondary"
            disabled={working}
            onClick={() => void provider("portal")}
          >
            <CreditCard size={16} />
            Manage billing
          </button>
        </div>
        <div className="billing-usage">
          <div>
            <span>
              Member usage{" "}
              <strong>
                {used} / {plan.members.toLocaleString()}
              </strong>
            </span>
            <progress max={plan.members} value={used} />
          </div>
          <div>
            <span>
              Storage usage{" "}
              <strong>
                {(p.data.subscription.storageBytes / 1e9).toFixed(2)} /{" "}
                {plan.storage} GB
              </strong>
            </span>
            <progress
              max={plan.storage * 1e9}
              value={p.data.subscription.storageBytes}
            />
          </div>
          <div>
            <span>Next billing date</span>
            <strong>{date(p.data.subscription.periodEnd ?? "")}</strong>
            <small>
              {p.data.subscription.cancelAtPeriodEnd
                ? "Cancellation scheduled"
                : "Your records stay with your organisation"}
            </small>
          </div>
        </div>
        {used >= plan.members * 0.9 && (
          <p className="gentle-notice">
            You're using {used} of your {plan.members} available member slots.
            Choose a larger plan whenever you need more room.
          </p>
        )}
        {["past_due", "grace_period"].includes(p.data.subscription.status) && (
          <p className="gentle-notice">
            We couldn't process your latest payment. Update your billing
            information to keep premium features active during your seven-day
            grace period.
          </p>
        )}
        <div className="row-actions">
          <button
            className="text-link"
            onClick={() => void provider("invoices")}
          >
            View invoices <ExternalLink size={14} />
          </button>
          <button
            className="text-link danger"
            disabled={p.data.subscription.cancelAtPeriodEnd}
            onClick={() => setCancel(true)}
          >
            Cancel subscription
          </button>
        </div>
      </section>
      <div
        className="billing-toggle"
        role="group"
        aria-label="Subscription billing cycle"
      >
        <button
          aria-pressed={cycle === "monthly"}
          onClick={() => setCycle("monthly")}
        >
          Monthly
        </button>
        <button
          aria-pressed={cycle === "yearly"}
          onClick={() => setCycle("yearly")}
        >
          Yearly <span>2 months free</span>
        </button>
      </div>
      <div className="pricing-grid workspace-pricing">
        {plans.map((item) => (
          <article
            className={`pricing-card ${item.id === "ORGANISATION" ? "popular" : ""}`}
            key={item.id}
          >
            {item.id === "ORGANISATION" && (
              <span className="popular-label">Most popular</span>
            )}
            <h3>{item.name}</h3>
            <p>{item.tagline}</p>
            <div className="plan-price">
              <small>RM</small>
              {cycle === "yearly" ? item.yearly : item.monthly}
              <span>
                /{cycle === "yearly" && item.monthly ? "year" : "month"}
              </span>
            </div>
            <button
              className={`btn ${item.id === plan.id ? "secondary" : "primary"}`}
              disabled={
                working ||
                (item.id === plan.id && cycle === p.data.subscription.cycle)
              }
              onClick={() =>
                void provider(
                  item.id === "COMMUNITY" ? "cancel" : "checkout",
                  item.id,
                )
              }
            >
              {item.id === plan.id
                ? "Current plan"
                : item.id === "COMMUNITY"
                  ? "Return to Community"
                  : `Choose ${item.name}`}
            </button>
            <ul className="check-list">
              {item.features.map((f) => (
                <li key={f}>
                  <Check size={15} />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="center-note">
        Your organisation's data is never deleted because of a plan change or
        failed payment.
      </p>
      {cancel && (
        <Modal
          title="Cancel your subscription?"
          onClose={() => setCancel(false)}
        >
          <p>
            Premium access continues until{" "}
            {date(p.data.subscription.periodEnd ?? "")}. Your organisation will
            then return to Community and existing records will remain available.
          </p>
          <div className="form-actions">
            <button className="btn secondary" onClick={() => setCancel(false)}>
              Keep subscription
            </button>
            <button
              className="btn primary"
              disabled={working}
              onClick={async () => {
                await provider("cancel");
                setCancel(false);
              }}
            >
              Schedule cancellation
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Membership(p: ModuleProps) {
  const m = p.data.members.find((m) => m.id === p.selfId);
  return (
    <>
      <section className="workspace-section">
        <div className="block-heading">
          <h2>Your place in {p.data.club.name}</h2>
          <Badge>{m?.status ?? "PENDING"}</Badge>
        </div>
        <dl className="detail-list">
          <dt>Membership number</dt>
          <dd>{m?.number ?? "Awaiting approval"}</dd>
          <dt>Membership type</dt>
          <dd>{m?.category ?? "Ordinary Member"}</dd>
          <dt>Joined</dt>
          <dd>{date(m?.joinedAt ?? "")}</dd>
          <dt>Expires</dt>
          <dd>{m?.expiresAt ? date(m.expiresAt) : "No expiry set"}</dd>
          <dt>Volunteer hours</dt>
          <dd>
            {p.data.volunteerEntries
              .filter((v) => v.userId === p.selfId)
              .reduce((n, v) => n + v.hours, 0)}{" "}
            hours
          </dd>
        </dl>
        <button className="btn primary" onClick={() => p.navigate("card")}>
          <ShieldCheck size={16} />
          View my digital card
        </button>
      </section>
      <section className="workspace-section">
        <div className="block-heading">
          <h2>Programme history</h2>
        </div>
        {p.data.programmes
          .filter(
            (e) =>
              e.registrationIds.includes(p.selfId) ||
              e.attendance.some((a) => a.userId === p.selfId),
          )
          .map((e) => (
            <div className="settings-row" key={e.id}>
              <strong>{e.title}</strong>
              <span>{date(e.startsAt)}</span>
              <Badge>
                {e.attendance.some((a) => a.userId === p.selfId)
                  ? "Attended"
                  : "Registered"}
              </Badge>
            </div>
          ))}
      </section>
    </>
  );
}
export function DigitalCard(p: ModuleProps) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const member = p.data.members.find((m) => m.id === p.selfId);
  useEffect(() => {
    let active = true;
    async function make() {
      try {
        const link = p.demo
          ? `${location.origin}/verify/demo?club=${p.data.club.id}&member=${p.selfId}`
          : (
              await workspaceFetch<{ url: string }>(
                `/api/workspace/qr?organisationId=${p.data.club.id}&kind=card&id=${p.selfId}`,
              )
            ).url;
        const bitmap = await QRCode.toDataURL(link, { width: 180, margin: 1 });
        if (active) {
          setQr(bitmap);
          setUrl(link);
        }
      } catch (error) {
        p.setError(
          error instanceof Error
            ? error.message
            : "Card verification is unavailable.",
        );
      }
    }
    if (p.data.subscription.plan !== "COMMUNITY") void make();
    return () => {
      active = false;
    };
  }, [p.data.club.id, p.selfId]);
  if (p.data.subscription.plan === "COMMUNITY")
    return (
      <Gate
        p={p}
        title="Your membership, always with you"
        copy="Digital member cards with QR verification are available on Organisation. Your membership record remains available in My Membership."
      />
    );
  return (
    <div className="digital-card-layout">
      <section className="digital-member-card">
        <div className="member-card-logo">
          {p.data.club.logo ? (
            <img src={p.data.club.logo} alt="" />
          ) : (
            <HandHeart size={30} />
          )}
          <span>
            {p.data.club.name}
            <small>DIGITAL MEMBERSHIP CARD</small>
          </span>
        </div>
        <Avatar name={member?.name ?? "Member"} />
        <h2>{member?.name ?? "Member"}</h2>
        <p>{workspaceRoleLabels[member?.role ?? "MEMBER"]}</p>
        <div className="card-details">
          <span>
            MEMBERSHIP NO.<strong>{member?.number ?? "Pending"}</strong>
          </span>
          <span>
            VALID UNTIL
            <strong>
              {member?.expiresAt ? date(member.expiresAt) : "No expiry"}
            </strong>
          </span>
        </div>
        <div className="member-card-bottom">
          <Badge>{member?.status ?? "PENDING"}</Badge>
          {qr && (
            <a href={url}>
              <img src={qr} alt="Verify this membership" />
            </a>
          )}
        </div>
      </section>
      <div>
        <p className="overline">Connected to your community</p>
        <h2>A membership you can carry.</h2>
        <p>
          Open your card at a programme or share the verification link. Only
          your name, membership number, status and expiry appear publicly.
        </p>
        {url && (
          <a
            className="btn secondary"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Verify membership <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
export function Profile(p: ModuleProps) {
  const person = p.data.members.find((m) => m.id === p.selfId);
  return (
    <section className="workspace-section profile-form">
      <div className="block-heading">
        <Avatar name={person?.name ?? "Member"} />
        <div>
          <h2>Your profile</h2>
          <p>{person?.email}</p>
        </div>
      </div>
      <form
        className="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void p.act({
            type: "profile.update",
            name: str(f, "name"),
            skills: str(f, "skills"),
          });
        }}
      >
        <label>
          Full name
          <input name="name" defaultValue={person?.name} required />
        </label>
        <label>
          Skills
          <input
            name="skills"
            defaultValue={person?.skills.join(", ")}
            placeholder="e.g. Event support, first aid"
          />
        </label>
        <button className="btn primary" disabled={p.busy}>
          <Check size={16} />
          Save profile
        </button>
      </form>
    </section>
  );
}
export function Platform(p: ModuleProps) {
  const [stats, setStats] = useState<{
    organisations: {
      id: string;
      name: string;
      plan: string;
      status: string;
      members: number;
    }[];
    mrr: number;
    arr: number;
    trial: number;
    paid: number;
    cancelled: number;
    conversion: number;
  } | null>(null);
  useEffect(() => {
    if (p.demo) {
      const clubs =
        JSON.parse(localStorage.getItem("ybngo.demoClubs") ?? "null") ??
        demoOrganisations;
      setStats(
        revenueSummary(
          clubs.map((club: { id: string }) => {
            const workspace: WorkspaceData =
              JSON.parse(
                localStorage.getItem(`${DEMO_KEY}.${club.id}`) ?? "null",
              ) ?? seedWorkspace(club.id);
            const sub = resolveSubscription(workspace.subscription);
            return {
              id: club.id,
              name: workspace.club.name,
              parentId: workspace.club.parentId,
              plan: sub.plan,
              status: sub.status,
              cycle: sub.cycle,
              members: workspace.members.length,
            };
          }),
        ),
      );
    } else
      workspaceFetch<NonNullable<typeof stats>>("/api/platform")
        .then(setStats)
        .catch((e) => p.setError(e.message));
  }, [p.demo]);
  if (!stats) return <Empty title="Loading platform activity" />;
  return (
    <>
      <div className="metric-grid">
        {[
          { name: "Organisations", value: stats.organisations.length },
          { name: "Monthly recurring revenue", value: money(stats.mrr) },
          { name: "Annual recurring revenue", value: money(stats.arr) },
          { name: "Trial organisations", value: stats.trial },
        ].map((m) => (
          <article className="metric-tile" key={m.name}>
            <span>{m.name}</span>
            <strong>{m.value}</strong>
            <small>Based on recorded subscriptions</small>
          </article>
        ))}
      </div>
      <div className="workspace-section">
        <div className="block-heading">
          <div>
            <h2>Organisation subscriptions</h2>
            <p>
              {stats.paid} paid · {stats.cancelled} cancelled ·{" "}
              {stats.conversion.toFixed(1)}% paid conversion
            </p>
          </div>
          <button
            className="btn secondary"
            onClick={() => exportCsv("organisations.csv", stats.organisations)}
          >
            <Download size={16} />
            Export
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Members</th>
              </tr>
            </thead>
            <tbody>
              {stats.organisations.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{getPlan(o.plan).name}</td>
                  <td>
                    <Badge>{o.status}</Badge>
                  </td>
                  <td>{o.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
