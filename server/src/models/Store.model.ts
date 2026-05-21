import mongoose, { Document, Schema, Model, Types } from "mongoose";

export interface ISku {
  _id: Types.ObjectId;
  skuName: string;
  brand: string;
  isRequired: boolean;
  isPosm: boolean;
  minFacing: number;
}

const SkuSchema = new Schema<ISku>(
  {
    skuName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: true },
    isPosm: { type: Boolean, default: false },
    minFacing: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

export interface IStore {
  storeCode: string;
  storeName: string;
  address?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  gpsRadiusM: number;
  isActive: boolean;
  skus: ISku[];
  createdAt: Date;
}

export interface IStoreDocument extends IStore, Document {}

const StoreSchema = new Schema<IStoreDocument>(
  {
    storeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    storeName: { type: String, required: true, trim: true },
    address: { type: String },
    region: { type: String, index: true },
    latitude: { type: Number },
    longitude: { type: Number },
    gpsRadiusM: { type: Number, default: 300 },
    isActive: { type: Boolean, default: true, index: true },
    skus: { type: [SkuSchema], default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Store: Model<IStoreDocument> = mongoose.model<IStoreDocument>("Store", StoreSchema);
