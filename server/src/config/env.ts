const isProduction = process.env.NODE_ENV === "production";

const requireEnvInProduction = (name: string, developmentDefault: string): string => {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${name} must be configured in production.`);
  }

  return developmentDefault;
};

export const getMongoUri = (): string =>
  requireEnvInProduction("MONGODB_URI", "mongodb://localhost:27017");

export const getRedisUrl = (): string =>
  requireEnvInProduction("REDIS_URL", "redis://localhost:6379");

