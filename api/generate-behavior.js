const MODEL = "gemini-2.5-flash";

function buildMock(inputText) {
  const hasCooperation = /모둠|친구|협력|경청|발표|의견/.test(inputText);
  const hasResponsibility = /과제|기록|준비|책임|역할|마감/.test(inputText);

  return {
    strengths: [
      hasCooperation
        ? "친구의 의견을 경청하고 필요한 내용을 차분히 정리하며 공동의 활동에 안정적으로 참여함."
        : "수업과 생활 장면에서 주어진 활동에 성실히 참여하며 자신의 생각을 표현하려는 태도가 돋보임.",
      hasResponsibility
        ? "맡은 역할과 과제를 책임감 있게 수행하려고 노력하며 활동 과정에서 꾸준한 실천 태도를 보임."
        : "학습 활동에 필요한 준비와 참여 태도가 안정적이며 주변 상황을 살피며 행동하려는 모습이 보임.",
      "의견이 다른 상황에서도 차분히 조율하려고 노력하며 긍정적인 관계 형성에 기여함.",
      "자신에게 주어진 일을 끝까지 해내려는 태도를 보이며 학교생활 전반에서 성실한 모습을 나타냄.",
      "주변 친구들과 원만하게 지내며 학급 활동에 필요한 배려와 책임감을 실천하려는 모습이 보임.",
    ],
    coachings: [
      "활동 전에 해야 할 일을 한 가지씩 스스로 정리하는 연습을 한다면 수업과 생활 장면에서 더욱 안정적으로 참여하는 긍정적인 방향으로 바뀔 것으로 예상됨.",
      "친구의 말을 끝까지 들은 뒤 자신의 생각을 차분히 말하는 연습을 한다면 협력적 소통 태도가 더욱 긍정적인 방향으로 바뀔 것으로 예상됨.",
      "과제 수행 시간을 미리 확인하고 마무리 여부를 점검하는 연습을 한다면 자기관리 태도가 더욱 긍정적인 방향으로 바뀔 것으로 예상됨.",
      "어려운 상황에서 바로 포기하지 않고 도움을 요청하거나 다시 시도하는 경험을 늘린다면 문제 해결 태도가 긍정적인 방향으로 변화할 것으로 기대됨.",
      "생활 속 약속을 작은 단위로 정해 꾸준히 실천하는 연습을 한다면 학교생활 적응 태도가 더욱 긍정적인 방향으로 바뀔 것으로 예상됨.",
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

async function callGemini(apiKey, inputText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 행동특성 및 종합의견 작성을 돕습니다.
입력된 관찰 기록을 바탕으로 강점 중심 후보 5개와 성장 코칭 후보 5개를 작성합니다.

작성 원칙:
- 초등학교 학교생활기록부 문체로 간결하게 작성합니다.
- 비난, 낙인, 진단처럼 보이는 표현은 쓰지 않습니다.
- 관찰 가능한 행동과 앞으로의 성장 가능성을 중심으로 씁니다.
- 강점 문장은 "~함.", "~보임.", "~기여함."처럼 기록문체로 끝냅니다.
- 성장 코칭 문장은 반드시 조건과 예상 변화를 함께 씁니다.
- 성장 코칭 문장은 반드시 "...연습을 한다면 ... 긍정적인 방향으로 바뀔 것으로 예상됨." 또는 "...경험을 늘린다면 ... 긍정적인 방향으로 변화할 것으로 기대됨." 형식으로 작성합니다.
- 성장 코칭 문장은 학생의 부족함을 단정하지 말고, 실천 가능한 연습이나 경험을 구체적으로 제시합니다.

응답은 반드시 {"strengths": string[], "coachings": string[]} JSON만 작성합니다.
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

  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
    coachings: Array.isArray(parsed.coachings) ? parsed.coachings.slice(0, 5) : [],
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
