"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { PublicHeader } from "./PublicShell";
import { useAppSession } from "@/lib/dashboard/use-app-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearDemoUser, isDemoUser } from "@/lib/dashboard/demo-session";
import { workspaceFetch } from "@/lib/product/use-workspace";
import { apiFetch } from "@/lib/api-client";
import { roleSlugs } from "@/lib/dashboard/content";
import type { AppUser } from "@/lib/dashboard/types";
const states = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];
export function AuthScreen({
  register = false,
  invite = "",
}: {
  register?: boolean;
  invite?: string;
}) {
  const router = useRouter();
  const { currentUser, loading } = useAppSession();
  const [choice, setChoice] = useState<"create" | "join" | null>(
    invite ? "join" : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [logo, setLogo] = useState("");
  const signedIn = !!currentUser && !isDemoUser(currentUser);
  useEffect(() => {
    if (currentUser && !register)
      router.replace(`/${roleSlugs[currentUser.role]}`);
  }, [currentUser, register, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (register && signedIn && currentUser) {
        const result = await workspaceFetch<{ id: string; message?: string }>(
          "/api/workspace/organisations",
          {
            method: "POST",
            body: JSON.stringify({
              action: choice,
              name: String(form.get("organisationName") ?? ""),
              inviteCode: String(form.get("inviteCode") ?? "")
                .trim()
                .split("/")
                .pop(),
              registrationNo: String(form.get("registrationNo") ?? ""),
              state: String(form.get("state") ?? ""),
              organisationType: String(form.get("organisationType") ?? ""),
              email: String(form.get("contactEmail") || currentUser.email),
              phone: String(form.get("phone") ?? ""),
              estimatedMembers: Number(form.get("estimatedMembers") ?? 30),
              logo,
            }),
          },
        );
        if (choice === "join") {
          setMessage(
            result.message ??
              "Membership requested. Your organisation owner will review it.",
          );
          return;
        }
        localStorage.setItem(`ybngo.activeClub.${currentUser.id}`, result.id);
        router.push(`/${roleSlugs[currentUser.role]}`);
        return;
      }
      clearDemoUser();
      const supabase = getSupabaseBrowserClient();
      const email = String(form.get("email")).trim().toLowerCase();
      const password = String(form.get("password"));
      if (register) {
        if (password !== form.get("confirmPassword"))
          throw new Error("Your passwords don't match.");
        const metadata = {
          name: String(form.get("name")),
          role: choice === "create" ? "PRESIDENT" : "MEMBER",
          organisationName:
            choice === "create"
              ? String(form.get("organisationName"))
              : undefined,
          organisationDescription: String(form.get("description") ?? ""),
          registrationNo: String(form.get("registrationNo") ?? ""),
          organisationType: String(form.get("organisationType") ?? ""),
          state: String(form.get("state") ?? ""),
          phone: String(form.get("phone") ?? ""),
          contactEmail: String(form.get("contactEmail") ?? email),
          estimatedMembers: Number(form.get("estimatedMembers") ?? 30),
          logo,
          inviteCode:
            choice === "join"
              ? String(form.get("inviteCode")).trim().split("/").pop()
              : undefined,
        };
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage(
            "Your account is created. Open the confirmation email, then sign in. Check your spam folder too.",
          );
          return;
        }
        const profile = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify(metadata),
        });
        router.replace(`/${roleSlugs[profile.user.role]}`);
      } else {
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        const profile = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        router.replace(`/${roleSlugs[profile.user.role]}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't complete that request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PublicHeader />
      <main className="auth-layout">
        <aside className="auth-story">
          <span className="overline">
            A shared purpose. A shared workspace.
          </span>
          <h1>
            Make room
            <br />
            for more good.
          </h1>
          <p>
            Bring your people, programmes and paperwork together. We'll help
            with the organising.
          </p>
          <img src="/images/community.jpg" alt="Volunteers working together" />
          <div>
            <Check size={17} /> 14-day Professional trial · No credit card
          </div>
        </aside>
        <section className="auth-form-area">
          <div className="auth-form-wrap">
            <Link className="text-link" href="/">
              <ArrowLeft size={16} />
              Back to YBNGO
            </Link>
            <p className="overline">
              {register
                ? "Welcome to your next chapter"
                : "Good to see you again"}
            </p>
            <h2>
              {register
                ? choice
                  ? choice === "create"
                    ? "Create your organisation"
                    : "Join your organisation"
                  : "What would you like to do?"
                : "Log in to your workspace"}
            </h2>
            <p className="muted">
              {register
                ? "A few details, then you're ready to get started."
                : "Your organisation's people and programmes, all in one place."}
            </p>
            {register && !choice ? (
              <div className="onboarding-choices">
                <button onClick={() => setChoice("create")}>
                  <Building2 size={28} />
                  <strong>Create an Organisation</strong>
                  <span>Set up a new workspace for your NGO or club.</span>
                  <ArrowRight size={20} />
                </button>
                <button onClick={() => setChoice("join")}>
                  <Users size={28} />
                  <strong>Join an Organisation</strong>
                  <span>Use the invite link shared by your committee.</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            ) : (
              <form className="product-form" onSubmit={submit}>
                {register && (
                  <>
                    <label>
                      Your full name
                      <input
                        name="name"
                        defaultValue={currentUser?.name}
                        autoComplete="name"
                        required
                        minLength={2}
                      />
                    </label>
                    {choice === "create" ? (
                      <>
                        <label>
                          Organisation name
                          <input
                            name="organisationName"
                            placeholder="e.g. HH Charity"
                            minLength={2}
                            required
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Organisation type
                            <select name="organisationType">
                              <option>Charitable organisation</option>
                              <option>Youth club</option>
                              <option>Community association</option>
                              <option>Society / federation</option>
                              <option>Other</option>
                            </select>
                          </label>
                          <label>
                            State
                            <select name="state">
                              {states.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Registration number <small>optional</small>
                            <input name="registrationNo" />
                          </label>
                          <label>
                            Estimated members
                            <input
                              name="estimatedMembers"
                              type="number"
                              defaultValue={30}
                              min={1}
                            />
                          </label>
                          <label>
                            Contact email
                            <input name="contactEmail" type="email" />
                          </label>
                          <label>
                            Contact phone
                            <input name="phone" type="tel" />
                          </label>
                        </div>
                        <label>
                          Organisation logo{" "}
                          <small>optional · PNG or JPEG, up to 250 KB</small>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 250000) {
                                setError("Choose a logo smaller than 250 KB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () =>
                                setLogo(String(reader.result));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </>
                    ) : (
                      <label>
                        Invite code or link
                        <input
                          name="inviteCode"
                          defaultValue={invite}
                          placeholder="ORG-... or your invite link"
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                {!(register && signedIn) && (
                  <>
                    <label>
                      {register ? "Your email" : "Email address"}
                      <input
                        name="email"
                        autoComplete="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Password
                      <div className="password-field">
                        <input
                          name="password"
                          autoComplete={
                            register ? "new-password" : "current-password"
                          }
                          type={showPassword ? "text" : "password"}
                          minLength={register ? 8 : undefined}
                          required
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </label>
                    {register && (
                      <label>
                        Confirm password
                        <input
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="form-success" role="status">
                    {message} <Link href="/login">Go to login</Link>
                  </p>
                )}
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy || !!message}
                >
                  {busy
                    ? "Please wait…"
                    : register
                      ? choice === "create"
                        ? "Create my workspace"
                        : "Request membership"
                      : "Log in"}
                  <ArrowRight size={18} />
                </button>
                {register && (
                  <small>
                    By continuing, you agree to our{" "}
                    <Link href="/legal/terms">Terms</Link> and{" "}
                    <Link href="/legal/privacy">Privacy Policy</Link>.
                  </small>
                )}
                {register && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setChoice(null)}
                  >
                    <ArrowLeft size={16} />
                    Choose another option
                  </button>
                )}
              </form>
            )}
            <p className="auth-switch">
              {register ? "Already part of YBNGO?" : "New to YBNGO?"}{" "}
              <Link href={register ? "/login" : "/register"}>
                {register ? "Log in" : "Create or join an organisation"}
              </Link>
            </p>
            <Link className="text-link" href="/demo">
              Just looking? Explore the demo <ArrowUpRightIcon />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
