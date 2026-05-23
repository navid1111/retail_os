import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as path from "path";
import { ObjectId } from "mongodb";
import { connectDB, getDB, closeDB } from "./mongo";

const seed = async () => {
  try {
    console.log("Connecting to MongoDB for seeding...");
    await connectDB();
    const db = getDB();

    // 1. Load mock data from JSON file
    const mockDataPath = path.join(__dirname, "data", "mockData.json");
    if (!fs.existsSync(mockDataPath)) {
      throw new Error(`Mock data file not found at: ${mockDataPath}`);
    }
    
    console.log(`Loading mock data from ${mockDataPath}...`);
    const mockDataRaw = fs.readFileSync(mockDataPath, "utf-8");
    const mockData = JSON.parse(mockDataRaw);

    // 2. Clear existing collections
    console.log("Clearing existing data from all collections...");
    await db.collection("users").deleteMany({});
    await db.collection("user").deleteMany({});
    await db.collection("account").deleteMany({});
    await db.collection("session").deleteMany({});
    await db.collection("stores").deleteMany({});
    await db.collection("visits").deleteMany({});
    await db.collection("visit_images").deleteMany({});
    await db.collection("ai_analyses").deleteMany({});
    await db.collection("aianalyses").deleteMany({}); // clearing Mongoose default pluralization just in case
    await db.collection("fraud_flags").deleteMany({});
    await db.collection("notifications").deleteMany({});
    // Since audit_logs has a pre hook on Mongoose preventing updates/deletes,
    // we bypass Mongoose and delete using MongoDB driver directly, which is allowed.
    await db.collection("audit_logs").deleteMany({});

    // 3. Map and parse JSON data to proper MongoDB types
    console.log("Parsing mock data to MongoDB types...");

    const additionalStores = [
      {
        _id: "507f1f77bcf86cd799439013",
        storeCode: "DHK-002",
        storeName: "Gulshan Market",
        address: "Road 79, Gulshan 2, Dhaka",
        region: "Dhaka",
        latitude: 23.7925,
        longitude: 90.4078,
        gpsRadiusM: 250,
        isActive: true,
        skus: [
          {
            _id: "664ca7d8a000000000000008",
            skuName: "Pran Mango Juice 250ml",
            brand: "Pran",
            isRequired: true,
            isPosm: false,
            minFacing: 3,
          },
          {
            _id: "664ca7d8a000000000000009",
            skuName: "Pran Mango Juice 1L",
            brand: "Pran",
            isRequired: true,
            isPosm: false,
            minFacing: 2,
          },
          {
            _id: "664ca7d8a00000000000000a",
            skuName: "Pran Shelf Talker",
            brand: "Pran",
            isRequired: false,
            isPosm: true,
            minFacing: 1,
          },
        ],
        createdAt: "2026-05-21T09:05:00.000Z",
      },
      {
        _id: "507f1f77bcf86cd799439014",
        storeCode: "DHK-003",
        storeName: "Mirpur Super Shop",
        address: "Section 10, Mirpur, Dhaka",
        region: "Dhaka",
        latitude: 23.8067,
        longitude: 90.3686,
        gpsRadiusM: 300,
        isActive: true,
        skus: [
          {
            _id: "664ca7d8a00000000000000b",
            skuName: "Fresh Atta 2kg",
            brand: "Fresh",
            isRequired: true,
            isPosm: false,
            minFacing: 2,
          },
          {
            _id: "664ca7d8a00000000000000c",
            skuName: "Fresh Flour 1kg",
            brand: "Fresh",
            isRequired: true,
            isPosm: false,
            minFacing: 2,
          },
          {
            _id: "664ca7d8a00000000000000d",
            skuName: "Fresh Promo Wobbler",
            brand: "Fresh",
            isRequired: false,
            isPosm: true,
            minFacing: 1,
          },
        ],
        createdAt: "2026-05-21T09:10:00.000Z",
      },
      {
        _id: "507f1f77bcf86cd799439015",
        storeCode: "SYL-001",
        storeName: "Sylhet City Mart",
        address: "Zindabazar, Sylhet",
        region: "Sylhet",
        latitude: 24.8949,
        longitude: 91.8687,
        gpsRadiusM: 300,
        isActive: true,
        skus: [
          {
            _id: "664ca7d8a00000000000000e",
            skuName: "Aarong Milk 500ml",
            brand: "Aarong",
            isRequired: true,
            isPosm: false,
            minFacing: 3,
          },
          {
            _id: "664ca7d8a00000000000000f",
            skuName: "Aarong Yogurt 500g",
            brand: "Aarong",
            isRequired: true,
            isPosm: false,
            minFacing: 2,
          },
          {
            _id: "664ca7d8a000000000000010",
            skuName: "Aarong Chiller Sticker",
            brand: "Aarong",
            isRequired: false,
            isPosm: true,
            minFacing: 1,
          },
        ],
        createdAt: "2026-05-21T09:15:00.000Z",
      },
      {
        _id: "507f1f77bcf86cd799439016",
        storeCode: "RAJ-001",
        storeName: "Rajshahi Trade Center",
        address: "Shaheb Bazar, Rajshahi",
        region: "Rajshahi",
        latitude: 24.3745,
        longitude: 88.6042,
        gpsRadiusM: 350,
        isActive: false,
        skus: [
          {
            _id: "664ca7d8a000000000000011",
            skuName: "ACI Salt 1kg",
            brand: "ACI",
            isRequired: true,
            isPosm: false,
            minFacing: 4,
          },
          {
            _id: "664ca7d8a000000000000012",
            skuName: "ACI Pure Spice 200g",
            brand: "ACI",
            isRequired: true,
            isPosm: false,
            minFacing: 2,
          },
          {
            _id: "664ca7d8a000000000000013",
            skuName: "ACI Shelf Strip",
            brand: "ACI",
            isRequired: false,
            isPosm: true,
            minFacing: 1,
          },
        ],
        createdAt: "2026-05-21T09:20:00.000Z",
      },
    ];

    const { hashPassword } = await import("better-auth/crypto");
    const defaultPasswordHash = await hashPassword("Password123!");

    const users = mockData.users.map((u: any) => ({
      ...u,
      _id: new ObjectId(u._id),
      createdAt: new Date(u.createdAt),
    }));

    const betterAuthUsers = mockData.users.map((u: any) => ({
      _id: new ObjectId(u._id),
      name: u.fullName,
      fullName: u.fullName,
      email: u.email.toLowerCase(),
      emailVerified: false,
      role: u.role,
      region: u.region || "Global",
      phone: u.phone,
      isActive: u.isActive !== false,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.createdAt),
    }));

    const betterAuthAccounts = mockData.users.map((u: any) => ({
      _id: new ObjectId(),
      accountId: u._id,
      providerId: "credential",
      userId: new ObjectId(u._id),
      password: defaultPasswordHash,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.createdAt),
    }));

    const storesByCode = new Map(
      [...mockData.stores, ...additionalStores].map((store: any) => [store.storeCode, store])
    );

    const stores = Array.from(storesByCode.values()).map((s: any) => ({
      ...s,
      _id: new ObjectId(s._id),
      skus: s.skus.map((sku: any) => ({
        ...sku,
        _id: new ObjectId(sku._id),
      })),
      createdAt: new Date(s.createdAt),
    }));

    const visits = mockData.visits.map((v: any) => ({
      ...v,
      _id: new ObjectId(v._id),
      repId: new ObjectId(v.repId),
      storeId: new ObjectId(v.storeId),
      images: v.images.map((imgId: string) => new ObjectId(imgId)),
      fraudFlags: v.fraudFlags.map((flagId: string) => new ObjectId(flagId)),
      checkInTime: new Date(v.checkInTime),
      checkOutTime: v.checkOutTime ? new Date(v.checkOutTime) : undefined,
      deletedAt: v.deletedAt ? new Date(v.deletedAt) : null,
      createdAt: new Date(v.createdAt),
    }));

    const visitImages = mockData.visit_images.map((img: any) => ({
      ...img,
      _id: new ObjectId(img._id),
      visitId: new ObjectId(img.visitId),
      exifTakenAt: img.exifTakenAt ? new Date(img.exifTakenAt) : undefined,
      uploadedAt: new Date(img.uploadedAt),
    }));

    const aiAnalyses = mockData.ai_analyses.map((a: any) => ({
      ...a,
      _id: new ObjectId(a._id),
      imageId: new ObjectId(a.imageId),
      visitId: new ObjectId(a.visitId),
      createdAt: new Date(a.createdAt),
    }));

    const fraudFlags = mockData.fraud_flags.map((f: any) => ({
      ...f,
      _id: new ObjectId(f._id),
      visitId: new ObjectId(f.visitId),
      imageId: f.imageId ? new ObjectId(f.imageId) : undefined,
      duplicateOfImageId: f.duplicateOfImageId ? new ObjectId(f.duplicateOfImageId) : undefined,
      reviewedBy: f.reviewedBy ? new ObjectId(f.reviewedBy) : undefined,
      deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
      createdAt: new Date(f.createdAt),
    }));

    const notifications = mockData.notifications.map((n: any) => ({
      ...n,
      _id: new ObjectId(n._id),
      visitId: n.visitId ? new ObjectId(n.visitId) : undefined,
      recipientId: new ObjectId(n.recipientId),
      sentAt: n.sentAt ? new Date(n.sentAt) : undefined,
      createdAt: new Date(n.createdAt),
    }));

    const auditLogs = mockData.audit_logs.map((al: any) => ({
      ...al,
      actorId: al.actorId ? new ObjectId(al.actorId) : undefined,
      entityId: al.entityId ? new ObjectId(al.entityId) : undefined,
      createdAt: new Date(al.createdAt),
    }));

    // 4. Insert seed data into MongoDB
    console.log("Inserting seed documents...");
    
    if (users.length > 0) {
      await db.collection("users").insertMany(users);
      await db.collection("user").insertMany(betterAuthUsers);
      await db.collection("account").insertMany(betterAuthAccounts);
      console.log(`✓ Seeded ${users.length} users (and Better Auth accounts)`);
    }

    if (stores.length > 0) {
      await db.collection("stores").insertMany(stores);
      console.log(`✓ Seeded ${stores.length} stores`);
    }

    if (visits.length > 0) {
      await db.collection("visits").insertMany(visits);
      console.log(`✓ Seeded ${visits.length} visits`);
    }

    if (visitImages.length > 0) {
      await db.collection("visit_images").insertMany(visitImages);
      console.log(`✓ Seeded ${visitImages.length} visit images`);
    }

    if (aiAnalyses.length > 0) {
      // Seed into both ai_analyses and aianalyses to ensure both naming conventions are populated
      await db.collection("ai_analyses").insertMany(aiAnalyses);
      await db.collection("aianalyses").insertMany(aiAnalyses);
      console.log(`✓ Seeded ${aiAnalyses.length} AI analyses`);
    }

    if (fraudFlags.length > 0) {
      await db.collection("fraud_flags").insertMany(fraudFlags);
      console.log(`✓ Seeded ${fraudFlags.length} fraud flags`);
    }

    if (notifications.length > 0) {
      await db.collection("notifications").insertMany(notifications);
      console.log(`✓ Seeded ${notifications.length} notifications`);
    }

    if (auditLogs.length > 0) {
      await db.collection("audit_logs").insertMany(auditLogs);
      console.log(`✓ Seeded ${auditLogs.length} audit logs`);
    }

    console.log("✓ Database seeded successfully with mock compliance data!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    await closeDB();
    console.log("MongoDB connection closed.");
    process.exit(0);
  }
};

seed();
