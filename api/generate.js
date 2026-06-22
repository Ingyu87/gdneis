const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

function toCount(value) {
  return Math.max(Number.parseInt(value, 10) || 0, 0);
}

function safeCounts(counts = {}) {
  return {
    excellent: toCount(counts.excellent),
    good: toCount(counts.good),
    effort: toCount(counts.effort),
  };
}

function splitStandards(standardText) {
  const text = String(standardText || "").trim();
  if (!text) return [];

  const matches = [...text.matchAll(/\[[^\]]+\]\s*([^\[]+)/g)];
  if (matches.length) {
    return matches.map((match) => match[0].replace(/\/\s*$/, "").trim()).filter(Boolean);
  }

  return text
    .split(/\s*\/\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanStandardText(standard) {
  return String(standard || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\/\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?。]+$/g, "")
    .trim();
}

function sentenceEnd(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeRecordSentence(text) {
  return String(text || "")
    .replace(/\s*[,，]\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSentence({ subject, domain, standard, level, variant }) {
  const standardText = cleanStandardText(standard);
  const focus = standardText || `${domain} 영역의 학습 내용`;
  const starters = {
    excellent: [
      `성취기준 '${focus}'에 따라 핵심 개념을 정확히 이해하고 활동에서 스스로 설명함`,
      `성취기준 '${focus}'를 바탕으로 탐구 과정에 주도적으로 참여하며 배운 내용을 구체적으로 표현함`,
      `성취기준 '${focus}'와 관련한 과제를 성실히 해결하고 자신의 생각을 근거를 들어 말함`,
    ],
    good: [
      `성취기준 '${focus}'의 기본 흐름을 이해하고 수업 활동에 꾸준히 참여함`,
      `성취기준 '${focus}'와 관련한 과제를 성실히 수행하며 배운 내용을 정리하려고 노력함`,
      `성취기준 '${focus}'를 학습하는 과정에서 친구의 의견을 듣고 자신의 생각을 말하며 참여함`,
    ],
    effort: [
      `성취기준 '${focus}'의 기초를 익히기 위해 수업 활동에 참여하며 안내에 따라 과제를 수행함`,
      `성취기준 '${focus}'와 관련한 학습 내용을 다시 확인하며 차근차근 이해하려고 노력함`,
      `성취기준 '${focus}'를 배우는 과정에서 필요한 도움을 받아 활동에 참여하고 자신감을 길러 감`,
    ],
  };

  const pool = starters[level] || starters.good;
  const sentence = pool[variant % pool.length];
  return sentenceEnd(sentence.replace(`${subject}의 `, ""));
}

function buildMockLevelSentences(body, level, count) {
  const domain = body.domainEntry?.domain || body.subject || "교과";
  const standards = splitStandards(body.domainEntry?.standard);
  const standardList = standards.length ? standards : [body.domainEntry?.standard || domain];

  return Array.from({ length: count }, (_, index) => {
    const sentences = standardList.map((standard, standardIndex) =>
      buildSentence({
        subject: body.subject || "교과",
        domain,
        standard,
        level,
        variant: index + standardIndex,
      })
    );
    return sentences.join(" ");
  });
}

function buildMockDomainResult(body) {
  const counts = safeCounts(body.counts);
  return {
    excellent_sentences: buildMockLevelSentences(body, "excellent", counts.excellent),
    good_sentences: buildMockLevelSentences(body, "good", counts.good),
    effort_sentences: buildMockLevelSentences(body, "effort", counts.effort),
  };
}

function normalizeSentenceCount(sentences, fallbackSentences, count) {
  const normalized = Array.isArray(sentences)
    ? sentences.map((sentence) => normalizeRecordSentence(sentence)).filter(Boolean).slice(0, count)
    : [];

  for (const sentence of fallbackSentences || []) {
    if (normalized.length >= count) break;
    const normalizedFallback = normalizeRecordSentence(sentence);
    if (!normalized.includes(normalizedFallback)) normalized.push(normalizedFallback);
  }

  return normalized;
}

function parseJsonSafely(rawText) {
  const text = String(rawText || "").trim();
  if (!text) throw new Error("빈 JSON 응답입니다.");
  try {
    return JSON.parse(text);
  } catch (_error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("JSON 파싱에 실패했습니다.");
  }
}

async function postGemini(apiKey, systemPrompt, userPrompt, generationConfig) {
  const errors = [];

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    const errorText = await response.text();
    errors.push(`${model}: ${response.status} ${errorText}`);
    if (![404, 429, 500, 503].includes(response.status)) break;
  }

  throw new Error(`Gemini API error: ${errors.join(" | ")}`);
}

async function callGeminiForDomain(apiKey, body) {
  const counts = safeCounts(body.counts);
  const standards = splitStandards(body.domainEntry?.standard);
  const standardLines = (standards.length ? standards : [body.domainEntry?.standard || ""])
    .map((standard, index) => `${index + 1}. ${standard}`)
    .join("\n");

  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 학기말 종합의견 작성을 돕습니다.
반드시 제공된 성취기준의 내용에 맞춰 예시문장을 작성합니다.
영역명만 반복하거나 성취기준과 무관한 일반 문장을 만들지 않습니다.
과장, 순위, 단정적인 평가를 피하고 관찰 가능한 학습 태도와 성장 모습을 씁니다.
문체는 학교생활기록부 문체로 '~함', '~보임', '~길러 감'처럼 끝냅니다.
응답은 반드시 {"excellent_sentences": string[], "good_sentences": string[], "effort_sentences": string[]} JSON으로만 작성합니다.
`;

  const userPrompt = `
학년: ${body.grade}
과목: ${body.subject}
영역: ${body.domainEntry?.domain || ""}

성취기준 목록:
${standardLines}

생성 개수:
- 상 문장: ${counts.excellent}개
- 중 문장: ${counts.good}개
- 하 문장: ${counts.effort}개

작성 규칙:
1. 배열의 각 항목은 하나의 예시문장 묶음입니다.
2. 성취기준이 ${Math.max(standards.length, 1)}개이면 각 항목도 반드시 ${Math.max(standards.length, 1)}개의 문장으로 작성합니다.
3. 여러 성취기준이 있으면 순서대로 각각 한 문장씩 반영합니다.
4. 각 문장은 해당 성취기준의 핵심어와 활동 내용을 구체적으로 포함합니다.
5. 요청한 개수만큼만 생성하고 중복 표현을 피합니다.
`;

  const text = await postGemini(apiKey, systemPrompt, userPrompt, {
    responseMimeType: "application/json",
    temperature: 0.45,
    topP: 0.9,
  });
  const parsed = parseJsonSafely(text);
  const fallback = buildMockDomainResult(body);

  return {
    excellent_sentences: normalizeSentenceCount(parsed.excellent_sentences, fallback.excellent_sentences, counts.excellent),
    good_sentences: normalizeSentenceCount(parsed.good_sentences, fallback.good_sentences, counts.good),
    effort_sentences: normalizeSentenceCount(parsed.effort_sentences, fallback.effort_sentences, counts.effort),
  };
}

async function callGeminiForCombined(apiKey, body) {
  const domains = Array.isArray(body.domains) ? body.domains : [];
  const domainText = domains
    .slice(0, 8)
    .map((entry, index) => {
      const standards = splitStandards(entry.standard);
      const standardText = (standards.length ? standards : [entry.standard || ""])
        .map((standard, standardIndex) => `  ${standardIndex + 1}) ${standard}`)
        .join("\n");
      return `${index + 1}. ${entry.domain || ""}\n${standardText}`;
    })
    .join("\n");

  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 학기말 종합의견 작성을 돕습니다.
교육과정 성취기준과 교사 관찰 메모를 바탕으로 교사가 고쳐 쓸 수 있는 예시문장을 작성합니다.
제공된 성취기준과 무관한 일반적인 문장을 만들지 않습니다.
응답은 반드시 {"suggestions": string[]} JSON으로만 작성합니다.
`;

  const userPrompt = `
학년: ${body.grade}
과목: ${body.subject}
성취기준:
${domainText}
교사 관찰 메모: ${body.teacherNote || "없음"}

서로 다른 학기말 종합의견 예시문장 5개를 생성하세요.
각 예시는 위 성취기준의 핵심 내용을 골고루 반영해야 합니다.
`;

  const text = await postGemini(apiKey, systemPrompt, userPrompt, {
    responseMimeType: "application/json",
    temperature: 0.45,
    topP: 0.9,
  });
  const parsed = parseJsonSafely(text);
  return Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [];
}

function buildMockSuggestions(body) {
  const domains = Array.isArray(body.domains) ? body.domains.slice(0, 4) : [];
  const subject = body.subject || "교과";
  const notes = String(body.teacherNote || "").trim();
  const standards = domains.flatMap((entry) => splitStandards(entry.standard).slice(0, 2));
  const basis = standards.length ? standards : domains.map((entry) => entry.domain).filter(Boolean);

  return Array.from({ length: 5 }, (_, index) => {
    const parts = basis.slice(0, 4).map((standard, standardIndex) =>
      buildSentence({
        subject,
        domain: domains[standardIndex]?.domain || subject,
        standard,
        level: index % 3 === 0 ? "excellent" : "good",
        variant: index + standardIndex,
      })
    );
    if (notes) parts.push(sentenceEnd(`${notes}의 모습이 관찰되어 학습에 대한 책임감을 꾸준히 길러 감`));
    return parts.join(" ");
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  if (!body.grade || !body.subject) {
    return res.status(400).json({ error: "학년과 과목이 필요합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const useMock = !apiKey || process.env.USE_MOCK_AI === "true";

  if (body.domainEntry?.domain) {
    if (!body.domainEntry?.standard) {
      return res.status(400).json({ error: "성취기준이 필요합니다." });
    }
    if (useMock) {
      return res.status(200).json({ ...buildMockDomainResult(body), mock: true });
    }

    try {
      return res.status(200).json(await callGeminiForDomain(apiKey, body));
    } catch (error) {
      return res.status(200).json({
        ...buildMockDomainResult(body),
        mock: true,
        apiError: error.message || "Gemini API error",
      });
    }
  }

  if (useMock) {
    return res.status(200).json({ suggestions: buildMockSuggestions(body), mock: true });
  }

  try {
    const suggestions = await callGeminiForCombined(apiKey, body);
    return res.status(200).json({ suggestions });
  } catch (error) {
    return res.status(200).json({
      suggestions: buildMockSuggestions(body),
      mock: true,
      apiError: error.message || "Gemini API error",
    });
  }
}

module.exports = handler;
