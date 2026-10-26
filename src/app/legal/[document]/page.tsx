import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader, PublicFooter } from "@/components/product/PublicShell";
const pages: Record<string, { title: string; sections: [string, string][] }> = {
  privacy: {
    title: "Privacy & data protection",
    sections: [
      [
        "Your organisation's records",
        "Your organisation controls its membership, programme and volunteer records. Only share information that your organisation is authorised to collect and use.",
      ],
      [
        "Access and storage",
        "Access is based on organisation membership and assigned permissions. Documents are held in private storage and accessed through temporary links. Demo records stay in the browser used to create them.",
      ],
      [
        "Access, correction and export",
        "Organisation administrators can correct and export records. Members should contact their organisation to request access, corrections or removal. Billing records may need to be retained for accounting purposes.",
      ],
      [
        "Questions",
        "Contact support with your organisation name and a description of your privacy request. Do not send passwords, identity documents or payment card details by email.",
      ],
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      [
        "Using YBNGO",
        "Use YBNGO to administer an organisation you are authorised to represent. You are responsible for the records you upload and permissions you assign.",
      ],
      [
        "Plans and subscriptions",
        "Prices are shown in Malaysian ringgit. Review the final checkout amount and billing cycle before subscribing. Paid access continues until the end of the current period when cancellation is scheduled.",
      ],
      [
        "Your data",
        "Your organisation retains control of its data. You can export records. Payment failure does not cause automatic deletion of organisation records.",
      ],
      [
        "Service and support",
        "Third-party email, payment and storage services can affect availability. Contact support for help with account access, billing or data requests.",
      ],
    ],
  },
  support: {
    title: "How can we help?",
    sections: [
      [
        "Account and organisation access",
        "For membership approval or a role change, contact your organisation owner. Use the login page to access an existing account.",
      ],
      [
        "Billing, privacy or product support",
        "Email support@ybngo.my with your organisation name and the issue you need help with. Never include your password or payment card details.",
      ],
      [
        "Try the workspace",
        "The public demo is available without an account. You can try membership, programmes, attendance and reports with sample records.",
      ],
    ],
  },
};
export default async function Legal({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const key = (await params).document;
  const p = pages[key];
  if (!p) notFound();
  return (
    <>
      <PublicHeader />
      <main className="public-container legal-page">
        <p className="overline">YBNGO</p>
        <h1>{p.title}</h1>
        {p.sections.map(([h, b]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{b}</p>
          </section>
        ))}
        <Link className="btn secondary" href="/">
          Back to YBNGO
        </Link>
      </main>
      <PublicFooter />
    </>
  );
}
