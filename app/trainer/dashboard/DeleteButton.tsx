"use client";

import { C } from "@/lib/colours";
import { deleteClient } from "@/lib/actions";

export default function DeleteButton({ clientId }: { clientId: string }) {
  return (
    <form action={() => deleteClient(clientId)} style={{ position: "absolute", top: 12, right: 12 }}>
      <button
        type="submit"
        onClick={e => { if (!confirm("Delete this client?")) e.preventDefault(); }}
        style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", padding: 4 }}
      >
        ✕
      </button>
    </form>
  );
}
