import { z } from "zod";

export const serviceNames = [
  "Wedding Photography",
  "Cinematic Wedding Films",
  "Pre-Wedding Photography",
  "Engagement Photography",
  "Albums and Prints",
] as const;

const eventTypes = ["Wedding", "Engagement", "Pre-wedding", "Portraits", "Special event", "Other"] as const;

const eventDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid event date")
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid event date");

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).optional().default(""),
  eventType: z.enum(eventTypes),
  eventDate,
  eventLocation: z.string().trim().max(180).optional().default(""),
  services: z.array(z.enum(serviceNames)).min(1).max(serviceNames.length),
  message: z.string().trim().max(3000).optional().default(""),
  website: z.string().max(180).optional().default(""),
}).strict();

export type EnquiryInput = z.infer<typeof enquirySchema>;
