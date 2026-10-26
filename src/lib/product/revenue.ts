import { getPlan } from "./plans";
export type OrganisationRevenue = {
  id: string;
  name: string;
  plan: string;
  status: string;
  cycle: string;
  members: number;
  parentId?: string | null;
};
export function revenueSummary(organisations: OrganisationRevenue[]) {
  const roots = organisations.filter((o) => !o.parentId);
  const paid = roots.filter(
    (o) =>
      o.plan !== "COMMUNITY" &&
      ["active", "past_due", "grace_period"].includes(o.status.toLowerCase()),
  );
  const mrr = paid.reduce(
    (n, o) =>
      n +
      (o.cycle === "yearly"
        ? getPlan(o.plan).yearly / 12
        : getPlan(o.plan).monthly),
    0,
  );
  return {
    organisations,
    mrr,
    arr: mrr * 12,
    trial: roots.filter((o) => o.status.toLowerCase() === "trialing").length,
    paid: paid.length,
    cancelled: roots.filter((o) => o.status.toLowerCase() === "cancelled")
      .length,
    conversion: roots.length ? (paid.length / roots.length) * 100 : 0,
  };
}
