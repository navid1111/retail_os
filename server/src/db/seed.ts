import * as dotenv from "dotenv";
dotenv.config();

import { ObjectId } from "mongodb";
import { connectDB, getDB, closeDB } from "./mongo";

const seed = async () => {
  try {
    console.log("Connecting to MongoDB for seeding...");
    await connectDB();
    const db = getDB();

    // 1. Clear existing stores, visits, and fraud flags
    console.log("Clearing existing data...");
    await db.collection("stores").deleteMany({});
    await db.collection("visits").deleteMany({});
    await db.collection("fraud_flags").deleteMany({});

    // 2. Define seed stores
    const stores = [
      {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storeCode: "DHK-001",
        storeName: "Dhaka Outlet",
        address: "123 Main St, Dhaka",
        region: "Dhaka",
        latitude: 23.7806,
        longitude: 90.2794,
        gpsRadiusM: 300,
        isActive: true,
        skus: [],
        createdAt: new Date(),
      },
      {
        _id: new ObjectId("507f1f77bcf86cd799439012"),
        storeCode: "CTG-001",
        storeName: "Chittagong Central",
        address: "456 CDA Ave, Chittagong",
        region: "Chittagong",
        latitude: 22.3569,
        longitude: 91.7832,
        gpsRadiusM: 300,
        isActive: true,
        skus: [],
        createdAt: new Date(),
      },
    ];

    // 3. Insert seed stores
    console.log("Inserting seed stores...");
    await db.collection("stores").insertMany(stores);

    console.log("✓ Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    await closeDB();
    console.log("MongoDB connection closed.");
    process.exit(0);
  }
};

seed();
