import { bodyJSON, clean, defaultState, readJSON, requireAdmin, response, writeJSON } from "./_common.mjs";

export default async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  const body = await bodyJSON(req);
  if (!body) return response({ error: "Invalid request." }, 400);
  const auth = requireAdmin(body.pin);
  if (!auth.ok) return response({ error: auth.error }, auth.status);

  const previous = await readJSON("public-state", defaultState);
  const status = ["available", "busy", "offline"].includes(body.status) ? body.status : "offline";
  const next = {
    ...previous,
    status,
    networkCount: Math.max(0, Math.min(99999, Number(body.networkCount) || 0)),
    currentUpdate: clean(body.currentUpdate, 1000),
    rideAvailable: Boolean(body.rideAvailable),
    temperature: clean(body.temperature, 20),
    weatherDescription: clean(body.weatherDescription, 120),
    articleTitle: clean(body.articleTitle, 240),
    articleTake: clean(body.articleTake, 4000),
    articleUrl: clean(body.articleUrl, 1000),
    aboutText: clean(body.aboutText, 1000),
    updatedAt: new Date().toISOString()
  };
  await writeJSON("public-state", next);
  return response({ ok: true, state: next });
};
