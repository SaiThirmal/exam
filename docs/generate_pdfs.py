from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


BASE_DIR = Path(__file__).resolve().parent


def _clean_inline_markup(text: str) -> str:
    text = text.replace("**", "")
    text = text.replace("`", "")
    return text.strip()


def _build_story(markdown_text: str):
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        spaceAfter=10,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        spaceBefore=6,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        spaceAfter=8,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=body,
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=4,
    )

    story = []
    lines = markdown_text.splitlines()

    for raw in lines:
        line = raw.rstrip()
        if not line:
            story.append(Spacer(1, 0.15 * cm))
            continue

        if line.startswith("# "):
            text = html.escape(_clean_inline_markup(line[2:]))
            story.append(Paragraph(text, h1))
            continue

        if line.startswith("## "):
            text = html.escape(_clean_inline_markup(line[3:]))
            story.append(Paragraph(text, h2))
            continue

        if line.startswith("### "):
            text = html.escape(_clean_inline_markup(line[4:]))
            story.append(Paragraph(text, h2))
            continue

        numbered = re.match(r"^(\d+)\.\s+(.*)$", line)
        if numbered:
            text = html.escape(_clean_inline_markup(f"{numbered.group(1)}. {numbered.group(2)}"))
            story.append(Paragraph(text, bullet))
            continue

        if line.startswith("- "):
            text = html.escape(_clean_inline_markup(line[2:]))
            story.append(Paragraph(text, bullet, bulletText="•"))
            continue

        text = html.escape(_clean_inline_markup(line))
        story.append(Paragraph(text, body))

    return story


def _render(markdown_path: Path, pdf_path: Path) -> None:
    content = markdown_path.read_text(encoding="utf-8")
    story = _build_story(content)
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title=markdown_path.stem.replace("_", " ").title(),
    )
    doc.build(story)


def main() -> None:
    _render(BASE_DIR / "abstract.md", BASE_DIR / "abstract.pdf")
    _render(BASE_DIR / "literature_review.md", BASE_DIR / "literature_review.pdf")
    print("Generated:")
    print(" - docs/abstract.pdf")
    print(" - docs/literature_review.pdf")


if __name__ == "__main__":
    main()
