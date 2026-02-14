import { NextResponse } from "next/server";
import { checkHealth } from "@clawe/shared/agency";

export async function POST() {
  const result = await checkHealth();
  return NextResponse.json(result);
}
