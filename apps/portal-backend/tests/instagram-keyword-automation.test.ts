import test from "node:test";
import assert from "node:assert/strict";

import { extractMetaCommentEvents } from "../lib/meta/meta-comment-events.ts";
import { evaluateInstagramCommentPolicy } from "../lib/services/instagram-comment-policy.ts";
import {
  matchInstagramKeywordAutomation,
  normalizeInstagramKeywordText
} from "../lib/services/instagram-keyword-matcher.ts";

function buildInstagramCommentPayload(text: string) {
  return {
    object: "instagram",
    entry: [
      {
        id: "ig-business-1",
        changes: [
          {
            field: "comments",
            value: {
              id: `comment-${normalizeInstagramKeywordText(text).replace(/\s+/g, "-")}`,
              comment_id: `comment-${normalizeInstagramKeywordText(text).replace(/\s+/g, "-")}`,
              media: { id: "media-reel-negativacao" },
              from: {
                id: "ig-user-123",
                username: "lead_teste"
              },
              text
            }
          }
        ]
      }
    ]
  };
}

test("instagram keyword automation parses comment payloads and recognizes negativacao variants locally", () => {
  const comments = [
    "negativação",
    "Negativação!",
    "quero saber sobre negativação",
    "nome sujo",
    "banco negativou meu nome"
  ];

  for (const text of comments) {
    const parsed = extractMetaCommentEvents(buildInstagramCommentPayload(text));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].channel, "instagram");
    assert.equal(parsed[0].senderId, "ig-user-123");
    assert.equal(parsed[0].mediaId, "media-reel-negativacao");
    assert.equal(parsed[0].commentText, text);

    const match = matchInstagramKeywordAutomation(parsed[0].commentText);
    assert.equal(match.matched, true, `expected keyword match for ${text}`);
    assert.equal(match.keyword, "negativacao");
    assert.equal(match.topic, "bancario");
    assert.equal(match.area, "consumidor_bancario");
    assert.equal(match.normalizedText.includes("negativação"), false);
  }
});

test("instagram keyword policy prepares safe NoemIA handoff and blocked outbound state without provider calls", () => {
  const parsed = extractMetaCommentEvents(buildInstagramCommentPayload("quero saber sobre negativação"))[0];
  const match = matchInstagramKeywordAutomation(parsed.commentText);
  const policy = evaluateInstagramCommentPolicy({
    channel: "instagram",
    commentText: parsed.commentText,
    topic: match.topic,
    autoDmSupported: false
  });

  const simulatedOutbound = {
    publicReply: policy.publicReply,
    direct: policy.shouldAttemptAutoDm ? "queued" : "blocked/action_required",
    leadEventPrepared: parsed.commentId.length > 0 && match.matched,
    noemiaSafeResponsePrepared:
      typeof policy.publicReply === "string" &&
      policy.publicReply.includes("orientar") &&
      !policy.publicReply.includes("garant")
  };

  assert.equal(policy.decision, "public_reply_and_invite_dm");
  assert.equal(policy.inviteToDm, true);
  assert.equal(policy.shouldAttemptAutoDm, false);
  assert.equal(policy.directTransitionStatus, "auto_dm_unavailable");
  assert.equal(simulatedOutbound.direct, "blocked/action_required");
  assert.equal(simulatedOutbound.leadEventPrepared, true);
  assert.equal(simulatedOutbound.noemiaSafeResponsePrepared, true);
});

test("instagram keyword matcher avoids broad unsafe false positives", () => {
  assert.equal(matchInstagramKeywordAutomation("o banco da praça quebrou").matched, false);
  assert.equal(matchInstagramKeywordAutomation("spc").matched, true);
  assert.equal(matchInstagramKeywordAutomation("especial").matched, false);
});
