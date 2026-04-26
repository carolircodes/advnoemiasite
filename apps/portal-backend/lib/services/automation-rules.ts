import "server-only";

import { CLIENT_LOGIN_PATH } from "../auth/access-control.ts";
import {
  caseAreaLabels,
  formatPortalDateTime,
  publicIntakeStageLabels,
  publicIntakeUrgencyLabels
} from "../domain/portal.ts";
import {
  listStaffEmailRecipients,
  queueEmailNotification
} from "../notifications/outbox.ts";
import { queueGovernedNotification } from "../notifications/governed-outbox.ts";
import { isPushPilotCandidate } from "../notifications/push-pilot.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";

type AutomationDispatchInput = {
  ruleKey: string;
  entityType: string;
  entityKey: string;
  metadata?: Record<string, unknown>;
};

type QueuedAutomationNotificationInput = AutomationDispatchInput & {
  eventType: string;
  recipientProfileId?: string;
  recipientEmail: string;
  subject: string;
  templateKey: string;
  payload: Record<string, unknown>;
  relatedTable: string;
  relatedId?: string | null;
};

type AutomationRunSummary = {
  generated: number;
  triageAlerts: number;
  triageUrgentAlerts: number;
  inviteReminders: number;
  documentReminders: number;
  appointmentReminders: number;
};

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function claimAutomationDispatch(input: AutomationDispatchInput) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("automation_dispatches")
    .insert({
      rule_key: input.ruleKey,
      entity_type: input.entityType,
      entity_key: input.entityKey,
      metadata: input.metadata || {}
    })
    .select("id")
    .single();

  if (isUniqueViolation(error)) {
    return null;
  }

  if (error || !data) {
    throw new Error(
      error?.message || "Nao foi possivel registrar o disparo da automacao."
    );
  }

  return data.id as string;
}

async function releaseAutomationDispatch(dispatchId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("automation_dispatches").delete().eq("id", dispatchId);

  if (error) {
    console.error("[automations.dispatch] Failed to release dispatch", {
      dispatchId,
      message: error.message
    });
  }
}

async function finalizeAutomationDispatch(dispatchId: string, notificationId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("automation_dispatches")
    .update({
      notification_id: notificationId,
      dispatched_at: new Date().toISOString()
    })
    .eq("id", dispatchId);

  if (error) {
    throw new Error(
      `Nao foi possivel concluir o registro da automacao: ${error.message}`
    );
  }
}

async function queueAutomationNotification(input: QueuedAutomationNotificationInput) {
  const dispatchId = await claimAutomationDispatch(input);

  if (!dispatchId) {
    return null;
  }

  try {
    const governedEventKey =
      input.templateKey === "triage-submitted"
        ? "operations.intake.new"
        : input.templateKey === "triage-urgent"
          ? "operations.intake.urgent"
          : input.templateKey === "invite-reminder"
            ? "client.portal.return"
            : input.templateKey === "document-request-reminder"
              ? "client.document.pending"
              : input.templateKey === "appointment-reminder"
                ? "client.appointment.reminder"
                : null;

    const notification = governedEventKey
      ? await queueGovernedNotification({
          eventKey: governedEventKey,
          channel: "email",
          recipientProfileId: input.recipientProfileId || null,
          recipientAddress: input.recipientEmail,
          subject: input.subject,
          templateKey: input.templateKey,
          payload: input.payload,
          relatedTable: input.relatedTable,
          relatedId: input.relatedId || null,
          decisionContext: {
            automationRuleKey: input.ruleKey,
            automationEventType: input.eventType
          }
        })
      : await queueEmailNotification({
          eventType: input.eventType,
          recipientProfileId: input.recipientProfileId || "",
          recipientEmail: input.recipientEmail,
          subject: input.subject,
          templateKey: input.templateKey,
          payload: input.payload,
          relatedTable: input.relatedTable,
          relatedId: input.relatedId || null
        });

    if (governedEventKey && isPushPilotCandidate(governedEventKey) && input.recipientProfileId) {
      try {
        await queueGovernedNotification({
          eventKey: governedEventKey,
          channel: "push",
          recipientProfileId: input.recipientProfileId,
          recipientAddress: input.recipientEmail,
          subject: input.subject,
          templateKey: input.templateKey,
          payload: {
            ...input.payload,
            pushBody:
              governedEventKey === "client.appointment.reminder"
                ? "Seu compromisso esta proximo. Abra a agenda para revisar horario e contexto."
                : "Um documento importante foi liberado no seu portal. Abra para consultar com calma."
          },
          relatedTable: input.relatedTable,
          relatedId: input.relatedId || null,
          decisionContext: {
            automationRuleKey: input.ruleKey,
            automationEventType: input.eventType,
            pilotChannel: "push"
          }
        });
      } catch (pushError) {
        console.warn("[automations.push_pilot] Falha ao enfileirar piloto push", {
          ruleKey: input.ruleKey,
          eventType: governedEventKey,
          message: pushError instanceof Error ? pushError.message : String(pushError)
        });
      }
    }

    await finalizeAutomationDispatch(dispatchId, notification.id);
    return notification.id;
  } catch (error) {
    await releaseAutomationDispatch(dispatchId);
    throw error;
  }
}

