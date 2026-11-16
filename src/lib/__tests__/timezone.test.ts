import { describe, expect, it } from "vitest";
import { timezoneToSave } from "@/lib/timezone";

describe("timezoneToSave", () => {
  it("returns the browser zone when it differs", () => {
    expect(timezoneToSave("Africa/Cairo", "Asia/Riyadh")).toBe("Asia/Riyadh");
  });

  it("returns null when the zone is unchanged", () => {
    expect(timezoneToSave("Africa/Cairo", "Africa/Cairo")).toBeNull();
  });

  it("ignores missing or invalid zones", () => {
    expect(timezoneToSave("Africa/Cairo", undefined)).toBeNull();
    expect(timezoneToSave("Africa/Cairo", "Mars/Olympus")).toBeNull();
    expect(timezoneToSave("Africa/Cairo", 42)).toBeNull();
  });
});
