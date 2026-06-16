const MODEL = "gemini-2.5-flash";
const MAX_COUNT = 25;

function clampCount(value, fallback) {
  return Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), MAX_COUNT);
}

function normalizeCounts(body) {
  const counts = body.counts || {};
  return {
    basis: clampCount(counts.basis ?? counts.excellent, 3),
    combined: clampCount(counts.combined, 5),
  };
}

function normalizeActivityItems(body) {
  return Array.isArray(body.activityBasis) ? body.activityBasis : [body.activityBasis].filter(Boolean);
}

function semesterLabel(body) {
  return `${body.semester || "1"}학기`;
}

function officerLabel(body) {
  const officer = body.officer || {};
  return `${body.grade}학년: ${officer.term} ${officer.type} ${officer.title}(${officer.period})`;
}

function buildOfficerActivity(body) {
  if (!body.officer?.enabled) return null;
  return {
    id: "__officer",
    category: `${body.grade}학년 ${body.officer.term} 임원 활동`,
    title: `${body.officer.type} ${body.officer.title} 임원 활동`,
    basis: `${officerLabel(body)}으로 활동하며 회의 진행, 의견 조율, 학급 공동체 활동 지원, 맡은 역할의 책임 있는 수행을 관찰 근거로 반영`,
    source: "사용자 입력 임원 활동",
  };
}

function getActivityItemsWithOfficer(body) {
  const items = normalizeActivityItems(body);
  const officerActivity = buildOfficerActivity(body);
  if (!officerActivity || items.some((item) => item?.id === officerActivity.id)) return items;
  return [...items, officerActivity];
}

function inferActivityFocus(item) {
  const primaryText = `${item?.category || ""} ${item?.title || ""}`;
  const text = `${item?.category || ""} ${item?.title || ""} ${item?.basis || ""}`;

  if (/자치|회의|규칙|학급|임원/.test(text)) {
    return {
      noun: "자율·자치활동",
      verbs: ["의견을 조율함", "학급의 약속을 실천함", "공동의 문제 해결에 참여함"],
    };
  }

  if (/독서|인문|하브루타|토론|질문|책|도서관/.test(text)) {
    return {
      noun: "독서·토론 활동",
      verbs: ["질문을 만들고 생각을 나눔", "친구의 의견을 경청함", "근거를 들어 자신의 생각을 표현함"],
    };
  }

  if (/디지털|디벗|사이버|저작권|정보통신/.test(primaryText)) {
    return {
      noun: "디지털 시민교육",
      verbs: ["디지털 환경의 약속을 지킴", "책임 있는 사용 태도를 보임", "바른 소통 방법을 실천함"],
    };
  }

  if (/인성|감정|배려|감사|생명존중|협동|경청|공감|친구/.test(primaryText)) {
    return {
      noun: "공동체형 인성활동",
      verbs: ["서로의 감정을 존중함", "배려와 협동을 실천함", "공동체의 약속을 지킴"],
    };
  }

  if (/디지털|디벗|사이버|저작권|정보통신/.test(text)) {
    return {
      noun: "디지털 시민교육",
      verbs: ["디지털 환경의 약속을 지킴", "책임 있는 사용 태도를 보임", "바른 소통 방법을 실천함"],
    };
  }

  if (/인성|감정|배려|감사|생명존중|협동|경청|공감|친구/.test(text)) {
    return {
      noun: "공동체형 인성활동",
      verbs: ["서로의 감정을 존중함", "배려와 협동을 실천함", "공동체의 약속을 지킴"],
    };
  }

  if (/생태|환경|기후|자원|지속/.test(text)) {
    return {
      noun: "생태전환 활동",
      verbs: ["생활 속 실천 방법을 찾아봄", "환경 보호 실천에 참여함", "공동체의 실천 약속을 지킴"],
    };
  }

  if (/예술|문예체|가야금|오카리나|우쿠렐레|우크렐레|축구|배드민턴|줄넘기|표현/.test(text)) {
    return {
      noun: "문예체 활동",
      verbs: ["표현 활동에 참여함", "친구와 호흡을 맞춤", "연습 과정에서 맡은 역할을 수행함"],
    };
  }

  if (/동아리/.test(text)) {
    return {
      noun: "동아리활동",
      verbs: ["활동 주제에 관심을 가지고 참여함", "맡은 역할을 수행함", "활동 과정을 돌아봄"],
    };
  }

  return {
    noun: item?.title || "자율·자치활동",
    verbs: ["활동 과정에 꾸준히 참여함", "친구와 협력함", "맡은 역할을 실천함"],
  };
}

