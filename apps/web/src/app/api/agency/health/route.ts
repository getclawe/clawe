import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/openclaw/client";

export async function POST() {
  const result = await checkHealth();
  return NextResponse.json(result);
}
