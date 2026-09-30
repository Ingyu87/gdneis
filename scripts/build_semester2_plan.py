import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "reference" / "assessment-plans" / "semester2-hwp"
DEST = ROOT / "tabs" / "comments" / "data" / "evaluation-plan-semester2.json"

CODE_LINE = re.compile(r"^\[(\d[^\]]+?\d{2}-\d{2})\]\s*(.*)$")
COUNT_RE = re.compile(r"^\d+회$")
MONTH_RE = re.compile(r"^(?:[1-9]|1[0-2])월$")
UNIT_RE = re.compile(r"^\d+\.")
LEVELS = {"잘함", "보통", "노력요함", "노력", "요함"}
SUBJECTS = ["국어", "수학", "통합", "사회", "도덕", "과학", "실과", "체육", "음악", "미술", "영어"]
HEADERS = {
    "평가시기",
    "단원명",
    "(교수·학습 내용)",
    "평가 요소",
    "평가 영역",
    "평가 방법",
    "및 횟수",
    "성취기준",
    "성취수준",
}
SUBJECT_RE = re.compile(rf"(?m)^•\s+({'|'.join(SUBJECTS)})\s*$")


def skip_blanks(lines, index):
    while index >= 0 and not lines[index]:
        index -= 1
    return index


def is_domain_stop(line):
    if line.startswith(("▪", "•", "·")):
        return True
    if line in HEADERS or line in LEVELS:
        return True
    if MONTH_RE.match(line) or UNIT_RE.match(line) or CODE_LINE.match(line) or COUNT_RE.match(line):
        return True
    return len(line) > 40


def is_wrapped_domain_line(line):
    if is_domain_stop(line) or len(line) > 16:
        return False
    return not re.search(r"(하기|음|봄|기)$", line)


def extract_domain(lines, code_index):
    cursor = skip_blanks(lines, code_index - 1)
    if cursor < 0:
        return ""

    line = lines[cursor]
    if COUNT_RE.match(line):
        cursor = skip_blanks(lines, cursor - 1)
        if cursor >= 0 and (lines[cursor].startswith("[") or lines[cursor].endswith("]")):
            while cursor >= 0 and not lines[cursor].startswith("["):
                cursor -= 1
            cursor = skip_blanks(lines, cursor - 1)
        elif cursor >= 0:
            cursor = skip_blanks(lines, cursor - 1)
    elif re.search(r"\d+회$", line):
        cursor = skip_blanks(lines, cursor - 1)
    elif line.startswith("[") or line.endswith("]"):
        while cursor >= 0 and not lines[cursor].startswith("["):
            cursor -= 1
        cursor = skip_blanks(lines, cursor - 1)
    else:
        cursor = skip_blanks(lines, cursor - 1)

    parts = []
    while cursor >= 0:
        if not lines[cursor]:
            cursor -= 1
            continue
        if parts and not is_wrapped_domain_line(lines[cursor]):
            break
        if is_domain_stop(lines[cursor]):
            break
        parts.append(lines[cursor])
        cursor -= 1
    parts.reverse()
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def criteria_matches(standard, criteria):
    words = set(re.findall(r"[가-힣]{2,}", standard))
    words -= {"있다", "한다", "있는", "따라", "이해", "자신이", "다양한", "자신의", "할 수"}
    text = " ".join(criteria.values())
    return any(word in text for word in words)


def read_criteria(lines, index):
    window = []
    while index < len(lines):
        line = lines[index]
        if window and (MONTH_RE.match(line) or line.startswith("• ")):
            break
        window.append(line)
        index += 1
        if len(window) > 90:
            break
    text = re.sub(r"노력\s+요함", "노력요함", "\n".join(window))
    match = re.search(r"잘함\s*(.*?)\s*보통\s*(.*?)\s*노력요함\s*(.*)", text, re.S)
    if not match:
        return {"잘함": "", "보통": "", "노력요함": ""}, index

    def clean(value):
        return re.sub(r"\s+", " ", value).strip()

    return {
        "잘함": clean(match.group(1)),
        "보통": clean(match.group(2)),
        "노력요함": clean(match.group(3)),
    }, index


def parse_file(text: str) -> dict:
    matches = list(SUBJECT_RE.finditer(text))
    subjects = {}
    for match_index, match in enumerate(matches):
        name = match.group(1)
        start = match.end()
        end = matches[match_index + 1].start() if match_index + 1 < len(matches) else len(text)
        lines = [line.strip() for line in text[start:end].splitlines()]

        records = []
        index = 0
        while index < len(lines):
            if not CODE_LINE.match(lines[index] or ""):
                index += 1
                continue

            domain = extract_domain(lines, index)
            standards = []
            while index < len(lines):
                while index < len(lines) and not lines[index]:
                    index += 1
                if index >= len(lines) or not CODE_LINE.match(lines[index]):
                    break
                code_match = CODE_LINE.match(lines[index])
                code = f"[{code_match.group(1)}]"
                rest = code_match.group(2).strip()
                index += 1
                extra = []
                if not rest:
                    while index < len(lines) and not lines[index]:
                        index += 1
                    while (
                        index < len(lines)
                        and lines[index]
                        and not CODE_LINE.match(lines[index])
                        and lines[index] not in LEVELS
                    ):
                        extra.append(lines[index])
                        index += 1
                text_part = " ".join(part for part in [rest, *extra] if part).strip()
                standards.append(f"{code} {text_part}".strip())
            criteria, index = read_criteria(lines, index)
            if not criteria_matches(" ".join(standards), criteria):
                criteria = {"잘함": "", "보통": "", "노력요함": ""}
            records.append((domain, standards, criteria))

        grouped = []
        domain_index = {}
        for domain, standards, criteria in records:
            domain = re.sub(r"\s+", " ", domain).strip()
            joined = " / ".join(standards)
            if domain not in domain_index:
                domain_index[domain] = len(grouped)
                item = {"domain": domain, "standard": joined}
                if any(criteria.values()):
                    item["criteria"] = criteria
                grouped.append(item)
            else:
                existing = grouped[domain_index[domain]]
                existing["standard"] += f" / {joined}"
                if any(criteria.values()):
                    existing.setdefault("criteria", {"잘함": "", "보통": "", "노력요함": ""})
                    for key in ("잘함", "보통", "노력요함"):
                        if criteria.get(key) and criteria[key] not in existing["criteria"].get(key, ""):
                            existing["criteria"][key] = " / ".join(
                                part for part in [existing["criteria"].get(key, ""), criteria[key]] if part
                            )
        subjects[name] = grouped
    return subjects


def main():
    output = {}
    for path in sorted(SRC.glob("*.txt")):
        match = re.search(r"2학기 ([1-6])학년", path.name)
        if not match:
            continue
        grade = f"{match.group(1)}학년"
        output[grade] = parse_file(path.read_text(encoding="utf-8"))

    DEST.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary_lines = []
    for grade, subjects in output.items():
        summary_lines.append(grade)
        for subject, entries in subjects.items():
            summary_lines.append(f"  {subject} ({len(entries)})")
            for entry in entries:
                flag = ""
                domain = entry["domain"]
                if (
                    not domain
                    or domain.startswith("[")
                    or domain.endswith("]")
                    or re.search(r"\d+회", domain)
                    or "하기" in domain
                    or len(domain) > 24
                ):
                    flag = "  << CHECK"
                summary_lines.append(f"    - {domain}: {entry['standard']}{flag}")
    summary_path = SRC / "_summary.txt"
    summary_path.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
    print(summary_path)


if __name__ == "__main__":
    main()
