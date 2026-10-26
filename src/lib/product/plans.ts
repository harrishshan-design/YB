export type PlanId = "COMMUNITY" | "ORGANISATION" | "PROFESSIONAL" | "NETWORK";
export type BillingCycle = "monthly" | "yearly";
export const plans = [
  {
    id: "COMMUNITY" as const,
    name: "Community",
    monthly: 0,
    yearly: 0,
    members: 30,
    admins: 2,
    programmes: 3,
    storage: 0.5,
    tagline: "A good place to begin",
    features: [
      "30 members · 2 admins",
      "3 programmes per month",
      "Registration & manual attendance",
      "Announcements & member directory",
      "500 MB storage",
      "Basic reports",
    ],
  },
  {
    id: "ORGANISATION" as const,
    name: "Organisation",
    monthly: 39,
    yearly: 390,
    members: 250,
    admins: 5,
    programmes: null,
    storage: 5,
    tagline: "Best for growing NGOs",
    features: [
      "250 members · 5 admins",
      "Unlimited programmes",
      "QR attendance & digital cards",
      "Volunteers, committee & meetings",
      "Tasks, applications & CSV import",
      "5 GB storage & PDF reports",
    ],
  },
  {
    id: "PROFESSIONAL" as const,
    name: "Professional",
    monthly: 89,
    yearly: 890,
    members: 1000,
    admins: 15,
    programmes: null,
    storage: 25,
    tagline: "For an established community",
    features: [
      "1,000 members · 15 admins",
      "Everything in Organisation",
      "Advanced permissions & analytics",
      "Volunteer hours & certificates",
      "Branding, photo galleries & audit log",
      "25 GB storage & priority support",
    ],
  },
  {
    id: "NETWORK" as const,
    name: "Network",
    monthly: 199,
    yearly: 1990,
    members: 5000,
    admins: null,
    programmes: null,
    storage: 100,
    tagline: "Bring every branch together",
    features: [
      "5,000 members · unlimited admins",
      "Everything in Professional",
      "Multiple branches & branch admins",
      "Central documents & reporting",
      "API access & webhooks",
      "100 GB storage & priority support",
    ],
  },
] as const;
export function getPlan(id: string) {
  return plans.find((p) => p.id === id) ?? plans[0];
}
export function hasPaidFeatures(id: string) {
  return id !== "COMMUNITY";
}
export const addOns = [
  { name: "Extra 500 members", price: 20, unit: "month" },
  { name: "Extra branch", price: 20, unit: "month" },
  { name: "Additional 10 GB storage", price: 10, unit: "month" },
  { name: "Custom domain", price: 15, unit: "month" },
  { name: "Advanced AI reports", price: 20, unit: "month" },
  { name: "SMS notifications", price: 0.15, unit: "SMS, subject to provider" },
];
