import type { Express, Request } from "express";
import { insertBookingEnquiry } from "./db";
import { enquirySchema } from "./enquiryValidation";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 3;
const requests = new Map<string, { startedAt: number; count: number }>();

function requestKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isAllowed(req: Request, now = Date.now()) {
  for (const [key, value] of requests) {
    if (now - value.startedAt > WINDOW_MS) requests.delete(key);
  }
  if (requests.size > 10_000) requests.clear();

  const key = requestKey(req);
  const current = requests.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    requests.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_SUBMISSIONS) return false;
  current.count += 1;
  return true;
}

export function registerEnquiryRoute(app: Express) {
  app.post("/api/enquiries", async (req, res) => {
    if (!isAllowed(req)) {
      res.status(429).json({ message: "Too many enquiries from this connection. Please try again in a little while." });
      return;
    }

    const parsed = enquirySchema.safeParse(req.body);
    if (!parsed.success || parsed.data.website.trim()) {
      res.status(400).json({ message: "Please review the form details and try again." });
      return;
    }

    const { website: _honeypot, ...enquiry } = parsed.data;
    try {
      await insertBookingEnquiry({ ...enquiry, services: JSON.stringify(enquiry.services) });
      res.status(201).json({ message: "Your enquiry has been saved. Thank you for sharing a little about your day." });
    } catch (error) {
      console.error("[Enquiries] Could not persist a booking enquiry:", error);
      res.status(503).json({ message: "We couldn't save your enquiry just now. Please try again later." });
    }
  });
}
