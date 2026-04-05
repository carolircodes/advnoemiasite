import "server-only";

import * as net from "node:net";
import * as tls from "node:tls";

import { getNotificationEnv } from "../config/env";

type DeliveryInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SmtpResponse = {
  code: number;
  raw: string;
};

type SmtpSession = {
  read: (expectedCodes: number[]) => Promise<SmtpResponse>;
  writeLine: (line: string) => void;
  writeRaw: (value: string) => void;
  close: () => void;
};

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match?.[1]?.trim() || value.trim();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function escapeSmtpContent(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function buildMimeMessage(input: {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const boundary = `portal-${crypto.randomUUID()}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeSmtpContent(input.text),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeSmtpContent(input.html),
    "",
    `--${boundary}--`,
    ""
  ];

  return headers.join("\r\n");
}

function consumeSmtpResponse(buffer: string) {
  let cursor = 0;
  const lines: string[] = [];

  while (cursor < buffer.length) {
    const lineBreak = buffer.indexOf("\r\n", cursor);

    if (lineBreak === -1) {
      return null;
    }

    const line = buffer.slice(cursor, lineBreak);
    cursor = lineBreak + 2;

    if (!line) {
      continue;
    }

    lines.push(line);

    if (/^\d{3} /.test(line) || !/^\d{3}-/.test(line)) {
      return {
        raw: lines.join("\n"),
        rest: buffer.slice(cursor)
      };
    }
  }

  return null;
}

async function createSmtpSession(input: {
  host: string;
  port: number;
  secure: boolean;
}): Promise<SmtpSession> {
  const socket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const nextSocket = input.secure
      ? tls.connect({
          host: input.host,
          port: input.port,
          servername: input.host
        })
      : net.createConnection({
          host: input.host,
          port: input.port
        });

    nextSocket.once(input.secure ? "secureConnect" : "connect", () => resolve(nextSocket));
    nextSocket.once("error", reject);
  });

  socket.setEncoding("utf8");
  socket.setTimeout(20_000, () => {
    socket.destroy(new Error("Timeout aguardando resposta do servidor SMTP."));
  });

  let buffer = "";
  let pendingResolve: ((response: SmtpResponse) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  const flush = () => {
    if (!pendingResolve) {
      return;
    }

    const parsed = consumeSmtpResponse(buffer);

    if (!parsed) {
      return;
    }

    buffer = parsed.rest;
    const code = Number.parseInt(parsed.raw.slice(0, 3), 10);
    const resolve = pendingResolve;
    pendingResolve = null;
    pendingReject = null;
    resolve({
      code,
      raw: parsed.raw
    });
  };

  socket.on("data", (chunk: string | Buffer) => {
    buffer += chunk.toString();
    flush();
  });

  socket.on("error", (error) => {
    if (pendingReject) {
      pendingReject(error instanceof Error ? error : new Error(String(error)));
      pendingResolve = null;
      pendingReject = null;
    }
  });

  socket.on("close", () => {
    if (pendingReject) {
      pendingReject(new Error("Conexao SMTP encerrada antes da resposta esperada."));
      pendingResolve = null;
      pendingReject = null;
    }
  });

  const read = async (expectedCodes: number[]) => {
    const response = await new Promise<SmtpResponse>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      flush();
    });

    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `Servidor SMTP respondeu ${response.code} quando o esperado era ${expectedCodes.join(
          ", "
        )}: ${response.raw}`
      );
    }

    return response;
  };

  return {
    read,
    writeLine(line: string) {
      socket.write(`${line}\r\n`);
    },
    writeRaw(value: string) {
      socket.write(value);
    },
    close() {
      socket.end("QUIT\r\n");
    }
  };
}

async function sendViaSmtp(input: DeliveryInput) {
  const config = getNotificationEnv();

  if (!config.emailFrom) {
    throw new Error("Defina EMAIL_FROM para enviar notificacoes por SMTP.");
  }

  if (!config.smtpHost || !config.smtpPort) {
    throw new Error(
      "Defina NOTIFICATIONS_SMTP_HOST e NOTIFICATIONS_SMTP_PORT para enviar notificacoes por SMTP."
    );
  }

  const session = await createSmtpSession({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure
  });

  const fromAddress = extractAddress(config.emailFrom);
  const toAddress = extractAddress(input.to);

  try {
    await session.read([220]);
    session.writeLine("EHLO localhost");
    try {
      await session.read([250]);
    } catch {
      session.writeLine("HELO localhost");
      await session.read([250]);
    }

    if (config.smtpUser && config.smtpPass) {
      const authToken = Buffer.from(
        `\u0000${config.smtpUser}\u0000${config.smtpPass}`,
        "utf8"
      ).toString("base64");
      session.writeLine(`AUTH PLAIN ${authToken}`);
      await session.read([235]);
    }

    session.writeLine(`MAIL FROM:<${fromAddress}>`);
    await session.read([250]);
    session.writeLine(`RCPT TO:<${toAddress}>`);
    await session.read([250, 251]);
    session.writeLine("DATA");
    await session.read([354]);
    session.writeRaw(
      `${buildMimeMessage({
        from: config.emailFrom,
        replyTo: config.replyTo,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      })}\r\n.\r\n`
    );
    await session.read([250]);
  } finally {
    session.close();
  }
}

async function sendViaResend(input: DeliveryInput) {
  const config = getNotificationEnv();

  if (!config.resendApiKey) {
    throw new Error("Defina RESEND_API_KEY para enviar notificacoes com Resend.");
  }

  if (!config.emailFrom) {
    throw new Error("Defina EMAIL_FROM para enviar notificacoes com Resend.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: config.replyTo
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao enviar e-mail com Resend: ${details}`);
  }
}

export async function sendNotificationEmail(input: DeliveryInput) {
  const config = getNotificationEnv();

  if (config.provider === "resend") {
    await sendViaResend(input);
    return;
  }

  await sendViaSmtp(input);
}
