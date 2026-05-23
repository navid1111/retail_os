import { describe, expect, it } from "vitest";
import { haversineDistanceM } from "./haversine";

describe("haversineDistanceM", () => {
  it("returns zero for the same coordinate", () => {
    const distance = haversineDistanceM(
      { latitude: 23.7806, longitude: 90.2794 },
      { latitude: 23.7806, longitude: 90.2794 }
    );

    expect(distance).toBe(0);
  });

  it("calculates distance in meters without a geolocation library", () => {
    const distance = haversineDistanceM(
      { latitude: 23.7806, longitude: 90.2794 },
      { latitude: 23.8103, longitude: 90.4125 }
    );

    expect(Math.round(distance)).toBe(13939);
  });
});
