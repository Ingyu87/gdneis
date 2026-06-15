from __future__ import annotations

import argparse
from pathlib import Path

import pdfplumber


def normalize_text(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    compact: list[str] = []
    blank = False
    for line in lines:
        if line.strip():
            compact.append(line)
            blank = False
        elif not blank:
            compact.append("")
            blank = True
    return "\n".join(compact).strip()


def convert_pdf(pdf_path: Path) -> Path:
    md_path = pdf_path.with_suffix(pdf_path.suffix + ".md")
    parts = [f"# {pdf_path.name}", "", f"Source PDF: `{pdf_path.name}`", ""]

    with pdfplumber.open(pdf_path) as pdf:
        parts.append(f"Pages: {len(pdf.pages)}")
        parts.append("")

        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3, layout=True) or ""
            text = normalize_text(text)
            parts.append(f"## Page {index}")
            parts.append("")
            parts.append(text if text else "_No extractable text on this page._")
            parts.append("")

    md_path.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    return md_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert reference PDFs to UTF-8 markdown files.")
    parser.add_argument("root", nargs="?", default="reference", help="Directory to scan for PDF files.")
    args = parser.parse_args()

    root = Path(args.root)
    pdfs = sorted(root.rglob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"No PDF files found under {root}")

    for pdf_path in pdfs:
        md_path = convert_pdf(pdf_path)
        print(f"{pdf_path} -> {md_path}")


if __name__ == "__main__":
    main()
