export type ConsultationAppointmentState =
  | "not_created"
  | "preconfirmed"
  | "created"
  | "confirmed"
  | "cancelled"
  | "rescheduled";

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export type FormalAppointmentRuleAssessment = {
  appointmentState: ConsultationAppointmentState;
  shouldCreateAppointment: boolean;
  shouldConfirmConsultation: boolean;
  reason: string;
};

export function evaluateFormalAppointmentRule(input: {
  ownerProfileId?: string | null;
  schedulingState?: string | null;
  scheduleConfirmedAt?: string | null;
  paymentState?: string | null;
  paymentApprovedAt?: string | null;
}): FormalAppointmentRuleAssessment {
  const hasOwner = Boolean(input.ownerProfileId);
  const hasConfirmedSchedule =
    input.schedulingState === "confirmed" || Boolean(input.scheduleConfirmedAt);
  const hasApprovedPayment =
    input.paymentState === "approved" || Boolean(input.paymentApprovedAt);
  const paymentState = normalizeText(input.paymentState);

  if (!hasConfirmedSchedule) {
    return {
      appointmentState: "not_created",
      shouldCreateAppointment: false,
      shouldConfirmConsultation: false,
      reason: "Ainda falta horario confirmado para materializar a consulta."
    };
  }

  if (!hasApprovedPayment) {
    return {
      appointmentState: "preconfirmed",
      shouldCreateAppointment: false,
      shouldConfirmConsultation: false,
      reason:
        paymentState === "failed" || paymentState === "expired" || paymentState === "abandoned"
          ? "Horario confirmado, mas o fechamento travou no pagamento."
          : "Horario confirmado. Falta pagamento aprovado para appointment formal."
    };
  }

  if (!hasOwner) {
    return {
      appointmentState: "preconfirmed",
      shouldCreateAppointment: false,
      shouldConfirmConsultation: false,
      reason: "Pagamento aprovado, mas ainda falta owner para formalizar case e appointment."
    };
  }

  return {
    appointmentState: "confirmed",
    shouldCreateAppointment: true,
    shouldConfirmConsultation: true,
    reason: "Horario confirmado, pagamento aprovado e owner definido sustentam o appointment formal."
  };
}