function getInviteReminderStage(hoursElapsed: number) {
  if (hoursElapsed >= 72) {
    return "72h";
  }

  if (hoursElapsed >= 24) {
    return "24h";
  }

  return null;
}

async function resolveCaseRecipients(caseIds: string[]) {
  const supabase = createAdminSupabaseClient();
  const uniqueCaseIds = [...new Set(caseIds)];

  if (!uniqueCaseIds.length) {
    return new Map<
      string,
      {
        caseTitle: string;
        clientId: string;
        profileId: string;
        email: string;
        fullName: string;
      }
    >();
  }

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id,title,client_id")
    .in("id", uniqueCaseIds);

  if (casesError) {
    throw new Error(`Nao foi possivel carregar os casos das automacoes: ${casesError.message}`);
  }

  const clientIds = [...new Set((cases || []).map((item) => item.client_id))];
  const { data: clients, error: clientsError } = clientIds.length
    ? await supabase.from("clients").select("id,profile_id").in("id", clientIds)
    : { data: [], error: null };

  if (clientsError) {
    throw new Error(
      `Nao foi possivel carregar os clientes das automacoes: ${clientsError.message}`
    );
  }

  const profileIds = [...new Set((clients || []).map((item) => item.profile_id))];
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(
      `Nao foi possivel carregar os perfis das automacoes: ${profilesError.message}`
    );
  }

  const clientMap = new Map((clients || []).map((item) => [item.id, item]));
  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

  return new Map(
    (cases || [])
      .map((caseItem) => {
        const client = clientMap.get(caseItem.client_id);
        const profile = client ? profileMap.get(client.profile_id) : null;

        if (!client || !profile?.email) {
          return null;
        }

        return [
          caseItem.id,
          {
            caseTitle: caseItem.title,
            clientId: client.id,
            profileId: profile.id,
            email: profile.email,
            fullName: profile.full_name || "Cliente"
          }
        ] as const;
      })
      .filter(Boolean) as Array<
      readonly [
        string,
        {
          caseTitle: string;
          clientId: string;
          profileId: string;
          email: string;
          fullName: string;
        }
      ]
    >
  );
}

