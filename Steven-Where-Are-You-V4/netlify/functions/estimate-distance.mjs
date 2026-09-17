const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function geocode(address) {
  const query = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
    headers: {
      "accept": "application/json",
      "accept-language": "en-US,en",
      "user-agent": "StevenWhereAreYou/4.1 (https://steven-where-are-you.netlify.app/)"
    }
  });
  if (!response.ok) throw new Error("Address lookup is temporarily unavailable.");
  const matches = await response.json();
  if (!matches.length) throw new Error(`Address not found: ${address}`);
  return {
    latitude: Number(matches[0].lat),
    longitude: Number(matches[0].lon)
  };
}

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const url = new URL(req.url);
  const pickup = String(url.searchParams.get("pickup") || "").trim().slice(0, 300);
  const destination = String(url.searchParams.get("destination") || "").trim().slice(0, 300);
  if (!pickup || !destination) return json({ error: "Enter both locations." }, 400);

  try {
    const from = await geocode(pickup);
    await wait(1100);
    const to = await geocode(destination);
    const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const route = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`);
    if (!route.ok) throw new Error("Driving route is temporarily unavailable.");
    const data = await route.json();
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("No driving route was found.");
    return json({
      miles: data.routes[0].distance / 1609.344,
      minutes: Math.round(data.routes[0].duration / 60)
    });
  } catch (error) {
    return json({ error: error.message || "Route could not be calculated." }, 422);
  }
};
