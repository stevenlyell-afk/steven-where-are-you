import { bodyJSON, clean, readJSON, requireAdmin, response, sendRideText, smsConfigured, writeJSON } from "./_common.mjs";

const ACTIVE_STATUSES = new Set(["new", "acknowledged", "en_route", "arrived", "picked_up"]);
const ALL_STATUSES = new Set([...ACTIVE_STATUSES, "completed", "canceled"]);

function normalizeRide(ride) {
  const status = ALL_STATUSES.has(ride.status) ? ride.status : "new";
  return {
    ...ride,
    status,
    statusUpdatedAt: ride.statusUpdatedAt || ride.createdAt,
    statusHistory: Array.isArray(ride.statusHistory)
      ? ride.statusHistory
      : [{ status, at: ride.createdAt }]
  };
}

function publicRide(ride) {
  const normalized = normalizeRide(ride);
  return {
    id: normalized.id,
    name: normalized.name,
    date: normalized.date,
    time: normalized.time,
    pickup: normalized.pickup,
    destination: normalized.destination,
    estimatedMiles: normalized.estimatedMiles,
    createdAt: normalized.createdAt,
    status: normalized.status,
    statusUpdatedAt: normalized.statusUpdatedAt,
    statusHistory: normalized.statusHistory,
    driverLocation: ACTIVE_STATUSES.has(normalized.status) ? normalized.driverLocation || null : null
  };
}

async function saveRequests(requests) {
  await writeJSON("ride-requests", requests.slice(0, 100));
}

export default async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const requests = (await readJSON("ride-requests", [])).map(normalizeRide);
    const id = clean(url.searchParams.get("id"), 100);

    if (id) {
      const ride = requests.find((item) => item.id === id);
      if (!ride) return response({ error: "Ride request not found." }, 404);
      return response({ ride: publicRide(ride) });
    }

    const auth = requireAdmin(url.searchParams.get("pin"));
    if (!auth.ok) return response({ error: auth.error }, auth.status);
    return response({
      requests,
      activeRequests: requests.filter((item) => ACTIVE_STATUSES.has(item.status)),
      historyRequests: requests.filter((item) => !ACTIVE_STATUSES.has(item.status)),
      notificationsConfigured: smsConfigured()
    });
  }

  if (req.method === "PATCH") {
    const body = await bodyJSON(req);
    if (!body) return response({ error: "Invalid request." }, 400);
    const auth = requireAdmin(body.pin);
    if (!auth.ok) return response({ error: auth.error }, auth.status);

    const id = clean(body.id, 100);
    const requests = (await readJSON("ride-requests", [])).map(normalizeRide);
    const index = requests.findIndex((item) => item.id === id);
    if (index < 0) return response({ error: "Ride request not found." }, 404);

    const ride = requests[index];
    if (body.status !== undefined) {
      const status = clean(body.status, 40).toLowerCase();
      if (!ALL_STATUSES.has(status)) return response({ error: "Invalid ride status." }, 400);
      if (status !== ride.status) {
        const at = new Date().toISOString();
        ride.status = status;
        ride.statusUpdatedAt = at;
        ride.statusHistory = [...ride.statusHistory, { status, at }].slice(-30);
        if (!ACTIVE_STATUSES.has(status)) delete ride.driverLocation;
      }
    }

    if (body.location !== undefined) {
      if (!ACTIVE_STATUSES.has(ride.status)) {
        return response({ error: "Location sharing is only available for an active ride." }, 400);
      }
      const latitude = Number(body.location?.latitude);
      const longitude = Number(body.location?.longitude);
      const accuracy = Number(body.location?.accuracy);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return response({ error: "Invalid location." }, 400);
      }
      ride.driverLocation = {
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? Math.max(0, accuracy) : null,
        updatedAt: new Date().toISOString()
      };
    }

    requests[index] = ride;
    await saveRequests(requests);
    return response({ ok: true, ride });
  }

  if (req.method === "DELETE") {
    const body = await bodyJSON(req);
    if (!body) return response({ error: "Invalid request." }, 400);
    const auth = requireAdmin(body.pin);
    if (!auth.ok) return response({ error: auth.error }, auth.status);
    const id = clean(body.id, 100);
    const requests = await readJSON("ride-requests", []);
    const remaining = requests.filter((item) => item.id !== id);
    if (remaining.length === requests.length) return response({ error: "Ride request not found." }, 404);
    await saveRequests(remaining);
    return response({ ok: true });
  }

  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  const body = await bodyJSON(req);
  if (!body) return response({ error: "Invalid request." }, 400);
  if (clean(body.website, 200)) return response({ ok: true, notificationStatus: "not_sent" });

  const createdAt = new Date().toISOString();
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
    createdAt,
    status: "new",
    statusUpdatedAt: createdAt,
    statusHistory: [{ status: "new", at: createdAt }],
    notificationStatus: "pending"
  };
  if (!ride.name || !ride.phone || !ride.date || !ride.time || !ride.pickup || !ride.destination) {
    return response({ error: "Please complete every required field." }, 400);
  }

  const requests = await readJSON("ride-requests", []);
  requests.unshift(ride);
  await saveRequests(requests);

  const notification = await sendRideText(ride);
  ride.notificationStatus = notification.status;
  await saveRequests([ride, ...requests.filter((item) => item.id !== ride.id)]);
  return response({
    ok: true,
    rideId: ride.id,
    statusUrl: `/ride-status.html?id=${encodeURIComponent(ride.id)}`,
    notificationStatus: notification.status
  }, 201);
};
