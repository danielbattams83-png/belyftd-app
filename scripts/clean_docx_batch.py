"""Extract spoken unit text without modifying the source Word documents.

Install: python -m pip install -r scripts/requirements-clean-docx.txt
Run:     python scripts/clean_docx_batch.py
Override: --input "path/to/3. Unit Documents" --output "path/to/texts"
LYFTD_SITE_FILES can point to the Site Files root, as in seed-real-content.js.
Output preserves source subfolders and uses <document>_clean.txt (UTF-8).
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import sys
from collections.abc import Iterator

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

REPO_ROOT = Path(__file__).resolve().parents[1]
UNIT_SUBDIR = Path('2. Documents') / '3. Unit Documents'
END_MARKER = re.compile(
    r'\bmy\s+to[\s\-\u2010-\u2014]*do\s+list(?:\s+this\s+week)?\s*:'
    r'|\bmy\s+goals\s+today\s+are\s*:'
    r'|^\s*(?:workshop|to[\s-]*do\s+list)\s*(?::|$)'
    r'|^\s*check\s+(?:this|the)\s+video\s+link\b',
    re.IGNORECASE,
)
DIRECTION = re.compile(r'\[(?:tone|style|voice|pace|pacing)\s*:[^\]]*\]', re.IGNORECASE)
HEADER_PREFIX = re.compile(
    r'^\s*(?:L\.?\s*L\.?\s+|(?:SECTION|MODULE|UNIT)\s+\d+\s*[:.\-]\s*)',
    re.IGNORECASE,
)
PAGE_COUNT = re.compile(r'\b\d+\s+pages?\b', re.IGNORECASE)


def default_input() -> Path:
    configured = os.environ.get('LYFTD_SITE_FILES')
    if configured:
        return Path(configured).expanduser() / UNIT_SUBDIR
    local = REPO_ROOT / 'Site Files' / UNIT_SUBDIR
    return local if local.is_dir() else Path("H:/My Drive/Lyft'd Lessons/Site Files") / UNIT_SUBDIR


def title_key(text: str) -> str:
    text = HEADER_PREFIX.sub('', text)
    text = PAGE_COUNT.sub('', text)
    return ''.join(character.casefold() for character in text if character.isalnum())


def paragraphs_in_order(container) -> Iterator[Paragraph]:
    """Read body/table paragraphs in order; Word headers/footers are excluded."""
    for block in container.iter_inner_content():
        if isinstance(block, Paragraph):
            yield block
        elif isinstance(block, Table):
            seen_cells = set()
            for row in block.rows:
                for cell in row.cells:
                    if cell._tc not in seen_cells:
                        seen_cells.add(cell._tc)
                        yield from paragraphs_in_order(cell)


def extract_clean_script(docx_path: Path, known_titles: set[str] | None = None,
                         end_marker: re.Pattern[str] = END_MARKER) -> tuple[str, bool]:
    document = Document(docx_path)
    # The filename can identify unstyled title lines; do not drop arbitrary
    # short or uppercase paragraphs (e.g. "WE ALL HAVE UNIQUE GIFTS.").
    filename_title = re.sub(r'^(?:LL[- .]*)?\d+[.-]\d+[.\-]*', '', docx_path.stem, flags=re.I)
    titles = {title_key(filename_title)} | (known_titles or set())
    lines = []
    in_body = False
    found_end = False
    for paragraph in paragraphs_in_order(document):
        for raw_line in paragraph.text.splitlines():
            line = DIRECTION.sub('', raw_line).replace('\xa0', ' ').strip()
            stop = end_marker.search(line)
            if stop:
                line = line[:stop.start()].rstrip()
                found_end = True
            if line and line.casefold() not in {'top of form', 'bottom of form'}:
                # Blank response rules are not narration; keep text surrounding them.
                line = re.sub(r'_{3,}', '', line).strip()
                style = paragraph.style.name.casefold() if paragraph.style else ''
                header_style = style in {'title', 'subtitle'} or style.startswith('heading')
                if not in_body and (HEADER_PREFIX.match(line) or header_style):
                    titles.add(title_key(line))
                elif line and not (not in_body and title_key(line) in titles):
                    lines.append(line)
                    in_body = True
            if found_end:
                return '\n\n'.join(lines), True
    return '\n\n'.join(lines), False


def collect_known_titles(sources: list[Path]) -> set[str]:
    # Master documents identify subtitles that may be unstyled in their script
    # copies. Only learn the opening heading block, never later body headings.
    known_titles = set()
    for source in sources:
        try:
            opening_titles = set()
            for paragraph in paragraphs_in_order(Document(source)):
                line = DIRECTION.sub('', paragraph.text).strip()
                if not line:
                    continue
                style = paragraph.style.name.casefold() if paragraph.style else ''
                if HEADER_PREFIX.match(line) or style in {'title', 'subtitle'} or style.startswith('heading'):
                    opening_titles.add(title_key(line))
                elif title_key(line) not in opening_titles:
                    break
            known_titles.update(opening_titles)
        except Exception:
            # The processing pass reports the individual document error below.
            continue
    return known_titles


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--input', type=Path, default=default_input(), help='Unit Documents root (recursive).')
    parser.add_argument('--output', type=Path, default=REPO_ROOT / 'scripts' / 'clean_audio_texts')
    args = parser.parse_args(argv)
    source_root = args.input.expanduser().resolve()
    output_root = args.output.expanduser().resolve()
    if not source_root.is_dir():
        parser.error(f'Input directory does not exist: {source_root}')
    sources = sorted(path for path in source_root.rglob('*')
                     if path.is_file() and path.suffix.casefold() == '.docx' and not path.name.startswith('~$'))
    if not sources:
        parser.error(f'No .docx files found in {source_root}')
    known_titles = collect_known_titles(sources)
    written = failed = without_marker = 0
    for source in sources:
        try:
            text, found_end = extract_clean_script(source, known_titles)
            if not text:
                raise ValueError('No spoken body remains after cleaning; no output written.')
            destination = output_root / source.relative_to(source_root).with_name(source.stem + '_clean.txt')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(text + '\n', encoding='utf-8')
            written += 1
            print(f'Cleaned: {destination.relative_to(output_root)}')
            if not found_end:
                without_marker += 1
                print(f'  Note: no workshop/to-do cutoff marker found; kept the remaining body.')
        except Exception as error:
            failed += 1
            print(f'ERROR {source.relative_to(source_root)}: {error}', file=sys.stderr)
    print(f'Wrote {written} text files to {output_root}; {failed} failed; {without_marker} without cutoff markers.')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
