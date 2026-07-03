import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter (per serverless instance — good enough to stop casual abuse)
const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_HITS = 30;

export function rateLimit(request: Request): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return null;
  }
  entry.count++;
  if (entry.count > MAX_HITS) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}

// Verify the client exists and, if a PIN is set, that it matches.
// Clients without a PIN (trainer hasn't set one) pass automatically.
export async function verifyClient(clientId: string, pin?: string): Promise<NextResponse | null> {
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, pin, archived")
    .eq("id", clientId)
    .single();
  if (error || !data || data.archived) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (data.pin && data.pin !== String(pin ?? "")) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }
  return null;
}
