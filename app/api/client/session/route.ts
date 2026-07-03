import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, verifyClient } from "@/lib/clientAuth";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { clientId, dayLabel, note, pin } = await request.json();
  if (!clientId || !dayLabel || String(dayLabel).length > 100) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const denied = await verifyClient(clientId, pin);
  if (denied) return denied;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_sessions")
    .insert({ client_id: clientId, day_label: dayLabel, note: note ?? null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
