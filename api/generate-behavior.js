const MODEL = "gemini-2.5-flash";

function buildMock(inputText) {
  const base = inputText || "학교생활 속 여러 활동";
  return {
    strengths: [
      `${base}에서 긍정적인 태도를 보이며 주변 친구들과 협력하려는 마음이 돋보임.`,
      `자신의 관심사를 바탕으로 활동에 참여하고 맡은 일을 성실히 수행하며 성장 가능성을 보임.`,
      `친구의 의견을 경청하고 함께 활동하려는 태도를 지니고 있어 공동체 생활에 안정적으로 참여함.`,
      `수업과 생활 장면에서 자신의 생각을 표현하려고 노력하며 긍정적인 관계 형성에 힘씀.`,
      `주어진 상황에서 도움을 주고받으며 학교생활에 필요한 책임감과 배려심을 키워 감.`
    ],
    coachings: [
      `활동 전 해야 할 일을 스스로 정리하는 습관을 기른다면 참여 태도가 더욱 안정될 것으로 기대됨.`,
      `친구의 의견을 들은 뒤 자신의 생각을 차분히 말하는 경험을 늘린다면 협력적 소통 능력이 향상될 것임.`,
      `과제 수행 시간을 미리 계획하고 끝까지 점검하는 태도를 기른다면 자기관리 역량이 더욱 자랄 것임.`,
      `관심 있는 활동에서 보이는 긍정적인 태도를 다양한 수업 장면으로 넓혀 간다면 더 큰 성장이 기대됨.`,
      `작은 역할부터 책임감 있게 수행하는 경험을 꾸준히 쌓는다면 공동체 안에서 자신감을 키울 수 있을 것임.`
    ]
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

async function callGemini(apiKey, inputText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 행동특성 및 종합의견 작성을 돕습니다.
입력된 관찰 문장을 강점 중심 후보 5개와 성장 코칭 후보 5개로 바꿉니다.
비난, 낙인, 진단처럼 보이는 표현은 피하고 관찰 가능한 행동과 성장 가능성을 씁니다.
문장은 학교생활기록부 문체로 '~함', '~보임', '~기대됨', '~키워 감'처럼 끝냅니다.
응답은 반드시 {"strengths": string[], "coachings": string[]} JSON으로만 작성합니다.
`;
  const userPrompt = `관찰 문장: ${inputText}`;

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
  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
    coachings: Array.isArray(parsed.coachings) ? parsed.coachings.slice(0, 5) : []
  };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const inputText = String(req.body?.inputText || "").trim();
  if (!inputText) {
    return res.status(400).json({ error: "관찰 문장이 필요합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.USE_MOCK_AI === "true") {
    return res.status(200).json({ ...buildMock(inputText), mock: true });
  }

  try {
    return res.status(200).json(await callGemini(apiKey, inputText));
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}

module.exports = handler;
