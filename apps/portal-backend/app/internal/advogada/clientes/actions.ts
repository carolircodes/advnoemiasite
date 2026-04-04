"use server";

import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/guards";
import { buildInternalClientHref } from "@/lib/navigation";
import { updateClientRecord } from "@/lib/services/manage-clients";

export async function updateInternalClientAction(formData: FormData) {
  const profile = await requireProfile(["advogada", "admin"]);
  const clientId = String(formData.get("clientId") || "").trim();
  const baseHref = clientId ? buildInternalClientHref(clientId) : "/internal/advogada";

  try {
    await updateClientRecord(
      {
        clientId,
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        cpf: formData.get("cpf"),
        phone: formData.get("phone"),
        status: formData.get("status"),
        notes: formData.get("notes"),
        isActive: formData.get("isActive") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-atualizar-cliente";
    redirect(`${baseHref}?error=${message}#dados`);
  }

  redirect(`${baseHref}?success=cliente-atualizado#dados`);
}
