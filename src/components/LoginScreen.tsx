"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, ApiError, storeSession } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

export default function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      const { token, user } = await api.login(email, password);
      storeSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <h1>NGO Help System</h1>
            <p className="brand-subtitle">Sign in to your account</p>
          </div>
        </div>

        <label>
          Email
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" />
        </label>

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
