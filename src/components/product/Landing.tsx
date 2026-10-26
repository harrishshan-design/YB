import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  CalendarDays,
  HandHeart,
  ClipboardCheck,
  FolderOpen,
  BarChart3,
  Check,
  ShieldCheck,
  Download,
  Clock3,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./PublicShell";
import { PricingCards } from "./PricingCards";
const features = [
  {
    icon: Users,
    name: "A place for every member",
    copy: "Profiles, membership types, committee positions and digital cards. Keep your people connected.",
  },
  {
    icon: CalendarDays,
    name: "Programmes, from start to finish",
    copy: "Plan an activity, open registrations and check members in. The details stay together.",
  },
  {
    icon: HandHeart,
    name: "Give every contribution credit",
    copy: "Assign volunteers, record their hours and keep a history of the good they do.",
  },
  {
    icon: ClipboardCheck,
    name: "Keep your committee in sync",
    copy: "Agendas, minutes, resolutions and assigned tasks. A smoother handover for the next team.",
  },
  {
    icon: FolderOpen,
    name: "Your records, in the right place",
    copy: "Constitutions, letters, photos and programme documents. Organised and easy to find.",
  },
  {
    icon: BarChart3,
    name: "Turn activity into impact",
    copy: "Attendance, volunteer hours and programme outcomes, ready for a professional report.",
  },
];
export default function Landing() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="public-hero">
          <img
            src="/images/community.jpg"
            alt="Community volunteers coming together"
            className="hero-photo"
          />
          <div className="hero-shade" />
          <div className="public-container hero-copy">
            <span className="hero-kicker">
              <span /> For the people who bring people together
            </span>
            <h1>
              Run your NGO
              <br />
              from one place.
            </h1>
            <p>
              Manage members, programmes, volunteers, meetings and reports.
              Spend more time making a difference.
            </p>
            <div className="hero-actions">
              <Link className="btn mint" href="/register">
                Start free <ArrowUpRight size={18} />
              </Link>
              <Link className="btn glass" href="/demo">
                View demo <ArrowRight size={18} />
              </Link>
            </div>
            <small>
              <Check size={15} /> No credit card required. Grow at your own
              pace.
            </small>
          </div>
          <div className="hero-caption">
            A stronger community starts with a connected organisation.
          </div>
        </section>
        <section className="workflow-band">
          <div className="public-container">
            <p>One connected workflow. Less busywork.</p>
            <div className="workflow-steps">
              {[
                "Members",
                "Programmes",
                "Attendance",
                "Volunteers",
                "Reports",
              ].map((step, i) => (
                <span key={step}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  {step}
                  {i < 4 && <ArrowRight size={18} />}
                </span>
              ))}
            </div>
          </div>
        </section>
        <section className="public-section public-container" id="features">
          <div className="section-heading">
            <div>
              <p className="overline">Built around your organisation</p>
              <h2>
                Everything in order.
                <br />
                Everyone moving forward.
              </h2>
            </div>
            <p>
              YBNGO is the operating system for Malaysian NGOs and community
              organisations. One shared workspace, from your first member to
              your next big programme.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <article key={f.name}>
                <span className="feature-icon">
                  <f.icon size={24} />
                </span>
                <h3>{f.name}</h3>
                <p>{f.copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="report-band">
          <div className="public-container report-layout">
            <div>
              <p className="overline">From programme to proof of impact</p>
              <h2>
                The work is done.
                <br />
                Your report is, too.
              </h2>
              <p>
                Bring attendance, volunteer contributions, photos and outcomes
                into one official programme report. Review it, add your
                organisation's details and download a polished PDF.
              </p>
              <ul className="check-list">
                <li>
                  <Check />
                  Your NGO name and logo
                </li>
                <li>
                  <Check />
                  Attendance, expenses and outcomes
                </li>
                <li>
                  <Check />
                  Editable before you export
                </li>
              </ul>
              <Link className="btn primary" href="/demo">
                Try the report workflow <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="report-paper">
              <div className="paper-head">
                <HandHeart size={26} />
                <span>
                  HH CHARITY<small>PROGRAMME REPORT</small>
                </span>
                <b>01</b>
              </div>
              <h3>
                Community Food
                <br />
                Basket Drive
              </h3>
              <p>Shah Alam, Selangor · Programme overview</p>
              <img
                src="/images/food-aid.jpg"
                alt="Food supplies prepared for a community programme"
              />
              <div className="paper-stats">
                <span>
                  <b>60</b>Food baskets
                </span>
                <span>
                  <b>12</b>Volunteers
                </span>
                <span>
                  <b>48</b>Service hours
                </span>
              </div>
              <div className="paper-lines">
                <i />
                <i />
                <i />
              </div>
              <small>PREPARED WITH CARE. SHARED WITH CONFIDENCE.</small>
            </div>
          </div>
        </section>
        <section className="public-section public-container">
          <div className="section-heading centered">
            <p className="overline">Room to grow</p>
            <h2>Small budget. Real possibilities.</h2>
            <p>
              Start with a useful free plan. Add capacity and time-saving tools
              when your organisation needs them.
            </p>
          </div>
          <PricingCards compact />
          <p className="center-note">
            <Link href="/pricing">
              Compare all plans and add-ons <ArrowRight size={16} />
            </Link>
          </p>
        </section>
        <section className="trust-band">
          <div className="public-container trust-grid">
            <div>
              <ShieldCheck />
              <h3>Your organisation. Your data.</h3>
              <p>
                Clear roles and a separate workspace for every organisation.
              </p>
            </div>
            <div>
              <Download />
              <h3>Take your data with you.</h3>
              <p>Export your records and keep your organisation's knowledge.</p>
            </div>
            <div>
              <Clock3 />
              <h3>Make more time for people.</h3>
              <p>Less spreadsheet chasing. More community building.</p>
            </div>
          </div>
        </section>
        <section className="public-container final-cta">
          <div>
            <p className="overline">Your next chapter starts here</p>
            <h2>
              Good work deserves
              <br />a great workspace.
            </h2>
          </div>
          <div>
            <Link className="btn primary" href="/register">
              Create your organisation <ArrowUpRight size={18} />
            </Link>
            <p>14-day Professional trial. No card required.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
