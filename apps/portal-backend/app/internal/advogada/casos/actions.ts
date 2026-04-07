"use server";

import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/guards";
import {
  buildInternalCaseHref,
  buildInternalNewCaseHref
} from "@/lib/navigation";
import {
  createCaseForClient,
  updateCaseDetails,
  updateCaseStatus
} from "@/lib/services/manage-cases";
import { registerPortalEvent } from "@/lib/services/register-event";

function encodeError(error: unknown, fallback: string) {
  return encodeURIComponent(error instanceof Error ? error.message : fallback);
}

export async function createInternalCaseAction(formData: FormData) {
  const profile = await requireProfile(["advogada", "admin"]);
  const clientId = String(formData.get("clientId") || "").trim();
  let createdCaseId = "";

  try {
    const result = await createCaseForClient(
      {
        clientId,
        area: formData.get("area"),
        title: formData.get("title"),
        summary: formData.get("summary"),
        priority: formData.get("priority"),
        status: formData.get("status"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
    createdCaseId = result.caseId;
  } catch (error) {
    redirect(`${buildInternalNewCaseHref(clientId)}?error=${encodeError(error, "erro-ao-abrir-caso")}`);
  }

  redirect(`${buildInternalCaseHref(createdCaseId)}?success=caso-criado`);
}

export async function updateInternalCaseDetailsAction(formData: FormData) {
  const profile = await requireProfile(["advogada", "admin"]);
  const caseId = String(formData.get("caseId") || "").trim();

  try {
    await updateCaseDetails(
      {
        caseId,
        area: formData.get("area"),
        title: formData.get("title"),
        summary: formData.get("summary"),
        priority: formData.get("priority"),
        changeSummary: formData.get("changeSummary"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    redirect(`${buildInternalCaseHref(caseId)}?error=${encodeError(error, "erro-ao-editar-caso")}#editar`);
  }

  redirect(`${buildInternalCaseHref(caseId)}?success=caso-editado#editar`);
}

export async function updateInternalCaseStatusAction(formData: FormData) {
  const profile = await requireProfile(["advogada", "admin"]);
  const caseId = String(formData.get("caseId") || "").trim();

  try {
    await updateCaseStatus(
      {
        caseId,
        status: formData.get("status"),
        internalNote: formData.get("internalNote"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    redirect(
      `${buildInternalCaseHref(caseId)}?error=${encodeError(
        error,
        "erro-ao-atualizar-status"
      )}#status`
    );
  }

  redirect(`${buildInternalCaseHref(caseId)}?success=status-atualizado#status`);
}

export async function registerInternalCaseEventAction(formData: FormData) {
  const profile = await requireProfile(["advogada", "admin"]);
  const caseId = String(formData.get("caseId") || "").trim();

  try {
    await registerPortalEvent(
      {
        caseId,
        eventType: formData.get("eventType"),
        title: formData.get("title"),
        description: formData.get("description"),
        publicSummary: formData.get("publicSummary"),
        occurredAt: formData.get("occurredAt"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on",
        payload: {
          source: "painel-advogada"
        }
      },
      profile.id
    );
  } catch (error) {
    redirect(
      `${buildInternalCaseHref(caseId)}?error=${encodeError(
        error,
        "erro-ao-registrar"
      )}#andamento`
    );
  }

  redirect(`${buildInternalCaseHref(caseId)}?success=atualizacao-registrada#andamento`);
}