function buildMockSentence(body, item, variant) {
  const term = semesterLabel(body);

  if (item?.id === "__officer") {
    const officer = officerLabel(body);
    const sentences = [
      `${officer}으로 활동하며 ${term} 학급회의 진행과 의견 조율에 책임감을 가지고 참여하여 공동체 의사결정이 원활하게 이루어지도록 기여함.`,
      `${officer}으로 활동하며 ${term} 학급 구성원의 의견을 경청하고 필요한 역할을 스스로 찾아 실천하는 등 자치활동에서 리더십을 발휘함.`,
      `${officer}으로 활동하며 ${term} 학급 공동체의 약속 실천을 돕고 친구들이 자율적으로 참여할 수 있도록 차분히 이끄는 모습이 돋보임.`,
      `${officer}으로 활동하며 ${term} 회의와 공동체 활동에서 친구들의 의견을 듣고 학급 운영에 필요한 역할을 수행함.`,
    ];
    return sentences[variant % sentences.length];
  }

  const focus = inferActivityFocus(item);
  const sentences = [
    `${term} ${item.title} 과정에서 활동의 취지를 이해하고 ${focus.verbs[0]}으로써 ${focus.noun}에 성실히 참여함.`,
    `${term} ${item.title}에 주도적으로 참여하여 친구들과 협력하고 맡은 역할을 책임감 있게 수행함.`,
    `${term} ${item.title} 활동에서 자신의 생각을 분명히 표현하고 친구들의 의견을 존중하며 활동을 깊이 있게 이어 감.`,
    `${term} ${item.title} 과정에 꾸준히 참여하며 ${focus.verbs[1]}으로써 배운 내용을 생활 속 실천으로 연결함.`,
    `${term} ${item.title}의 기본 취지를 이해하고 친구들과 함께 활동에 참여함.`,
  ];
  return sentences[variant % sentences.length];
}

function entrySentences(entry) {
  if (Array.isArray(entry?.sentences)) return entry.sentences.filter(Boolean);
  return [
    ...(Array.isArray(entry?.excellent_sentences) ? entry.excellent_sentences : []),
    ...(Array.isArray(entry?.good_sentences) ? entry.good_sentences : []),
    ...(Array.isArray(entry?.effort_sentences) ? entry.effort_sentences : []),
  ].filter(Boolean);
}

function buildBasisExamples(body, items) {
  const counts = normalizeCounts(body);
  return items.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    basis: item.basis,
    sentences: Array.from({ length: counts.basis }, (_, index) => buildMockSentence(body, item, index)),
  }));
}

function pickByIndex(list, index) {
  if (!list.length) return "";
  return list[index % list.length];
}

function buildCombinedSentences(body, items, basisExamples) {
  const counts = normalizeCounts(body);
  return Array.from({ length: counts.combined }, (_, combinedIndex) => {
    const parts = items
      .map((item, itemIndex) => {
        const basis = basisExamples.find((entry) => entry.id === item.id) || basisExamples[itemIndex];
        return pickByIndex(entrySentences(basis), combinedIndex);
      })
      .filter(Boolean);
    return parts.join(" ");
  }).filter(Boolean);
}

function normalizeBasisExamples(body, parsed) {
  const items = getActivityItemsWithOfficer(body);
  const counts = normalizeCounts(body);
  const entries = Array.isArray(parsed.basis_examples) ? parsed.basis_examples : [];

  if (!entries.length) return buildBasisExamples(body, items);

  return items.map((item, index) => {
    const entry = entries.find((candidate) => candidate.id === item.id) || entries[index] || {};
    const sentences = entrySentences(entry).slice(0, counts.basis);
    const fallback = Array.from({ length: counts.basis }, (_, sentenceIndex) => buildMockSentence(body, item, sentenceIndex));

    return {
      id: item.id || entry.id || `basis-${index}`,
      category: item.category || entry.category || "",
      title: item.title || entry.title || "",
      basis: item.basis || entry.basis || "",
      sentences: sentences.length >= counts.basis
        ? sentences
        : [...sentences, ...fallback.filter((sentence) => !sentences.includes(sentence))].slice(0, counts.basis),
    };
  });
}

function ensureCombinedSentences(body, parsed, basisExamples) {
  const counts = normalizeCounts(body);
  const existing = Array.isArray(parsed.combined_sentences) ? parsed.combined_sentences.filter(Boolean) : [];
  if (existing.length >= counts.combined) return existing.slice(0, counts.combined);

  const fallback = buildCombinedSentences(body, getActivityItemsWithOfficer(body), basisExamples);
  return [...existing, ...fallback.filter((sentence) => !existing.includes(sentence))].slice(0, counts.combined);
}

