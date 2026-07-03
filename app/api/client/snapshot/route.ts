import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { clientId, weekLabel, days } = await request.json();
  if (!clientId || !days) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("week_snapshots")
    .insert({ client_id: clientId, week_label: weekLabel ?? null, days });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
