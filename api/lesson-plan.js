async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.status(501).json({
    error: "교수학습과정안 API는 comments-helper 포팅 단계에서 연결됩니다.",
    harness: true
  });
}

module.exports = handler;
