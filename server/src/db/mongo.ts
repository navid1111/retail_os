import { MongoClient } from "mongodb";
import mongoose from "mongoose";

// Eagerly import all models to register their schemas with Mongoose
import "../models/User.model";
import "../models/Store.model";
import "../models/Visit.model";
import "../models/VisitImage.model";
import "../models/AiAnalysis.model";
import "../models/FraudFlag.model";
import "../models/Notification.model";
import "../models/AuditLog.model";
import "../models/Job.model";

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