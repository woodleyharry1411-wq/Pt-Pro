import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClientDetailView from "./ClientDetailView";
import type { Client, ClientSession, ClientFeedback } from "@/lib/types";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: sessions }, { data: feedback }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("client_sessions").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_feedback").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  return (
    <ClientDetailView
      client={client as Client}
      sessions={(sessions ?? []) as ClientSession[]}
      feedback={(feedback ?? []) as ClientFeedback[]}
    />
  );
}
