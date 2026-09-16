import { bodyJSON, clean, defaultState, readJSON, response, writeJSON } from "./_common.mjs";

export default async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  const body = await bodyJSON(req);
  if (!body) return response({ error: "Invalid request." }, 400);
  const state = await readJSON("public-state", defaultState);

  if (body.kind === "weatherVote" && ["kite", "cold", "melt"].includes(body.vote)) {
    state.weatherVotes = { ...defaultState.weatherVotes, ...(state.weatherVotes || {}) };
    state.weatherVotes[body.vote] += 1;
  } else if (body.kind === "articleReaction" && ["agree", "unsure", "disagree"].includes(body.reaction)) {
    state.articleReactions = { ...defaultState.articleReactions, ...(state.articleReactions || {}) };
    state.articleReactions[body.reaction] += 1;
  } else if (body.kind === "comment") {
    const comment = clean(body.comment, 1000);
    if (!comment) return response({ error: "Comment is empty." }, 400);
    const comments = await readJSON("comments", []);
    comments.unshift({ id: crypto.randomUUID(), comment, createdAt: new Date().toISOString() });
    await writeJSON("comments", comments.slice(0, 200));
  } else {
    return response({ error: "Unknown feedback type." }, 400);
  }

  await writeJSON("public-state", state);
  return response({ ok: true, state });
};
