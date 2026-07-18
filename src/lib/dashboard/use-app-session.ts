"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { apiFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppUser } from "./types";

export function useAppSession() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const { user } = await apiFetch<{ user: AppUser }>("/api/me");
      setCurrentUser(user);
      return user;
    } catch {
      try {
        const { user } = await apiFetch<{ user: AppUser }>("/api/auth/profile");
        setCurrentUser(user);
        return user;
      } catch {
        setCurrentUser(null);
        return null;
      }
    }
  }, []);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      console.error(error);
      setConfigError("This app is not configured correctly. Please contact the site admin.");
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      if (data.session) {
        await loadProfile();
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        loadProfile();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }
    setCurrentUser(null);
  }, []);

  return { currentUser, setCurrentUser, loading, configError, logout, loadProfile };
}
