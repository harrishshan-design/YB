import Link from "next/link";
import { ArrowUpRight, HeartHandshake } from "lucide-react";
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={`product-logo ${light ? "light" : ""}`}
      href="/"
      aria-label="YBNGO home"
    >
      <span className="logo-symbol">
        <HeartHandshake size={24} />
      </span>
      <span>
        YBNGO<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-container public-nav">
        <Logo />
        <nav aria-label="Website">
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/demo">View demo</Link>
        </nav>
        <div className="nav-actions">
          <Link className="nav-login" href="/login">
            Log in
          </Link>
          <Link className="btn primary small" href="/register">
            Start free <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container footer-grid">
        <div>
          <Logo />
          <p>
            More time for your community.
            <br />
            Less time on administration.
          </p>
          <small>Designed for Malaysian community organisations.</small>
        </div>
        <div>
          <strong>Product</strong>
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Plans & pricing</Link>
          <Link href="/demo">Explore the demo</Link>
        </div>
        <div>
          <strong>Here to help</strong>
          <Link href="/legal/support">Contact & support</Link>
          <Link href="/legal/privacy">Privacy & data protection</Link>
          <Link href="/legal/terms">Terms of service</Link>
        </div>
      </div>
      <div className="public-container footer-bottom">
        <span>
          © {new Date().getFullYear()} YBNGO. Built around your community.
        </span>
        <span>Malaysia · English · MYR</span>
      </div>
    </footer>
  );
}
