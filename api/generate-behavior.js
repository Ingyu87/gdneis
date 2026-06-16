const MODEL = "gemini-2.5-flash";

function isPositiveRelationshipInput(inputText) {
  return /잘\s*어울|원만|친구.*잘|관계.*좋|협력|배려|돕|친화/.test(inputText);
}

function buildMock(inputText) {
  if (isPositiveRelationshipInput(inputText)) {
    return {
      strengths: [
        "친구들과 원만하게 어울리며 학급 생활 속에서 긍정적인 관계를 형성함.",
        "주변 친구들과 자연스럽게 소통하며 함께하는 활동에 안정적으로 참여함.",
        "친구들과 잘 어울리는 친화적인 태도를 바탕으로 즐겁고 따뜻한 학급 분위기 형성에 기여함.",
        "또래와의 관계에서 편안하게 소통하며 공동체 생활에 필요한 배려와 협력의 태도를 보임.",
        "여러 친구들과 두루 어울리며 학교생활에 적극적으로 참여하는 모습이 돋보임.",
      ],
      coachings: [
        "친구들과 원만하게 어울리는 강점을 바탕으로 모둠 활동에서 서로의 의견을 조율하는 역할을 경험한다면 공동체 안에서 더욱 긍정적인 영향력을 발휘할 수 있을 것임.",
        "또래와 자연스럽게 소통하는 장점을 살려 다양한 친구들과 함께하는 활동에 꾸준히 참여한다면 폭넓은 관계 형성으로 이어질 것으로 기대됨.",
        "친구들과 잘 어울리는 태도를 바탕으로 도움이 필요한 친구에게 먼저 따뜻한 말을 건네는 경험을 늘린다면 배려와 협력의 모습이 더욱 깊어질 것으로 기대됨.",
        "학급 친구들과 원만하게 지내는 모습을 살려 공동 활동에서 자신의 생각을 차분히 나누는 기회를 가진다면 소통 역량이 더욱 자랄 수 있을 것임.",
        "긍정적인 또래 관계를 바탕으로 학급의 다양한 활동에 책임 있게 참여한다면 공동체 생활 속에서 더욱 성숙한 모습을 보일 것으로 기대됨.",
      ],
    };
  }

  return {
    strengths: [
      "수업과 생활 장면에서 주어진 활동에 성실히 참여하며 자신의 생각을 표현하려는 태도가 돋보임.",
      "학습 활동에 필요한 준비와 참여 태도가 안정적이며 주변 상황을 이해하며 행동하려는 모습을 보임.",
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
  const systemPrompt = `당신은 초등학교 교사의 학생생활기록부 작성을 돕는 AI 조수입니다. 문법과 어법, 문맥에 완벽하게 맞는, 공식적인 학교 생활기록부에 기재하기에 적절한 문장을 생성해야 합니다.

**매우 중요: AI가 생성하는 '강점 중심 문장'과 '성장을 위한 코칭 문장'의 내용에는 절대 따옴표(" " 또는 ' ')가 포함되어서는 안 됩니다.**

아래의 '관찰 문장'을 분석하여, '강점 중심 문장' 5개와 '성장을 위한 코칭 문장' 5개로 변환해주세요.

단, 관찰 문장이 이미 긍정적인 내용이라면 부족함을 새로 추정하지 말고, 그 강점을 바탕으로 더 발전할 수 있는 방향을 제안해주세요. 예를 들어 "학생들하고 잘 어울림"은 친구의 입장을 헤아려야 한다는 식의 결핍 표현이 아니라, 원만한 관계 형성의 강점을 확장하는 문장으로 작성해야 합니다.

1.  '강점 중심 문장' (strengths):
    - 학생의 긍정적인 잠재력과 특성을 강조해야 합니다.
    - 구체적인 예시를 포함하여 '조금 길게' 작성해주세요.
    - 어미는 '~함.', '~임.', '~음.' 등으로 정중하게 끝내야 합니다.

2.  '성장을 위한 코칭 문장' (coachings):
    - 학생의 발전을 위한 구체적이고 건설적인 조언을 포함해야 합니다. (예: 자기주도적 학습 계획 수립하는 습관을 기른다면 학업적 부분에서 발전 가능성이 있을 것으로 기대됨.)
    - ...한다면 ... 것으로 기대됨., ... 부분에 조금 더 주의를 기울인다면 ...할 수 있을 것임.과 같은 형식으로 작성해주세요.
    - 어미는 '~됨.', '~임.', '~음.' 등으로 정중하게 끝내야 합니다.

결과는 반드시 아래의 JSON 형식으로 반환해주세요.
{
  "strengths": ["문장1", "문장2", "문장3", "문장4", "문장5"],
  "coachings": ["문장1", "문장2", "문장3", "문장4", "문장5"]
}`;
  const userPrompt = `관찰 문장: "${inputText}"`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
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
