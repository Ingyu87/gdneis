const MODEL = "gemini-2.5-flash";

function normalizeActivityItems(body) {
  return Array.isArray(body.activityBasis) ? body.activityBasis : [body.activityBasis].filter(Boolean);
}

function officerLabel(body) {
  const officer = body.officer || {};
  return `${body.grade}학년: ${officer.term} ${officer.type} ${officer.title}(${officer.period})`;
}

function inferActivityFocus(item) {
  const text = `${item?.category || ""} ${item?.title || ""} ${item?.basis || ""}`;

  if (/자치|회의|규칙|학생자치|학급/.test(text)) {
    return {
      noun: "자치활동",
      verbs: ["의견을 조율함", "학급의 약속을 실천함", "공동의 문제 해결에 참여함"],
    };
  }

  if (/독서|인문|하브루타|토론|질문/.test(text)) {
    return {
      noun: "독서·토론 활동",
      verbs: ["질문을 만들고 생각을 나눔", "친구의 의견을 경청함", "근거를 들어 자신의 생각을 표현함"],
    };
  }

  if (/생태|환경|기후|자원|지속가능/.test(text)) {
    return {
      noun: "생태전환 활동",
      verbs: ["생활 속 실천 방법을 찾아봄", "환경 보호 실천에 참여함", "공동체의 실천 약속을 지킴"],
    };
  }

  if (/예술|문화|가야금|핸드벨|우쿨렐레|표현/.test(text)) {
    return {
      noun: "문화예술 활동",
      verbs: ["표현 활동에 참여함", "친구와 호흡을 맞춤", "연습 과정에서 맡은 역할을 수행함"],
    };
  }

  if (/동아리/.test(text)) {
    return {
      noun: "동아리활동",
      verbs: ["활동 주제에 관심을 가지고 참여함", "맡은 역할을 수행함", "활동 결과를 함께 나눔"],
    };
  }

  return {
    noun: item?.title || "자율·자치활동",
    verbs: ["활동 과정에 꾸준히 참여함", "친구와 협력함", "맡은 역할을 실천함"],
  };
}

function stylePhrase(styles) {
  const selected = Array.isArray(styles) ? styles.join(" ") : "";

  if (/의견|조율|경청/.test(selected)) return "친구의 의견을 경청하고 자신의 생각을 조리 있게 제안하며";
  if (/역할|책임/.test(selected)) return "맡은 역할을 책임감 있게 수행하며";
  if (/문제 해결|실천 방법|규칙|약속/.test(selected)) return "공동의 문제 해결과 실천 과정에 참여하며";
  if (/자료|발표/.test(selected)) return "활동 내용을 정리하고 친구들과 나누며";
  return "활동 과정에 꾸준히 참여하며";
}

function buildOfficerSuggestion(body) {
  const officer = officerLabel(body);
  const activityItems = normalizeActivityItems(body);
  const hasCouncil = activityItems.some((item) => /자치|회의|규칙|학생자치|학급/.test(`${item.title || ""} ${item.basis || ""}`));
  const roleAction = hasCouncil
    ? "학급 자치활동에서 친구들의 의견을 경청하고 회의가 원활하게 이루어지도록 자신의 역할을 책임감 있게 수행함."
    : "공동체 활동에서 친구들의 의견을 경청하고 맡은 역할을 책임감 있게 수행함.";

  return `${officer}으로 활동하며 ${roleAction}`;
}

function buildMockSuggestions(body) {
  if (body.officer?.enabled) {
    return [buildOfficerSuggestion(body)];
  }

  const activityItems = normalizeActivityItems(body);
  const selected = activityItems.slice(0, 2);
  const participation = stylePhrase(body.participationStyles);

  const suggestions = selected.flatMap((item) => {
    const focus = inferActivityFocus(item);
    return [
      `${item.title} 과정에서 ${participation} ${focus.noun}에 성실히 참여함.`,
      `${item.title}에서 ${focus.verbs[1]}으로써 활동 과정에서 드러나는 협력적 태도와 참여도가 돋보임.`,
      `${item.title}에 참여하며 ${focus.verbs[2]}으로써 학교교육계획에 따른 활동을 꾸준히 수행함.`,
      `${item.title} 과정에서 친구들과 생각을 나누고 공동의 활동이 원활하게 이루어지도록 기여함.`,
      `${item.title}에 관심을 가지고 참여하며 활동 과정에서 자신의 역할을 찾아 실천함.`,
    ];
  });

  return suggestions.slice(0, 5);
}

function parseJsonSafely(rawText) {
  const text = String(rawText || "").trim();

  if (!text) {
    throw new Error("빈 JSON 응답입니다.");
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error("JSON 파싱에 실패했습니다.");
  }
}

async function callGemini(apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const activityItems = normalizeActivityItems(body);
  const activityText = activityItems
    .map((item) => `${item.category || ""} / ${item.title || ""} / ${item.basis || ""}`)
    .join("\n");
  const isOfficerMode = Boolean(body.officer?.enabled);
  const countRule = isOfficerMode ? "임원 활동 문장 1개만 작성합니다." : "서로 다른 일반 활동 후보 문장 5개를 작성합니다.";
  const officerRule = isOfficerMode
    ? `임원 표기는 반드시 "${officerLabel(body)}" 형식을 문장 앞부분에 그대로 포함합니다.`
    : "임원 활동은 언급하지 않습니다.";

  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 창의적 체험활동상황 작성을 돕습니다.
2026 학교생활기록부 기재요령에 따라 자율·자치활동 특기사항 후보를 작성합니다.

기재 기준:
- 초등학교는 자율·자치활동과 동아리활동 특기사항을 통합하여 문장으로 입력합니다.
- 활동 결과보다 활동 과정에서 드러난 개별 행동 특성, 참여도, 협력도, 활동실적, 실제 역할을 중심으로 씁니다.
- 정규교육과정 또는 학교교육계획에 근거한 활동만 언급합니다.
- 선택한 활동 근거와 어울리지 않는 참여 방식은 억지로 붙이지 않습니다.
- 참여 방식은 활동 맥락에 맞을 때만 자연스럽게 녹여 씁니다.
- 과장, 단정, 부정적 낙인 표현은 쓰지 않습니다.
- 문장은 학교생활기록부 문체로 "~함.", "~보임.", "~기여함."처럼 끝냅니다.
- ${countRule}
- ${officerRule}

응답은 반드시 {"suggestions": string[]} JSON만 작성합니다.
`;
  const userPrompt = `
학년도: ${body.schoolYear}
학년: ${body.grade}
활동 근거:
${activityText}
참여 방식: ${(body.participationStyles || []).join(", ") || "선택 없음"}
임원 활동: ${isOfficerMode ? officerLabel(body) : "없음"}
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.45,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류(${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = parseJsonSafely(text);
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  return body.officer?.enabled ? suggestions.slice(0, 1) : suggestions.slice(0, 5);
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const activityItems = normalizeActivityItems(body);

  if (!body.schoolYear || !body.grade || !activityItems.some((item) => item?.title)) {
    return res.status(400).json({ error: "요청 데이터가 올바르지 않습니다." });
  }

  if (body.officer?.enabled && (!body.officer.term || !body.officer.type || !body.officer.title || !body.officer.period)) {
    return res.status(400).json({ error: "임원 활동의 학기, 종류, 직책, 재임기간이 필요합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || process.env.USE_MOCK_AI === "true") {
    return res.status(200).json({ suggestions: buildMockSuggestions(body), mock: true });
  }

  try {
    return res.status(200).json({ suggestions: await callGemini(apiKey, body) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}

module.exports = handler;
