import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379"
    });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));

    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.error("Failed to connect to Redis", err);
    throw err;
  }
};

export const getRedis = (): RedisClientType => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis first.");
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
};