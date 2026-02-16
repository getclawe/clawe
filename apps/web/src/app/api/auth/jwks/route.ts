import jwks from "@clawe/backend/dev-jwks/jwks.json";

export const GET = () => Response.json(jwks);