export async function notifyStaffAboutIntakeRequest(input: {
  intakeRequestId: string;
  fullName: string;
  caseArea: string;
  urgencyLevel: string;
  currentStage: string;
  preferredContactPeriod: string;
  preferredContactChannel?: string;
  readinessLevel?: string;
  appointmentInterest?: boolean;
  email: string;
  phone: string;
  caseSummary: string;
  submittedAt: string;
}) {
  const recipients = await listStaffEmailRecipients();

  if (!recipients.length) {
    return {
      generated: 0,
      triageAlerts: 0,
      triageUrgentAlerts: 0
    };
  }

  let triageAlerts = 0;
  let triageUrgentAlerts = 0;

  for (const recipient of recipients) {
    const sharedPayload = {
      fullName: input.fullName,
      caseAreaLabel:
        caseAreaLabels[input.caseArea as keyof typeof caseAreaLabels] || input.caseArea,
      urgencyLabel:
        publicIntakeUrgencyLabels[
          input.urgencyLevel as keyof typeof publicIntakeUrgencyLabels
        ] || input.urgencyLevel,
      stageLabel:
        publicIntakeStageLabels[
          input.currentStage as keyof typeof publicIntakeStageLabels
        ] || input.currentStage,
      preferredContactPeriod: input.preferredContactPeriod,
      preferredContactChannel: input.preferredContactChannel || "",
      readinessLevel: input.readinessLevel || "",
      appointmentInterest: Boolean(input.appointmentInterest),
      contactEmail: input.email,
      contactPhone: input.phone,
      caseSummary: input.caseSummary,
      submittedAtLabel: formatPortalDateTime(input.submittedAt),
      destinationPath: "/internal/advogada#triagens-recebidas"
    };

    const notificationId = await queueAutomationNotification({
      ruleKey: "triage-submitted-alert",
      entityType: "intake_requests",
      entityKey: `${input.intakeRequestId}:${recipient.profileId}`,
      eventType: "triage_submitted_alert",
      recipientProfileId: recipient.profileId,
      recipientEmail: recipient.email,
      subject: `Nova triagem recebida: ${input.fullName}`,
      templateKey: "triage-submitted",
      payload: sharedPayload,
      relatedTable: "intake_requests",
      relatedId: input.intakeRequestId,
      metadata: {
        urgencyLevel: input.urgencyLevel
      }
    });

    if (notificationId) {
      triageAlerts += 1;
    }

    if (input.urgencyLevel === "urgente") {
      const urgentNotificationId = await queueAutomationNotification({
        ruleKey: "triage-urgent-alert",
        entityType: "intake_requests",
        entityKey: `${input.intakeRequestId}:${recipient.profileId}`,
        eventType: "triage_urgent_alert",
        recipientProfileId: recipient.profileId,
        recipientEmail: recipient.email,
        subject: `Triagem urgente: ${input.fullName}`,
        templateKey: "triage-urgent",
        payload: sharedPayload,
        relatedTable: "intake_requests",
        relatedId: input.intakeRequestId,
        metadata: {
          urgencyLevel: input.urgencyLevel
        }
      });

      if (urgentNotificationId) {
        triageUrgentAlerts += 1;
      }
    }
  }

  return {
    generated: triageAlerts + triageUrgentAlerts,
    triageAlerts,
    triageUrgentAlerts
  };
}

async function queueInviteAccessReminders() {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,invited_at,first_login_completed_at,is_active,role,clients(id,status)"
    )
    .eq("role", "cliente")
    .eq("is_active", true)
    .is("first_login_completed_at", null)
    .not("invited_at", "is", null);

  if (error) {
    throw new Error(
      `Nao foi possivel carregar convites pendentes para automacao: ${error.message}`
    );
  }

  let generated = 0;

  for (const profile of data || []) {
    if (!profile.invited_at || !profile.email) {
      continue;
    }

    const hoursElapsed = (now.getTime() - new Date(profile.invited_at).getTime()) / 3_600_000;
    const reminderStage = getInviteReminderStage(hoursElapsed);

    if (!reminderStage) {
      continue;
    }

    const linkedClient = Array.isArray(profile.clients) ? profile.clients[0] : profile.clients;
    const notificationId = await queueAutomationNotification({
      ruleKey: `invite-access-reminder-${reminderStage}`,
      entityType: "profiles",
      entityKey: profile.id,
      eventType: "invite_access_reminder",
      recipientProfileId: profile.id,
      recipientEmail: profile.email,
      subject:
        reminderStage === "72h"
          ? "Seu acesso ao portal continua aguardando confirmacao"
          : "Seu primeiro acesso ao portal esta pronto",
      templateKey: "invite-reminder",
      payload: {
        fullName: profile.full_name || "Cliente",
        invitedAtLabel: formatPortalDateTime(profile.invited_at),
        reminderStage,
        clientStatus: linkedClient?.status || "",
        destinationPath: CLIENT_LOGIN_PATH
      },
      relatedTable: "profiles",
      relatedId: profile.id,
      metadata: {
        reminderStage
      }
    });

    if (notificationId) {
      generated += 1;
    }
  }

  return generated;
}

