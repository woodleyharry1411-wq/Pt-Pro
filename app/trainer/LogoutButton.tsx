"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/colours";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/trainer/login");
    router.refresh();
  }

  return (
    <button onClick={logout} style={{
      background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
      color: C.muted, fontSize: 13, padding: "6px 14px", fontWeight: 600,
    }}>
      Sign out
    </button>
  );
}
