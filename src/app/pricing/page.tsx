import { PublicHeader, PublicFooter } from "@/components/product/PublicShell";
import { PricingCards } from "@/components/product/PricingCards";
import { addOns } from "@/lib/product/plans";
export default function Pricing() {
  return (
    <>
      <PublicHeader />
      <main className="pricing-page">
        <section className="public-container public-section">
          <div className="section-heading centered">
            <p className="overline">Simple, affordable plans</p>
            <h1>
              A little less admin.
              <br />A lot more impact.
            </h1>
            <p>
              Purpose-built for Malaysian NGOs. Start with a 14-day Professional
              trial, then choose what fits. Your data stays with you.
            </p>
          </div>
          <PricingCards />
          <div className="comparison-table table-scroll">
            <table>
              <caption>Find the right fit</caption>
              <thead>
                <tr>
                  <th>What matters to your team</th>
                  <th>Community</th>
                  <th>Organisation</th>
                  <th>Professional</th>
                  <th>Network</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Members", "30", "250", "1,000", "5,000"],
                  ["Admins", "2", "5", "15", "Unlimited"],
                  [
                    "Programmes",
                    "3 / month",
                    "Unlimited",
                    "Unlimited",
                    "Unlimited",
                  ],
                  ["Storage", "500 MB", "5 GB", "25 GB", "100 GB"],
                  [
                    "Attendance",
                    "Manual",
                    "Manual + QR",
                    "Manual + QR",
                    "Manual + QR",
                  ],
                  [
                    "Programme PDF reports",
                    "Basic CSV",
                    "Included",
                    "Advanced",
                    "Cross-branch",
                  ],
                  [
                    "Volunteers & meetings",
                    "—",
                    "Included",
                    "Included",
                    "Included",
                  ],
                  [
                    "Branding & audit log",
                    "YBNGO",
                    "Basic",
                    "Custom",
                    "Custom",
                  ],
                  ["Branches", "1", "1", "1", "Multiple"],
                  ["API & webhooks", "—", "—", "—", "Included"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i}>{cell}</th>
                      ) : (
                        <td key={i}>{cell}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="section-heading">
            <div>
              <p className="overline">Only what you need</p>
              <h2>A little extra room.</h2>
            </div>
            <p>
              Optional add-ons for organisations with specific needs.
              Availability is confirmed with support before billing.
            </p>
          </div>
          <div className="addons-grid">
            {addOns.map((a) => (
              <div key={a.name}>
                <span>{a.name}</span>
                <strong>
                  RM{a.price}
                  <small> / {a.unit}</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="pricing-faq">
            <h2>A few things worth knowing</h2>
            {[
              [
                "What happens after the trial?",
                "Your organisation returns to Community unless you choose a paid plan. Existing records stay available; premium tools become read-only where appropriate.",
              ],
              [
                "Can we cancel?",
                "Yes. Cancel from Billing and keep access until the end of your paid period. Your organisation's data is never deleted because of a missed payment.",
              ],
              [
                "What if a payment fails?",
                "There is a seven-day grace period to update your payment details. You can still access and export existing data.",
              ],
              [
                "Which payments do you support?",
                "Checkout shows the methods available for your provider and billing cycle. Recurring subscriptions use supported recurring payment methods; FPX and DuitNow availability depends on the payment provider.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
