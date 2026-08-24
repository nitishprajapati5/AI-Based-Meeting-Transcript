export function sanitizeError(err: any): string {
  if (!err) return "";
  let msg = typeof err === "string" ? err : err.message || JSON.stringify(err);

  const keysToMask = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GEMINI_FALL_BACK_KEY,
  ].filter(Boolean) as string[];

  keysToMask.forEach((key) => {
    if (key && key.length > 5) {
      msg = msg.split(key).join("[API_KEY_MASKED]");
    }
  });

  return msg.replace(/AIzaSy[A-Za-z0-9_-]{35}/g, "[API_KEY_MASKED]").replace(/[a-zA-Z0-9_-]{39,40}/g, "[KEY_MASKED]");
}

export function getRotationPolicyApiKeys(): string[] {
  const rawKeysString = process.env.GEMINI_API_KEYS;
  if (!rawKeysString) return [];

  const keys = rawKeysString
    .split(",")
    .map((key) => key.replace(/^["']|["']$/g, "").trim())
    .filter((key) => key.length > 0);

  return Array.from(new Set(keys));
}