async function queueDocumentRequestReminders() {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const fallbackThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("document_requests")
    .select("id,case_id,title,instructions,due_at,status,visible_to_client,created_at")
    .eq("status", "pending")
    .eq("visible_to_client", true);

  if (error) {
    throw new Error(
      `Nao foi possivel carregar solicitacoes documentais para automacao: ${error.message}`
    );
  }

  const recipients = await resolveCaseRecipients((data || []).map((item) => item.case_id));
  let generated = 0;

  for (const request of data || []) {
    const recipient = recipients.get(request.case_id);

    if (!recipient) {
      continue;
    }

    const dueAt = request.due_at || null;
    const reminderStage = dueAt
      ? dueAt < now.toISOString()
        ? "overdue"
        : dueAt <= soonThreshold
          ? "upcoming"
          : null
      : request.created_at <= fallbackThreshold
        ? "open"
        : null;

    if (!reminderStage) {
      continue;
    }

    const notificationId = await queueAutomationNotification({
      ruleKey: `document-request-reminder-${reminderStage}`,
      entityType: "document_requests",
      entityKey: request.id,
      eventType: "document_request_reminder",
      recipientProfileId: recipient.profileId,
      recipientEmail: recipient.email,
      subject:
        reminderStage === "overdue"
          ? `Lembrete importante: documento pendente para ${recipient.caseTitle}`
          : `Lembrete de documento no portal: ${request.title}`,
      templateKey: "document-request-reminder",
      payload: {
        fullName: recipient.fullName,
        caseTitle: recipient.caseTitle,
        requestTitle: request.title,
        instructions: request.instructions || "",
        dueAtLabel: dueAt ? formatPortalDateTime(dueAt) : "",
        reminderStage,
        destinationPath: "/documentos#solicitacoes-abertas"
      },
      relatedTable: "document_requests",
      relatedId: request.id,
      metadata: {
        reminderStage,
        dueAt
      }
    });

    if (notificationId) {
      generated += 1;
    }
  }

  return generated;
}

async function queueUpcomingAppointmentReminders() {
  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const nextDayIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id,case_id,title,appointment_type,starts_at,status,visible_to_client,notes"
    )
    .in("status", ["scheduled", "confirmed"])
    .eq("visible_to_client", true)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", nextDayIso);

  if (error) {
    throw new Error(`Nao foi possivel carregar compromissos para automacao: ${error.message}`);
  }

  const recipients = await resolveCaseRecipients((data || []).map((item) => item.case_id));
  let generated = 0;

  for (const appointment of data || []) {
    const recipient = recipients.get(appointment.case_id);

    if (!recipient) {
      continue;
    }

    const notificationId = await queueAutomationNotification({
      ruleKey: "appointment-reminder-24h",
      entityType: "appointments",
      entityKey: appointment.id,
      eventType: "appointment_reminder",
      recipientProfileId: recipient.profileId,
      recipientEmail: recipient.email,
      subject: `Lembrete de compromisso: ${appointment.title}`,
      templateKey: "appointment-reminder",
      payload: {
        fullName: recipient.fullName,
        caseTitle: recipient.caseTitle,
        title: appointment.title,
        startsAtLabel: formatPortalDateTime(appointment.starts_at),
        notes: appointment.notes || "",
        destinationPath: "/agenda"
      },
      relatedTable: "appointments",
      relatedId: appointment.id,
      metadata: {
        startsAt: appointment.starts_at
      }
    });

    if (notificationId) {
      generated += 1;
    }
  }

  return generated;
}

export async function runOperationalAutomationRules(): Promise<AutomationRunSummary> {
  const inviteReminders = await queueInviteAccessReminders();
  const documentReminders = await queueDocumentRequestReminders();
  const appointmentReminders = await queueUpcomingAppointmentReminders();

  return {
    generated: inviteReminders + documentReminders + appointmentReminders,
    triageAlerts: 0,
    triageUrgentAlerts: 0,
    inviteReminders,
    documentReminders,
    appointmentReminders
  };
}
