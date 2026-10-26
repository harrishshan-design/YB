import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./product.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ybngo.my"),
  title: {
    default: "YBNGO | Run your NGO from one place",
    template: "%s | YBNGO",
  },
  description:
    "The operating system for Malaysian NGOs and community organisations. Manage members, programmes, volunteers, attendance and reports in one workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YBNGO | Run your NGO from one place",
    description: "More time for your community. Less time on administration.",
    url: "https://ybngo.my",
    siteName: "YBNGO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
