// All frontend API calls go through here — never import backend lib/ directly (spec §2.5)

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const MP_APP_URL =
  process.env.NEXT_PUBLIC_MP_APP_URL ?? "http://localhost:3002";
