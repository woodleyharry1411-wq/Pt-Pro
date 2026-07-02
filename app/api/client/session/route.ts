import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { clientId, dayLabel, note } = await request.json();
  if (!clientId || !dayLabel) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_sessions")
    .insert({ client_id: clientId, day_label: dayLabel, note: note ?? null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
