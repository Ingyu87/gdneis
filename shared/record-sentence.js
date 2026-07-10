const CONJUNCTIVE_PERIOD_PATTERN =
  /([가-힣]+(?:고|며|으며|거나|든지|면서|하여|이고|이면서|하면서|도록|듯이|다가|라며|라고|다면|이어|이며|되며|되고|보며|보면서))\.\s+/g;

function normalizeRecordSentence(text) {
  return String(text || "")
    .replace(/\s*[,，]\s*/g, " ")
    .replace(CONJUNCTIVE_PERIOD_PATTERN, "$1 ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { normalizeRecordSentence };
} else if (typeof globalThis !== "undefined") {
  globalThis.RecordSentence = { normalizeRecordSentence };
}
