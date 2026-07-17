import OpenAI from "openai";

let openai: OpenAI | null = null;

export function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    openai = new OpenAI({ apiKey });
  }

  return openai;
}
