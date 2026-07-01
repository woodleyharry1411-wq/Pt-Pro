"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Client, Programme } from "./types";

export async function saveClient(data: Omit<Client, "id" | "trainer_id" | "created_at">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: client, error } = await supabase
    .from("clients")
    .insert({ ...data, trainer_id: user.id })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/trainer/dashboard");
  return client;
}

export async function updateProgramme(clientId: string, programme: Programme) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ programme })
    .eq("id", clientId);
  if (error) throw error;
}

export async function logSession(clientId: string, dayLabel: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_sessions")
    .insert({ client_id: clientId, day_label: dayLabel, note });
  if (error) throw error;
  revalidatePath(`/trainer/dashboard/${clientId}`);
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/trainer/dashboard");
}

export async function loginTrainer(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function logoutTrainer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
