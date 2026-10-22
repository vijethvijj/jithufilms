import { describe, expect, it } from "vitest";
import { enquirySchema, serviceNames } from "./enquiryValidation";

const validEnquiry = {
  name: "Avery James",
  email: "avery@example.com",
  phone: "+1 555 0100",
  eventType: "Wedding",
  eventDate: "2027-05-16",
  eventLocation: "Riverside Hall",
  services: ["Wedding Photography"],
  message: "We are planning an intimate celebration.",
  website: "",
};

describe("enquirySchema", () => {
  it("accepts a complete enquiry and normalizes surrounding whitespace", () => {
    const result = enquirySchema.parse({ ...validEnquiry, name: "  Avery James  " });
    expect(result.name).toBe("Avery James");
    expect(result.services).toEqual(["Wedding Photography"]);
  });

  it("rejects an invalid email, impossible date, and empty service selection", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, email: "not-an-email" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, eventDate: "2027-02-31" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, services: [] }).success).toBe(false);
  });

  it("rejects unsupported service values, overlong text, and unexpected properties", () => {
    expect(serviceNames).toHaveLength(5);
    expect(enquirySchema.safeParse({ ...validEnquiry, services: ["Event Photography"] }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, services: ["Other service"] }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, message: "x".repeat(3001) }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, admin: true }).success).toBe(false);
  });
});
