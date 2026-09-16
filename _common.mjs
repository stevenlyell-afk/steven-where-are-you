import { getStore } from "@netlify/blobs";

export const defaultState = {
  status: "available",
  networkCount: 5,
  currentUpdate: "Around town today.",
  rideAvailable: true,
  temperature: "103",
  weatherDescription: "Sunny · Las Vegas",
  articleTitle: "Welcome to As Steven Sees It",
  articleTake: "Steven's latest thought will appear here.",
  articleUrl: "",
  aboutText: "Driver. Operations guy. Las Vegas local.",
  weatherVotes: { kite: 0, cold: 0, melt: 0 },
  articleReactions: { agree: 0, unsure: 0, disagree: 0 },
  updatedAt: null
};

const store = () => getStore("steven-where-are-you-v4");

export async function readJSON(key, fallback) {
  try {
    const value = await store().get(key, { type: "json", consistency: "strong" });
    return value ?? fallback;
  } catch (error) {
    console.error(`Could not read ${key}`, error);
    return fallback;
  }
}

export async function writeJSON(key, value) {
  await store().setJSON(key, value);
  return value;
}

export function response(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function bodyJSON(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function requireAdmin(pin) {
  const expected = process.env.ADMIN_PIN;
  if (!expected) return { ok: false, status: 503, error: "ADMIN_PIN is not configured in Netlify." };
  if (clean(pin, 100) !== expected) return { ok: false, status: 401, error: "Incorrect PIN." };
  return { ok: true };
}

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.SMS_TO_NUMBER &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

export async function sendRideText(ride) {
  if (!smsConfigured()) return { status: "not_configured" };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const params = new URLSearchParams({
    To: process.env.SMS_TO_NUMBER,
    Body: `New ride request from ${ride.name} (${ride.phone || "no phone"}) for ${ride.date} at ${ride.time}. ${ride.pickup} to ${ride.destination}${ride.notes ? `. Notes: ${ride.notes}` : ""}`
  });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", process.env.TWILIO_FROM_NUMBER);
  }

  try {
    const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    if (!result.ok) {
      console.error("Twilio rejected the message", result.status, await result.text());
      return { status: "failed" };
    }
    return { status: "sent" };
  } catch (error) {
    console.error("Text alert failed", error);
    return { status: "failed" };
  }
}
