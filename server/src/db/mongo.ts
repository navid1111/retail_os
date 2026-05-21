import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

export { client as mongoClient };

export async function connectDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB");
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

export function getDB() {
  return client.db(process.env.MONGODB_DB || "myapp");
}

export async function closeDB() {
  await client.close();
}