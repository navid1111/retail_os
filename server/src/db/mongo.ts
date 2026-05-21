import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

export { client as mongoClient };

export async function connectDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB");
    
    // Connect Mongoose to MongoDB
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "myapp",
    });
    console.log("Successfully connected Mongoose to MongoDB");

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
  await mongoose.disconnect();
  console.log("MongoDB and Mongoose connections closed.");
}