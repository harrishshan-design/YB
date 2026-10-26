"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { plans } from "@/lib/product/plans";
export function PricingCards({ compact = false }: { compact?: boolean }) {
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <div className="billing-toggle" role="group" aria-label="Billing cycle">
        <button aria-pressed={!yearly} onClick={() => setYearly(false)}>
          Monthly
        </button>
        <button aria-pressed={yearly} onClick={() => setYearly(true)}>
          Yearly <span>2 months free</span>
        </button>
      </div>
      <div className="pricing-grid">
        {plans.map((p) => (
          <article
            className={`pricing-card ${p.id === "ORGANISATION" ? "popular" : ""}`}
            key={p.id}
          >
            {p.id === "ORGANISATION" && (
              <span className="popular-label">Most popular</span>
            )}
            <h3>{p.name}</h3>
            <p>{p.tagline}</p>
            <div className="plan-price">
              <small>RM</small>
              {yearly ? p.yearly : p.monthly}
              <span>/{yearly && p.monthly ? "year" : "month"}</span>
            </div>
            <small className="price-detail">
              {yearly && p.monthly
                ? `RM ${(p.yearly / 12).toFixed(2)}/month, billed yearly`
                : p.monthly
                  ? "Billed monthly. Cancel anytime."
                  : "Free for your organisation."}
            </small>
            <Link
              className={`btn ${p.id === "ORGANISATION" ? "primary" : "secondary"}`}
              href={`/register?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`}
            >
              {p.monthly ? `Start ${p.name}` : "Start free"}
              <ArrowUpRight size={16} />
            </Link>
            <ul className="check-list">
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={16} />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      {!compact && (
        <p className="center-note">
          Not sure which plan fits? Start free and upgrade whenever you need
          more capacity or tools.
        </p>
      )}
    </>
  );
}
