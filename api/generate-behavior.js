const MODEL = "gemini-2.5-flash";

function buildMock(inputText) {
  const hasCooperation = /모둠|친구|협력|경청|발표|의견/.test(inputText);
  const hasResponsibility = /과제|기록|준비|책임|역할|마감/.test(inputText);

  return {
    strengths: [
      hasCooperation
        ? "친구의 의견을 경청하고 필요한 내용을 차분히 정리하며 공동 활동에 안정적으로 참여함."
        : "수업과 생활 장면에서 주어진 활동에 성실히 참여하며 자신의 생각을 표현하려는 태도가 돋보임.",
      hasResponsibility
        ? "맡은 역할과 과제를 책임감 있게 수행하려고 노력하며 활동 과정에서 꾸준히 실천하려는 태도를 보임."
        : "학습 활동에 필요한 준비와 참여 태도가 안정적이며 주변 상황을 이해하며 행동하려는 모습을 보임.",
      "의견이 다른 상황에서도 차분히 조율하려고 노력하며 긍정적인 관계 형성에 기여함.",
      "자신에게 주어진 일을 끝까지 해내는 태도를 보이며 학교생활 전반에서 성실한 모습을 확인할 수 있음.",
      "주변 친구들과 원만하게 지내며 학급 활동에 필요한 배려와 책임감을 실천하려는 모습을 보임.",
    ],
    coachings: [
      "활동 전에 해야 할 일을 몇 가지로 스스로 정리하는 습관을 기른다면 수업과 생활 장면에서 더욱 안정적으로 참여하는 긍정적인 방향으로 변화할 것으로 기대됨.",
      "친구의 말을 끝까지 들은 뒤 자신의 생각을 차분히 말하는 연습을 한다면 협력과 소통 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
      "과제 수행 시간을 미리 확인하고 마무리 여부를 스스로 점검하는 습관을 기른다면 자기관리 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
      "어려운 상황에서 바로 포기하지 않고 필요한 도움을 요청하거나 다시 시도하는 경험을 늘린다면 문제 해결 태도가 긍정적인 방향으로 변화할 것으로 기대됨.",
      "생활 속 약속을 작은 행동으로 정해 꾸준히 실천하는 습관을 기른다면 학교생활 적응 태도가 더욱 긍정적인 방향으로 변화할 것으로 기대됨.",
    ],
  };
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

function normalizeList(value) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
}

async function callGemini(apiKey, inputText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const systemPrompt = `
당신은 초등학교 교사의 학교생활기록부 작성을 돕는 AI 조수입니다.
문법, 어법, 문맥이 자연스럽고 공식적인 학교생활기록부에 기재하기에 적절한 문장을 생성해야 합니다.

아래 관찰 기록을 분석하여 강점 중심 예시문장 5개와 성장을 위한 코칭 예시문장 5개로 변환합니다.

매우 중요:
- 생성 문장에는 절대 따옴표(" 또는 ')를 포함하지 않습니다.
- 학생 이름, 성별, 가정환경, 진단명처럼 입력에 없는 개인정보나 추정 정보를 넣지 않습니다.
- 비난, 낙인, 단정적 평가, 치료적 표현을 피하고 관찰 가능한 행동과 앞으로의 성장 가능성을 중심으로 씁니다.
- 같은 뜻의 문장을 단어만 바꾸어 반복하지 말고, 관계, 책임감, 자기관리, 의사소통, 학습태도 등 서로 다른 초점을 반영합니다.

1. 강점 중심 문장(strengths):
- 결핍 표현을 그대로 순화하는 데서 멈추지 말고, 입력된 행동을 긍정적인 잠재력과 태도로 재해석합니다.
- 각 문장은 관찰 근거가 드러나는 구체적인 행동 1개 이상을 포함합니다.
- 조금 길게 작성하되 한 문장으로 끝냅니다.
- 어미는 ~함., ~임., ~음. 등 학교생활기록부 문체로 정중하게 끝냅니다.
- 예: 친구의 의견을 경청하고 필요한 내용을 차분히 정리하며 공동 활동에 안정적으로 참여함.

2. 성장을 위한 코칭 문장(coachings):
- 학생의 부족함을 단정하지 않고, 실천 가능한 연습이나 습관을 구체적으로 제시합니다.
- 반드시 조건과 기대 변화를 함께 씁니다.
- ...한다면 ... 것으로 기대됨., ... 부분에 조금 더 주의를 기울인다면 ...할 수 있을 것임.과 같은 형식을 사용합니다.
- 어미는 ~됨., ~임., ~음. 등 학교생활기록부 문체로 정중하게 끝냅니다.

응답은 반드시 아래 JSON 형식만 작성합니다.
{
  "strengths": ["문장1", "문장2", "문장3", "문장4", "문장5"],
  "coachings": ["문장1", "문장2", "문장3", "문장4", "문장5"]
}
`;
  const userPrompt = `관찰 기록: ${inputText}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.35,
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

  return {
    strengths: normalizeList(parsed.strengths),
    coachings: normalizeList(parsed.coachings),
  };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const inputText = String(req.body?.inputText || "").trim();

  if (!inputText) {
    return res.status(400).json({ error: "관찰 기록이 필요합니다." });
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
