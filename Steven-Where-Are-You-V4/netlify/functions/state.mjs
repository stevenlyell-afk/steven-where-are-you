import { defaultState, readJSON, response } from "./_common.mjs";

export default async (req) => {
  if (req.method !== "GET") return response({ error: "Method not allowed." }, 405);
  const state = await readJSON("public-state", defaultState);
  return response({ ...defaultState, ...state });
};
