const parseOriginList = (value?: string): string[] =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const configuredOrigins = [
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  "https://retail-os-drab.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

export const isAllowedOrigin = (origin: string): boolean => {
  if (configuredOrigins.includes(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};
