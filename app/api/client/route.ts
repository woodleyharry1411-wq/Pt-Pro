import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Public endpoint: look up a client programme by name (for client portal)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, goal, fitness_level, equipment, days_per_week, programme")
    .ilike("name", name)
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ client: null });
  }

  const { data: feedback } = await supabase
    .from("client_feedback")
    .select("id, message, from_client, created_at")
    .eq("client_id", data.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ client: { ...data, feedback: feedback ?? [] } });
}
