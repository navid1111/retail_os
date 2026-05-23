import { Visit } from "../models/Visit.model";

export interface IDashboardFeedItem {
  visitId: string;
  repId: string;
  repName: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  checkInTime: Date;
  checkOutTime?: Date;
  complianceScore?: number;
  status: string;
  hasFraudFlags: boolean;
  fraudFlagCount: number;
}

export interface IDashboardChartItem {
  visitId: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  complianceScore: number;
  checkInTime: Date;
}

/**
 * Retrieves a chronological feed of visits for a specific date (UTC).
 * If no date is provided, it defaults to today.
 */
export async function getDashboardFeed(date?: string | Date): Promise<IDashboardFeedItem[]> {
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Find all visits within the day range that are not soft-deleted
  const visits = await Visit.find({
    checkInTime: { $gte: startOfDay, $lte: endOfDay },
    deletedAt: null,
  })
    .populate("repId", "fullName")
    .populate("storeId", "storeName storeCode")
    .sort({ checkInTime: -1 });

  return visits.map((v: any) => {
    const repName = v.repId?.fullName ?? v.repId?.name ?? "Unknown Rep";
    const storeName = v.storeId?.storeName ?? "Unknown Store";
    const storeCode = v.storeId?.storeCode ?? "UNKNOWN";
    const fraudFlagsCount = v.fraudFlags?.length ?? 0;

    return {
      visitId: v._id.toString(),
      repId: v.repId?._id?.toString() ?? v.repId?.toString() ?? "",
      repName,
      storeId: v.storeId?._id?.toString() ?? v.storeId?.toString() ?? "",
      storeName,
      storeCode,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      complianceScore: v.overallScore,
      status: v.status,
      hasFraudFlags: fraudFlagsCount > 0,
      fraudFlagCount: fraudFlagsCount,
    };
  });
}

/**
 * Retrieves visits that have compliance scores within a given date range (optional).
 */
export async function getDashboardChart(
  startDate?: string | Date,
  endDate?: string | Date
): Promise<IDashboardChartItem[]> {
  const query: any = {
    deletedAt: null,
    overallScore: { $exists: true, $ne: null },
  };

  if (startDate || endDate) {
    query.checkInTime = {};
    if (startDate) {
      query.checkInTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.checkInTime.$lte = new Date(endDate);
    }
  }

  const visits = await Visit.find(query)
    .populate("storeId", "storeName storeCode")
    .sort({ checkInTime: 1 });

  return visits.map((v: any) => ({
    visitId: v._id.toString(),
    storeId: v.storeId?._id?.toString() ?? v.storeId?.toString() ?? "",
    storeName: v.storeId?.storeName ?? "Unknown Store",
    storeCode: v.storeId?.storeCode ?? "UNKNOWN",
    complianceScore: v.overallScore!,
    checkInTime: v.checkInTime,
  }));
}
