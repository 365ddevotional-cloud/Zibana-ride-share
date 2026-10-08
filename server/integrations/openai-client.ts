import OpenAI from "openai";

let client: OpenAI | undefined;
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("AI features are not configured"), { status: 503 });
  return client ??= new OpenAI({ apiKey });
}
