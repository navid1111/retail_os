import mongoose, { Document, Schema, Model, Types } from "mongoose";

export interface IDetectedProduct {
  name: string;
  brand: string;
  confidence: number;
}

export interface IDetectedCompetitor {
  brand: string;
  count: number;
}

export interface IAiAnalysis {
  imageId: Types.ObjectId;
  visitId: Types.ObjectId;
  provider: string;
  modelName: string;
  complianceScore?: number;
  productsDetected: IDetectedProduct[];
  competitorsDetected: IDetectedCompetitor[];
  posmPresent?: boolean;
  missingSkus: string[];
  issues: string[];
  supervisorSummary?: string;
  rawResponse?: Record<string, unknown>;
  processingMs?: number;
  createdAt: Date;
}

export interface IAiAnalysisDocument extends IAiAnalysis, Document {}

const DetectedProductSchema = new Schema<IDetectedProduct>(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const DetectedCompetitorSchema = new Schema<IDetectedCompetitor>(
  {
    brand: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AiAnalysisSchema = new Schema<IAiAnalysisDocument>(
  {
    imageId: { type: Schema.Types.ObjectId, ref: "VisitImage", required: true },
    visitId: { type: Schema.Types.ObjectId, ref: "Visit", required: true },
    provider: { type: String, required: true },
    modelName: { type: String, required: true },
    complianceScore: { type: Number, min: 0, max: 100 },
    productsDetected: { type: [DetectedProductSchema], default: [] },
    competitorsDetected: { type: [DetectedCompetitorSchema], default: [] },
    posmPresent: { type: Boolean },
    missingSkus: { type: [String], default: [] },
    issues: { type: [String], default: [] },
    supervisorSummary: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
    processingMs: { type: Number },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

AiAnalysisSchema.index({ visitId: 1 });
AiAnalysisSchema.index({ imageId: 1 });

export const AiAnalysis: Model<IAiAnalysisDocument> =
  mongoose.model<IAiAnalysisDocument>("AiAnalysis", AiAnalysisSchema);
