"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { PublicHeader, PublicFooter } from "./PublicShell";
import { Badge, date } from "./ui";
import { workspaceFetch } from "@/lib/product/use-workspace";
import { DEMO_KEY, seedWorkspace, applyDemoAction } from "@/lib/product/demo";
import type { WorkspaceData } from "@/lib/product/types";
export function Verification({ token }: { token: string }) {
  const query = useSearchParams();
  const [result, setResult] = useState<{
    name: string;
    organisation: string;
    number: string;
    status: string;
    expiresAt: string | null;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (token === "demo") {
      try {
        const club = query.get("club") ?? "demo-hh-charity";
        const data: WorkspaceData =
          JSON.parse(localStorage.getItem(`${DEMO_KEY}.${club}`) ?? "null") ??
          seedWorkspace(club);
        const member = data.members.find((m) => m.id === query.get("member"));
        if (!member) throw new Error("Sample membership not found.");
        setResult({
          name: member.name,
          organisation: data.club.name,
          number: member.number,
          status: member.status,
          expiresAt: member.expiresAt,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Membership unavailable.");
      }
    } else
      fetch(`/api/public/verify?token=${encodeURIComponent(token)}`)
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.message);
          setResult(body);
        })
        .catch((e) => setError(e.message));
  }, [token]);
  return (
    <>
      <PublicHeader />
      <main className="public-container legal-page">
        <ShieldCheck size={36} />
        <p className="overline">
          {token === "demo"
            ? "Sample membership verification"
            : "Membership verification"}
        </p>
        <h1>{result?.organisation ?? "Checking membership…"}</h1>
        {error && <p className="form-error">{error}</p>}
        {result && (
          <section className="workspace-section">
            <h2>{result.name}</h2>
            <dl className="detail-list">
              <dt>Membership no.</dt>
              <dd>{result.number}</dd>
              <dt>Status</dt>
              <dd>
                <Badge>{result.status}</Badge>
              </dd>
              <dt>Expires</dt>
              <dd>
                {result.expiresAt ? date(result.expiresAt) : "No expiry set"}
              </dd>
            </dl>
          </section>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
export function CheckIn() {
  const query = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      if (query.get("demo") === "1") {
        const club = query.get("club") ?? "demo-hh-charity";
        const data: WorkspaceData =
          JSON.parse(localStorage.getItem(`${DEMO_KEY}.${club}`) ?? "null") ??
          seedWorkspace(club, "MEMBER");
        data.club.role = "MEMBER";
        const next = applyDemoAction(data, {
          type: "attendance.self",
          programmeId: query.get("programme"),
        });
        localStorage.setItem(`${DEMO_KEY}.${club}`, JSON.stringify(next));
        setMessage("Demo check-in recorded. Thank you for being here.");
      } else {
        const result = await workspaceFetch<{ message: string }>(
          "/api/workspace/check-in",
          {
            method: "POST",
            body: JSON.stringify({ token: query.get("token") }),
          },
        );
        setMessage(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please log in to check in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PublicHeader />
      <main className="public-container legal-page">
        <CheckCircle2 size={36} />
        <p className="overline">Programme attendance</p>
        <h1>You're in the right place.</h1>
        <p>Confirm your check-in with your active organisation membership.</p>
        {error && (
          <p className="form-error" role="alert">
            {error} <Link href="/login">Log in</Link>
          </p>
        )}
        {message ? (
          <p className="form-success" role="status">
            {message}
          </p>
        ) : (
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => void check()}
          >
            {busy ? "Checking in…" : "Confirm my check-in"}
          </button>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
