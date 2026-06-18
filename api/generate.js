const MODEL = "gemini-2.5-flash";

function expandMockSentences(templates, count) {
  const targetCount = Math.max(Number(count || 0), 0);
  if (!targetCount || !templates.length) return [];

  const qualifiers = [
    "",
    " 이 과정에서 꾸준한 태도가 나타남.",
    " 활동 전반에서 차분한 참여 태도를 보임.",
    " 배운 내용을 떠올리며 성실하게 참여함.",
    " 친구와 의견을 나누며 학습에 참여함.",
    " 안내된 절차를 따라 안정적으로 수행함.",
    " 자신의 생각을 말로 정리하려는 모습을 보임.",
    " 수업 흐름에 맞추어 과제를 해결하려고 노력함."
  ];

  return Array.from({ length: targetCount }, (_, index) => {
    const template = templates[index % templates.length];
    const qualifier = qualifiers[Math.floor(index / templates.length) % qualifiers.length];
    return qualifier ? `${template.replace(/[.。]$/, "")},${qualifier}` : template;
  });
}

function normalizeSentenceCount(sentences, fallbackSentences, count) {
  const targetCount = Math.max(Number(count || 0), 0);
  const normalized = Array.isArray(sentences) ? sentences.filter(Boolean).slice(0, targetCount) : [];
  if (normalized.length >= targetCount) return normalized;

  for (const sentence of fallbackSentences || []) {
    if (normalized.length >= targetCount) break;
    if (!normalized.includes(sentence)) normalized.push(sentence);
  }

  return normalized;
}

function buildMockSuggestions(body) {
  const domains = Array.isArray(body.domains) ? body.domains.slice(0, 4) : [];
  const names = domains.map((entry) => entry.domain).filter(Boolean);
  const subject = body.subject || "교과";
  const note = String(body.teacherNote || "").trim();
  return [
    `${subject} 학습에서 ${names[0] || "주요 영역"}의 핵심 내용을 이해하고 활동에 성실히 참여하며 배운 내용을 자신의 말로 표현함.`,
    `${subject} 수업 중 친구의 의견을 경청하고 자신의 생각을 조리 있게 말하며 협력적인 학습 태도를 보임.`,
    `${names[1] || subject} 활동에서 과제를 끝까지 해결하려는 태도가 돋보이며 학습 과정에서 꾸준히 성장하는 모습을 보임.`,
    `${subject} 학습 내용을 생활 속 사례와 연결하여 이해하려고 노력하고 발표와 모둠 활동에 적극적으로 참여함.`,
    note ? `${note} 이러한 모습을 바탕으로 학습에 대한 자신감과 책임감을 꾸준히 키워 감.` : `${subject} 활동 전반에서 배움에 대한 관심을 가지고 맡은 과제를 책임감 있게 수행함.`
  ];
}