function buildMockExamples(body) {
  const activityItems = getActivityItemsWithOfficer(body);
  const basisExamples = buildBasisExamples(body, activityItems);
  return {
    basis_examples: basisExamples,
    combined_sentences: buildCombinedSentences(body, activityItems, basisExamples),
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

async function callGemini(apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const activityItems = getActivityItemsWithOfficer(body);
  const selectedTerm = semesterLabel(body);
  const counts = normalizeCounts(body);
  const activityText = activityItems
    .map((item) => `- id: ${item.id || ""}\n  ${item.category || ""} / ${item.title || ""}\n  근거: ${item.basis || ""}\n  출처: ${item.source || "reference MD"}`)
    .join("\n");
  const isOfficerMode = Boolean(body.officer?.enabled);
  const officerRule = isOfficerMode
    ? `임원 활동도 하나의 영역으로 반영합니다. 임원 활동 문장에는 반드시 "${officerLabel(body)}" 형식을 문장 앞부분에 그대로 포함합니다.`
    : "임원 활동은 언급하지 않습니다.";

  const systemPrompt = `
당신은 초등학교 담임교사의 학교생활기록부 창의적 체험활동 특기사항 작성을 돕습니다.
2026 학교생활기록부 기재요령과 학교·학년 교육과정 근거에 따라 자율·자치활동 예시문장을 작성합니다.

기재 기준:
- 초등학교는 자율·자치활동과 동아리활동 특기사항을 통합하여 문장으로 입력합니다.
- 선택된 학년과 선택된 학기(${selectedTerm})의 영역 근거에 포함된 내용만 사용합니다.
- 다른 학년, 다른 학기, 다른 악기·운동·동아리·특색활동을 섞지 않습니다.
- 1학기 근거에 동아리활동이 없으면 동아리활동을 절대 언급하지 않습니다.
- 1·2학년은 현재 제공된 학년 교육과정 근거에 동아리활동을 넣지 않습니다.
- 정규교육과정 또는 학교교육계획에 근거한 활동만 언급합니다.
- 활동 결과보다 과정에서 드러난 개별 행동 특성, 참여도, 협력, 실제 역할을 중심으로 씁니다.
- 과장, 단정, 부정적 표현은 쓰지 않습니다.
- 문장은 학교생활기록부 문체로 "~함.", "~보임.", "~기여함."처럼 끝냅니다.
- 상·중·하 수준 구분은 하지 않습니다.
- basis_examples에는 선택된 각 영역별로 예시문장 ${counts.basis}개를 sentences 배열에 작성합니다.
- combined_sentences에는 종합 예시문장 ${counts.combined}개를 작성합니다.
- 종합 예시문장 1개는 각 영역의 sentences에서 한 문장씩만 뽑아 자연스럽게 이어 붙인 것입니다.
- 한 영역에서 여러 문장을 뽑아 하나의 종합 예시문장에 넣지 않습니다.
- ${officerRule}

응답은 반드시 {"basis_examples": [{"id": string, "title": string, "category": string, "basis": string, "sentences": string[]}], "combined_sentences": string[]} JSON만 작성합니다.
`;
  const userPrompt = `
학년도: ${body.schoolYear}
학년: ${body.grade}
선택 학기: ${selectedTerm}
영역:
${activityText}
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
        temperature: 0.35,
        topP: 0.85,
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
  const basisExamples = normalizeBasisExamples(body, parsed);

  return {
    basis_examples: basisExamples,
    combined_sentences: ensureCombinedSentences(body, parsed, basisExamples),
  };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const activityItems = getActivityItemsWithOfficer(body);

  if (!body.schoolYear || !body.grade || !["1", "2"].includes(String(body.semester || "")) || !activityItems.some((item) => item?.title)) {
    return res.status(400).json({ error: "요청 데이터가 올바르지 않습니다." });
  }

  if (body.officer?.enabled && (!body.officer.term || !body.officer.type || !body.officer.title || !body.officer.period)) {
    return res.status(400).json({ error: "임원 활동은 학기, 종류, 직책, 임원 기간이 필요합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || process.env.USE_MOCK_AI === "true") {
    return res.status(200).json({ ...buildMockExamples(body), mock: true });
  }

  try {
    return res.status(200).json(await callGemini(apiKey, body));
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류" });
  }
}

module.exports = handler;
