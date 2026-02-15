import type { SquadhubConnection } from "@clawe/shared/squadhub";

export function getConnection(): SquadhubConnection {
  return {
    squadhubUrl: process.env.SQUADHUB_URL || "http://localhost:18790",
    squadhubToken: process.env.SQUADHUB_TOKEN || "",
  };
}
