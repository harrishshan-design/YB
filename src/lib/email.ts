import { Resend } from "resend";

let resend: Resend | null = null;

export function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    resend = new Resend(apiKey);
  }

  return resend;
}

export function getDefaultFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "YB NGO <noreply@ybngo.my>";
}
