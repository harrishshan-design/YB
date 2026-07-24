"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppSession } from "@/lib/dashboard/use-app-session";
import { roleLabels, roleSlugs } from "@/lib/dashboard/content";
import type { AppUser, Role } from "@/lib/dashboard/types";

const JOINABLE_ROLES: Role[] = ["MEMBER", "ADMIN"];

export default function JoinOrganisationPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const router = useRouter();
  const { currentUser, loading: sessionLoading, setCurrentUser } = useAppSession();

  const [organisationName, setOrganisationName] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role>("MEMBER");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ name: string }>(`/api/organisations/lookup?code=${encodeURIComponent(code)}`)
      .then((result) => {
        if (!cancelled) setOrganisationName(result.name);
      })
      .catch((error) => {
        if (!cancelled) setLookupError(error instanceof ApiClientError ? error.message : "This invite link is invalid or has expired");
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!sessionLoading && currentUser) {
      router.replace(`/${roleSlugs[currentUser.role]}`);
    }
  }, [sessionLoading, currentUser, router]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name")).trim();
      const email = String(form.get("email")).trim().toLowerCase();
      const password = String(form.get("password"));
      const confirmPassword = String(form.get("confirmPassword"));

      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: selectedRole, inviteCode: code } }
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (!data.session) {
        setNotice("Account created. Please check your email, confirm it, then login. Do not press this button again.");
        return;
      }

      try {
        const { user } = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
          method: "POST",
          headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : undefined,
          body: JSON.stringify({ name, role: selectedRole, inviteCode: code })
        });
        setCurrentUser(user);
        router.replace(`/${roleSlugs[user.role]}`);
      } catch (error) {
        setFormError(error instanceof ApiClientError ? error.message : "Signup worked, but joining the organisation needs email confirmation first.");
      }
    } catch (error) {
      console.error(error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || lookupLoading) {
    return (
      <main className="login-page">
        <p className="lead">Loading...</p>
      </main>
    );
  }

  if (lookupError) {
    return (
      <main className="login-page">
        <section className="login-hero">
          <div>
            <p className="eyebrow">ybngo.my</p>
            <h1>Invite link not valid</h1>
            <p className="lead">{lookupError} Ask your President for a fresh invite link, or go back to the main site to sign in.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div>
          <p className="eyebrow">ybngo.my</p>
          <h1>Join {organisationName}</h1>
          <p className="lead">Create your account to join this organisation as a Member or Admin.</p>
        </div>

        <div className="login-card">
          {notice && <p className="lead">{notice}</p>}

          <form className="stack-form" onSubmit={join}>
            <div className="login-icon"><UserCheck size={28} /></div>
            <h2>Sign up</h2>
            <label>Full name<input name="name" placeholder="Your full name" required /></label>

            <fieldset className="role-picker">
              <legend>Join as</legend>
              <div className="role-grid">
                {JOINABLE_ROLES.map((role) => (
                  <button
                    className={`role-choice ${selectedRole === role ? "active" : ""}`}
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={selectedRole === role}
                  >
                    <strong>{roleLabels[role]}</strong>
                  </button>
                ))}
              </div>
            </fieldset>

            <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
            <label>Password<input name="password" type="password" minLength={6} required /></label>
            <label>Confirm password<input name="confirmPassword" type="password" minLength={6} required /></label>
            {formError && <p className="error-text">{formError}</p>}
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "Joining..." : `Join as ${roleLabels[selectedRole]}`}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
