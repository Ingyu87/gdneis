const MODEL = "gemini-2.5-flash";

function buildMockSuggestions(body) {
  const activityItems = Array.isArray(body.activityBasis) ? body.activityBasis : [body.activityBasis].filter(Boolean);
  const activity = activityItems.map((item) => item.title).filter(Boolean).join(", ") || "자율·자치활동";
  const styles = Array.isArray(body.participationStyles) && body.participationStyles.length
    ? body.participationStyles.join(", ")
    : "꾸준히 참여함";
  const officer = body.officer?.enabled
    ? ` ${body.grade}학년 ${body.officer.term} ${body.officer.type} ${body.officer.title}(${body.officer.period})로 활동하며`
    : "";

  return [
    `${activity}에 ${styles}의 태도로 참여하고 공동의 활동이 원활히 이루어지도록 기여함.`,
    `${activity} 과정에서 친구들의 의견을 경청하고 자신의 생각을 조리 있게 제안하며 협력적인 태도를 보임.`,
    `${activity}에 책임감 있게 참여하며 맡은 일을 끝까지 수행하고 학급 공동체 활동에 성실히 기여함.`,
    `${activity}에서${officer} 친구들과 함께 문제를 해결하려는 태도를 보이고 공동체 의식을 기름.`,
    `${activity}에 적극적으로 참여하며 활동 과정에서 배려와 소통의 태도를 실천하고 자신의 역할을 충실히 수행함.`
  ];
}

function parseJsonSafely(rawText) {
  const text = String(rawText || "").trim();
  if (!text) throw new Error("빈 JSON 응답입니다.");
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
  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 작성을 돕는 조력자입니다.
자율·자치활동 및 동아리활동 통합 특기사항 후보를 작성합니다.
정규교육과정 또는 학교교육계획에 근거한 활동만 언급합니다.
활동 결과보다 과정에서 드러난 참여도, 협력, 역할, 활동 실적을 중심으로 씁니다.
과장, 단정, 부정적인 낙인 표현은 피합니다.
모든 문장은 학교생활기록부 문체로 '~함', '~보임', '~기름'처럼 끝냅니다.
응답은 반드시 {"suggestions": string[]} JSON으로만 작성합니다.
`;
  const activityItems = Array.isArray(body.activityBasis) ? body.activityBasis : [body.activityBasis].filter(Boolean);
  const activityText = activityItems
    .map((item) => `${item.category || ""} / ${item.title || ""} / ${item.basis || ""}`)
    .join("\n");
  const userPrompt = `
학년도: ${body.schoolYear}
학년: ${body.grade}
활동 근거:
${activityText}
참여 방식: ${(body.participationStyles || []).join(", ")}
임원 활동: ${body.officer?.enabled ? `${body.grade}학년 ${body.officer.term} ${body.officer.type} ${body.officer.title}(${body.officer.period})` : "없음"}

서로 다른 후보 문장 5개를 생성하세요.
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
        topP: 0.9
      }
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

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const activityItems = Array.isArray(body.activityBasis) ? body.activityBasis : [body.activityBasis].filter(Boolean);
  if (!body.schoolYear || !body.grade || !activityItems.some((item) => item?.title)) {
    return res.status(400).json({ error: "요청 데이터가 올바르지 않습니다." });
  }

  if (process.env.USE_MOCK_AI === "true") {
    return res.status(200).json({ suggestions: buildMockSuggestions(body), mock: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
