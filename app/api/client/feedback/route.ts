import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, verifyClient } from "@/lib/clientAuth";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { clientId, message, pin } = await request.json();
  if (!clientId || !message?.trim() || String(message).length > 2000) {
    return NextResponse.json({ error: "clientId and message required" }, { status: 400 });
  }

  const denied = await verifyClient(clientId, pin);
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data: client } = await supabase.from("clients").select("trainer_id").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { error } = await supabase.from("client_feedback").insert({
    client_id: clientId,
    trainer_id: client.trainer_id,
    message: message.trim(),
    from_client: true,
    read: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
