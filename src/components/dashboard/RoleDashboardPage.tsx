"use client";
import WorkspaceApp from "@/components/product/WorkspaceApp";
import type { Role } from "@/lib/dashboard/types";
export function RoleDashboardPage({ role }: { role: Role }) {
  return <WorkspaceApp />;
}
