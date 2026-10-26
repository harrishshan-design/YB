"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isDemoUser, demoOrganisations } from "@/lib/dashboard/demo-session";
import type { AppUser, Organisation } from "@/lib/dashboard/types";
import {
  DEMO_KEY,
  seedWorkspace,
  applyDemoAction,
  resolveSubscription,
} from "./demo";
import type { Action, WorkspaceData, WorkspaceRole } from "./types";
export async function workspaceFetch<T>(path: string, init?: RequestInit) {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      ...(data.session
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    },
  });
}
export function useWorkspace(user: AppUser | null) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const dataRef = useRef<WorkspaceData | null>(null);
  const generation = useRef(0);
  const writing = useRef(false);
  const [clubs, setClubs] = useState<Organisation[]>([]);
  const [clubId, setClubId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const demo = isDemoUser(user);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const role: WorkspaceRole =
    user?.workspaceRole ??
    (user?.role === "MASTER"
      ? "PLATFORM_ADMIN"
      : user?.role === "PRESIDENT"
        ? "OWNER"
        : user?.role === "ADMIN"
          ? "ADMIN"
          : "MEMBER");
  useEffect(() => {
    if (!user) return;
    let active = true;
    const choose = (items: Organisation[]) => {
      if (!active) return;
      setClubs(items);
      const stored = window.localStorage.getItem(`ybngo.activeClub.${user.id}`);
      setClubId(
        items.find((i) => i.id === stored)?.id ??
          items.find((i) => i.id === user.organisationId)?.id ??
          items[0]?.id ??
          "",
      );
      if (!items.length) {
        setError(
          "Your account has no organisation workspace. Create or join an organisation to continue.",
        );
        setLoading(false);
      }
    };
    const refreshClubs = () => {
      try {
        choose(
          JSON.parse(localStorage.getItem("ybngo.demoClubs") ?? "null") ??
            demoOrganisations,
        );
      } catch {
        choose(demoOrganisations);
      }
    };
    if (demo) {
      refreshClubs();
      window.addEventListener("ybngo.clubsChanged", refreshClubs);
    } else
      workspaceFetch<Organisation[]>("/api/organisations")
        .then(choose)
        .catch((e) => {
          if (active) {
            setError(e.message);
            setLoading(false);
          }
        });
    return () => {
      active = false;
      window.removeEventListener("ybngo.clubsChanged", refreshClubs);
    };
  }, [user, demo]);
  const load = useCallback(async () => {
    if (!user || !clubId) return;
    const currentGeneration = ++generation.current;
    setLoading(true);
    setError("");
    setData(null);
    try {
      if (demo) {
        let next: WorkspaceData;
        try {
          const stored = localStorage.getItem(`${DEMO_KEY}.${clubId}`);
          next = stored ? JSON.parse(stored) : seedWorkspace(clubId, role);
          if (!next.club || !Array.isArray(next.programmes))
            throw new Error("Invalid demo data");
        } catch {
          next = seedWorkspace(clubId, role);
        }
        next.club.role = role;
        next.subscription = resolveSubscription(next.subscription);
        const self = next.members.find((m) => m.id === "demo-self");
        if (self) self.role = role;
        dataRef.current = next;
        localStorage.setItem(`${DEMO_KEY}.${clubId}`, JSON.stringify(next));
        setData(next);
      } else {
        const next = await workspaceFetch<WorkspaceData>(
          `/api/workspace?organisationId=${encodeURIComponent(clubId)}`,
        );
        if (generation.current === currentGeneration) {
          dataRef.current = next;
          setData(next);
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We couldn't load this workspace.",
      );
    } finally {
      if (generation.current === currentGeneration) setLoading(false);
    }
  }, [user, clubId, demo, role]);
  useEffect(() => {
    void load();
  }, [load]);
  function switchClub(id: string) {
    if (!user) return;
    setClubId(id);
    generation.current++;
    dataRef.current = null;
    setData(null);
    localStorage.setItem(`ybngo.activeClub.${user.id}`, id);
    setNotice("");
  }
  async function act(action: Action) {
    if (!dataRef.current || !user || writing.current) return false;
    writing.current = true;
    const currentGeneration = generation.current;
    setBusy(true);
    setError("");
    try {
      let next: WorkspaceData;
      if (demo) {
        next = applyDemoAction(dataRef.current, action);
        localStorage.setItem(`${DEMO_KEY}.${clubId}`, JSON.stringify(next));
      } else
        next = await workspaceFetch<WorkspaceData>(
          `/api/workspace?organisationId=${encodeURIComponent(clubId)}`,
          { method: "POST", body: JSON.stringify(action) },
        );
      if (generation.current === currentGeneration) {
        dataRef.current = next;
        setData(next);
      }
      setNotice(
        action.type === "register"
          ? "Your registration has been updated."
          : "Saved to your organisation workspace.",
      );
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We couldn't save that change.",
      );
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function reset() {
    localStorage.removeItem(`${DEMO_KEY}.${clubId}`);
    void load();
    setNotice("Sample workspace reset.");
  }
  return {
    data,
    clubs,
    clubId,
    switchClub,
    error,
    setError,
    notice,
    setNotice,
    busy,
    loading,
    demo,
    act,
    reset,
    reload: load,
  };
}
