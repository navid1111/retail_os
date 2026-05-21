import { z } from "zod";

const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format - must be parseable by Date.parse()",
  });

export const dashboardFeedQuerySchema = z.object({
  date: dateStringSchema.optional(),
});

export const dashboardChartQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});
