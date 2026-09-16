import { bodyJSON, clean, readJSON, requireAdmin, response, sendRideText, smsConfigured, writeJSON } from "./_common.mjs";

export default async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const auth = requireAdmin(url.searchParams.get("pin"));
    if (!auth.ok) return response({ error: auth.error }, auth.status);
    const requests = await readJSON("ride-requests", []);
    return response({ requests, notificationsConfigured: smsConfigured() });
  }

  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  const body = await bodyJSON(req);
  if (!body) return response({ error: "Invalid request." }, 400);
  if (clean(body.website, 200)) return response({ ok: true, notificationStatus: "not_sent" });

  const ride = {
    id: crypto.randomUUID(),
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    date: clean(body.date, 20),
    time: clean(body.time, 20),
    pickup: clean(body.pickup, 300),
    destination: clean(body.destination, 300),
    notes: clean(body.notes, 500),
    estimatedMiles: clean(body.estimatedMiles, 40),
    createdAt: new Date().toISOString(),
    notificationStatus: "pending"
  };
  if (!ride.name || !ride.phone || !ride.date || !ride.time || !ride.pickup || !ride.destination) {
    return response({ error: "Please complete every required field." }, 400);
  }

  const requests = await readJSON("ride-requests", []);
  requests.unshift(ride);
  await writeJSON("ride-requests", requests.slice(0, 100));

  const notification = await sendRideText(ride);
  ride.notificationStatus = notification.status;
  await writeJSON("ride-requests", [ride, ...requests.filter((item) => item.id !== ride.id)].slice(0, 100));
  return response({ ok: true, notificationStatus: notification.status }, 201);
};
