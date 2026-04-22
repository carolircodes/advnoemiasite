import { OpenAI } from "openai";

import type { NoemiaDomain } from "./core-types";

type NoemiaProviderRequest = {
  domain: NoemiaDomain;
  message: string;
  systemPrompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type NoemiaProviderResponse = {
  success: boolean;
  response?: string;
  error?: string;
  provider: "openai";
  model?: string;
};

export async function runNoemiaModel(
  request: NoemiaProviderRequest
): Promise<NoemiaProviderResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5.4";

    if (!apiKey) {
      return {
        success: false,
        error: "OPENAI_API_KEY nao configurada",
        provider: "openai",
        model
      };
    }

    const openai = new OpenAI({ apiKey });
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: request.systemPrompt }];

    for (const item of (request.history || []).slice(-8)) {
      messages.push({
        role: item.role,
        content: item.content
      });
    }

    messages.push({ role: "user", content: request.message });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_completion_tokens: getMaxCompletionTokens(request.domain),
      temperature: getTemperature(request.domain)
    });

    const responseText = response.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return {
        success: false,
        error: "Resposta vazia da OpenAI",
        provider: "openai",
        model
      };
    }

    return {
      success: true,
      response: responseText,
      provider: "openai",
      model
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      provider: "openai"
    };
  }
}

function getTemperature(domain: NoemiaDomain) {
  switch (domain) {
    case "internal_operational":
      return 0.3;
    case "channel_comment":
      return 0.6;
    case "commercial_conversion":
      return 0.55;
    case "portal_support":
    case "public_site_chat":
    default:
      return 0.45;
  }
}

function getMaxCompletionTokens(domain: NoemiaDomain) {
  switch (domain) {
    case "channel_comment":
      return 220;
    case "internal_operational":
      return 360;
    case "commercial_conversion":
      return 420;
    case "portal_support":
    case "public_site_chat":
    default:
      return 500;
  }
}
