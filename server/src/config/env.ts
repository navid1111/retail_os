const isHostedRuntime = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const assertHostedUrl = (name: string, value: string): void => {
  if (!isHostedRuntime) {
    return;
  }

  const url = new URL(value);

  if (localHosts.has(url.hostname)) {
    throw new Error(
      `${name} cannot point to ${url.hostname} on Render. Use the internal URL from your hosted service.`
    );
  }
};

const requireEnvInProduction = (name: string, developmentDefault: string): string => {
  const value = process.env[name]?.trim();

  if (value) {
    assertHostedUrl(name, value);
    return value;
  }

  if (isHostedRuntime) {
    throw new Error(`${name} must be configured in production.`);
  }

  return developmentDefault;
};

export const getMongoUri = (): string =>
  requireEnvInProduction("MONGODB_URI", "mongodb://localhost:27017");

export const getRedisUrl = (): string =>
  requireEnvInProduction("REDIS_URL", "redis://localhost:6379");