function buildMockDomainResult(body) {
  const domain = body.domainEntry?.domain || body.subject || "교과";
  const standard = body.domainEntry?.standard || "";
  const excellentCount = Math.max(Number(body.counts?.excellent || 0), 0);
  const goodCount = Math.max(Number(body.counts?.good || 0), 0);
  const effortCount = Math.max(Number(body.counts?.effort || 0), 0);
  const baseExcellent = [
    `${domain} 영역에서 ${standard ? "성취기준을 바탕으로 " : ""}핵심 개념을 잘 이해하고 활동에 적극적으로 참여함.`,
    `${domain} 학습 과정에서 자신의 생각을 분명히 표현하고 친구와 협력하여 과제를 해결함.`,
    `${domain} 활동에서 배운 내용을 생활 속 사례와 연결하여 설명하는 능력이 돋보임.`,
    `${domain} 영역의 탐구 활동에 주도적으로 참여하며 학습 내용을 깊이 있게 이해함.`,
    `${domain} 수업에서 다양한 자료를 활용하여 자신의 의견을 논리적으로 표현함.`
  ];
  const baseGood = [
    `${domain} 영역의 기본 내용을 이해하고 수업 활동에 꾸준히 참여함.`,
    `${domain} 학습에서 주어진 과제를 성실히 수행하며 배운 내용을 정리하려고 노력함.`,
    `${domain} 활동 중 친구의 의견을 듣고 자신의 생각을 말하며 학습에 참여함.`,
    `${domain} 영역에서 필요한 개념을 익히고 활동 과정에 안정적으로 참여함.`,
    `${domain} 학습 과제를 해결하며 배운 내용을 차근차근 적용하려는 태도를 보임.`
  ];
  const baseEffort = [
    `${domain} 영역의 기본 개념을 익히기 위해 수업 활동에 참여하며 점차 자신감을 키워 감.`,
    `${domain} 학습 과제를 해결하는 과정에서 도움을 받아 내용을 정리하고 끝까지 해내려는 태도를 보임.`,
    `${domain} 활동에 관심을 가지고 참여하며 배운 내용을 다시 확인하려고 노력함.`,
    `${domain} 영역에서 필요한 학습 내용을 반복하여 익히며 활동 참여 폭을 넓혀 감.`,
    `${domain} 수업에서 안내에 따라 과제를 수행하며 기본 내용을 이해하려는 모습을 보임.`
  ];
  return {
    excellent_sentences: expandMockSentences(baseExcellent, excellentCount),
    good_sentences: expandMockSentences(baseGood, goodCount),
    effort_sentences: expandMockSentences(baseEffort, effortCount)
  };
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

async function callGemini(apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const domains = Array.isArray(body.domains) ? body.domains : [];
  const domainText = domains
    .slice(0, 8)
    .map((entry) => `- ${entry.domain || ""}: ${entry.standard || ""}`)
    .join("\n");

  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 학기말 종합의견 작성을 돕습니다.
교육과정 성취기준과 교사 관찰 메모를 바탕으로 교사가 고쳐 쓸 수 있는 예시문장을 작성합니다.
과장, 순위화, 단정적인 평가는 피하고 관찰 가능한 학습 태도와 성장 모습을 씁니다.
문장은 학교생활기록부 문체로 '~함', '~보임', '~키워 감'처럼 끝냅니다.
응답은 반드시 {"suggestions": string[]} JSON으로만 작성합니다.
`;
  const userPrompt = `
학년: ${body.grade}
과목: ${body.subject}
요청 개수 참고: 상 ${body.counts?.excellent || 0}, 중 ${body.counts?.good || 0}, 하 ${body.counts?.effort || 0}
성취기준:
${domainText}
교사 관찰 메모: ${body.teacherNote || "없음"}

서로 다른 학기말 종합의견 예시문장 5개를 생성하세요.
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json", temperature: 0.5, topP: 0.9 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류(${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = parseJsonSafely(text);
  return Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [];
}

async function callGeminiForDomain(apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const excellentCount = Math.max(Number(body.counts?.excellent || 0), 0);
  const goodCount = Math.max(Number(body.counts?.good || 0), 0);
  const effortCount = Math.max(Number(body.counts?.effort || 0), 0);
  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 학기말 종합의견 작성을 돕습니다.
평가계획의 영역과 성취기준을 바탕으로 수준별 예시 문장을 작성합니다.
과장, 순위화, 단정적인 평가는 피하고 관찰 가능한 학습 태도와 성장 모습을 씁니다.
문장은 학교생활기록부 문체로 '~함', '~보임', '~키워 감'처럼 끝냅니다.
응답은 반드시 {"excellent_sentences": string[], "good_sentences": string[], "effort_sentences": string[]} JSON으로만 작성합니다.
`;
  const userPrompt = `
학년: ${body.grade}
과목: ${body.subject}
영역: ${body.domainEntry?.domain || ""}
성취기준: ${body.domainEntry?.standard || ""}
상 문장 수: ${excellentCount}
중 문장 수: ${goodCount}
하 문장 수: ${effortCount}

각 수준별로 요청한 개수만큼 서로 다른 문장을 생성하세요.
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json", temperature: 0.5, topP: 0.9 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류(${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = parseJsonSafely(text);
  const fallback = buildMockDomainResult(body);
  return {
    excellent_sentences: normalizeSentenceCount(parsed.excellent_sentences, fallback.excellent_sentences, excellentCount),
    good_sentences: normalizeSentenceCount(parsed.good_sentences, fallback.good_sentences, goodCount),
    effort_sentences: normalizeSentenceCount(parsed.effort_sentences, fallback.effort_sentences, effortCount)
  };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  if (!body.grade || !body.subject) {
    return res.status(400).json({ error: "학년과 과목이 필요합니다." });
  }

  if (body.domainEntry?.domain) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || process.env.USE_MOCK_AI === "true") {
      return res.status(200).json({ ...buildMockDomainResult(body), mock: true });
    }

    try {
      return res.status(200).json(await callGeminiForDomain(apiKey, body));
    } catch (error) {
      return res.status(500).json({ error: error.message || "서버 오류" });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.USE_MOCK_AI === "true") {
    return res.status(200).json({ suggestions: buildMockSuggestions(body), mock: true });
  }

  try {
    const suggestions = await callGemini(apiKey, body);
    return res.status(200).json({ suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}

module.exports = handler;
