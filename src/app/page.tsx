"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserCheck } from "lucide-react";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppSession } from "@/lib/dashboard/use-app-session";
import { demoAccounts, roleLabels, roleSlugs } from "@/lib/dashboard/content";
import { createDemoUser, storeDemoUser } from "@/lib/dashboard/demo-session";
import type { AppUser, Role } from "@/lib/dashboard/types";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading, configError, setCurrentUser, loadProfile } = useAppSession();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginError, setLoginError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  useEffect(() => {
    if (configError) setLoginError(configError);
  }, [configError]);

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace(`/${roleSlugs[currentUser.role]}`);
    }
  }, [loading, currentUser, router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email")).trim().toLowerCase();
      const password = String(form.get("password"));

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoginError("Wrong email or password.");
        return;
      }

      let user: AppUser | null = null;
      if (data.session?.access_token) {
        const profile = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
          headers: { Authorization: `Bearer ${data.session.access_token}` }
        });
        user = profile.user;
        setCurrentUser(user);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 250));
        user = await loadProfile();
      }

      if (user) {
        router.replace(`/${roleSlugs[user.role]}`);
      } else {
        setLoginError("Logged in, but no matching account was found. Please contact the site admin.");
      }
    } catch (error) {
      console.error(error);
      setLoginError("Login is not configured correctly. Please contact the site admin.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name")).trim();
      const organisationName = String(form.get("organisationName")).trim();
      const organisationDescription = String(form.get("organisationDescription") ?? "").trim();
      const email = String(form.get("email")).trim().toLowerCase();
      const password = String(form.get("password"));
      const confirmPassword = String(form.get("confirmPassword"));

      if (password !== confirmPassword) {
        setLoginError("Passwords do not match.");
        return;
      }

      const role: Role = "PRESIDENT";

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role, organisationName, organisationDescription } }
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      if (!data.session) {
        setAuthMode("login");
        setLoginError("");
        setNotice("Account created. Please check your email, confirm it, then login. Do not press sign up again.");
        return;
      }

      try {
        const { user } = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
          method: "POST",
          headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : undefined,
          body: JSON.stringify({ name, role, organisationName, organisationDescription })
        });
        setCurrentUser(user);
        router.replace(`/${roleSlugs[user.role]}`);
      } catch (error) {
        setLoginError(error instanceof ApiClientError ? error.message : "Signup worked, but organisation setup needs email confirmation first.");
      }
    } catch (error) {
      console.error(error);
      setLoginError("Sign up is not configured correctly. Please contact the site admin.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  function loginAsDemo(role: Role) {
    const user = createDemoUser(role);
    storeDemoUser(user);
    setCurrentUser(user);
    router.replace(`/${roleSlugs[role]}`);
  }

  if (loading || currentUser) {
    return (
      <main className="login-page">
        <p className="lead">Loading...</p>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div>
          <p className="eyebrow">ybngo.my</p>
          <h1>{authMode === "login" ? "Login to continue." : "Register your NGO."}</h1>
          <p className="lead">
            {authMode === "login"
              ? "Choose your side once, then the system opens the correct dashboard automatically."
              : "Signing up here creates a new NGO and makes you its President. Members and Admins join later through the invite link on your dashboard — they don't sign up here."}
          </p>
        </div>

        <div className="login-card">
          <div className="auth-tabs" role="tablist" aria-label="Account">
            <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
              <Lock size={18} /> Login
            </button>
            <button className={authMode === "signup" ? "active" : ""} type="button" onClick={() => setAuthMode("signup")}>
              <UserCheck size={18} /> Register NGO
            </button>
          </div>

          {notice && <p className="lead">{notice}</p>}

          {authMode === "login" ? (
            <form className="stack-form" onSubmit={login}>
              <div className="login-icon"><Lock size={28} /></div>
              <h2>Sign in</h2>
              <label>Email<input name="email" type="email" placeholder="member@demo.com" required /></label>
              <label>Password<input name="password" type="password" required /></label>
              {loginError && <p className="error-text">{loginError}</p>}
              <button className="button primary" type="submit" disabled={loginSubmitting}>
                {loginSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          ) : (
            <form className="stack-form" onSubmit={signup}>
              <div className="login-icon"><UserCheck size={28} /></div>
              <h2>Register your NGO</h2>
              <label>Your full name<input name="name" placeholder="Your full name" required /></label>
              <label>Organisation name<input name="organisationName" placeholder="e.g. HH Charity" required minLength={2} /></label>
              <label>Organisation description (optional)<textarea name="organisationDescription" placeholder="What does your NGO do?" /></label>
              <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
              <label>Password<input name="password" type="password" minLength={6} required /></label>
              <label>Confirm password<input name="confirmPassword" type="password" minLength={6} required /></label>
              {loginError && <p className="error-text">{loginError}</p>}
              <button className="button primary" type="submit" disabled={loginSubmitting}>
                {loginSubmitting ? "Creating..." : `Create ${roleLabels.PRESIDENT} dashboard`}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="demo-grid" aria-label="Demo accounts">
        {demoAccounts.map((account) => (
          <button className="demo-card demo-button" key={account.email} type="button" onClick={() => loginAsDemo(account.role)}>
            <strong>{roleLabels[account.role]}</strong>
            <span>{account.email}</span>
            <small>Click to enter the {roleLabels[account.role]} demo dashboard.</small>
          </button>
        ))}
      </section>
    </main>
  );
}
