import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/clientAuth";

// Public endpoint: look up a client programme by name + PIN (for client portal)
export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const pin = searchParams.get("pin")?.trim() ?? "";

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, goal, fitness_level, equipment, days_per_week, programme, pin")
    .ilike("name", name)
    .eq("archived", false)
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ client: null });
  }

  // If the trainer has set a PIN, it must match
  if (data.pin && data.pin !== pin) {
    return NextResponse.json({ client: null, pinRequired: true });
  }

  const [{ data: feedback }, { data: snapshots }] = await Promise.all([
    supabase
      .from("client_feedback")
      .select("id, message, from_client, created_at")
      .eq("client_id", data.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("week_snapshots")
      .select("id, week_label, days, created_at")
      .eq("client_id", data.id)
      .order("created_at", { ascending: true }),
  ]);

  const { pin: _pin, ...client } = data;
  return NextResponse.json({ client: { ...client, feedback: feedback ?? [], snapshots: snapshots ?? [] } });
}
