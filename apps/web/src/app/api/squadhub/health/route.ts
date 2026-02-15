import { NextResponse } from "next/server";
import { checkHealth } from "@clawe/shared/squadhub";
import { getConnection } from "@/lib/squadhub/connection";

export async function POST() {
  const result = await checkHealth(getConnection());
  return NextResponse.json(result);
}
