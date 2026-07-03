import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, verifyClient } from "@/lib/clientAuth";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { clientId, weekLabel, days, pin } = await request.json();
  if (!clientId || !Array.isArray(days)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const denied = await verifyClient(clientId, pin);
  if (denied) return denied;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("week_snapshots")
    .insert({ client_id: clientId, week_label: weekLabel ?? null, days });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
