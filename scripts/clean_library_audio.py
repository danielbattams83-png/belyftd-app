"""Clean the Library and organize its texts by the supplied 21-course contents map.

Run with the same Python environment as clean_docx_batch.py.
Override paths with --input, --contents, and --output. Output must be a new folder.
Original documents are never modified. Manifest files record cross-use and variants.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import re

from docx import Document
from clean_docx_batch import END_MARKER, collect_known_titles, extract_clean_script

DOCUMENTS = Path("H:/My Drive/Lyft'd Lessons/Site Files/2. Documents")
LIBRARY = DOCUMENTS / '2. 2025 LIBRARY LYFTD' / '2025 LIBRARY LYFTD'
CONTENTS = DOCUMENTS / '4. LYFTD' / 'LYFTD_COMPLETE_21_SHORT_COURSES_ACTUAL_SESSIONS_AND_SELF_ASSESSMENT.docx'
LIBRARY_END = re.compile(
    END_MARKER.pattern + r'|^\s*workshop\s+(?:objective|discussion|exercise|activity|questions?)\s*:'
    r'|^\s*here\s+is\s+a\s+workshop\b'
    r'|^\s*here\s+is\s+something\s+we\s+can\s+all\s+workshop\b'
    r'|^\s*this\s+laid.back\s+workshop\s+will\b'
    r'|^\s*my\s+goals\s+today\s+are\b', re.I,
)
REFERENCE_NAMES = {'LIBRARY A to Z NUMBER AND NAMES.docx', 'The Lyft LEARNING CENTRE.docx'}
# Explicitly reviewed title differences; no fuzzy matches are accepted automatically.
ALIASES = {
    'identitytheftwhoareyou': ['identitytheft'],
    'dontbeaxerox': ['xeroxdontbeacopy'],
    'future': ['futurev1', 'futurev2'],
    'settingupyourfuture': ['settingupyourfuture2'],
    'whatstepsdoineed': ['whatstepsdoineedtogo'],
    'fearthevaccinetoeliminatehope': ['fear'],
    'resiliencerealstoriesandwisdom': ['resiliance'],
    'youdomakeadifference': ['youmakeadifference'],
    'howtos': ['howts'],
    'intimacyandlisteningtogodsvoice': ['intimacyandlisteningtogod'],
    'four4csofconfessionpart1': ['fourcsofconfession1'],
    'four4csofconfessionpart2': ['fourcsofconfessionpart2'],
    'four4csofconfessionpart3': ['fourcsofconfessionpart3'],
    'whataboutthechurch': ['whataboutchurch'],
    'whenthebedroomdoorisshut': ['whenthebedroom'],
    'whyisitoktobepositive': ['whyitsoktobepositive'],
    'worktheperspectiveyouneverhadonwork': ['work'],
    'momentumprinciple': ['momentumprincipal'],
    'cashflowforpersonalandbusiness': ['cashflowforbusiness'],
    'thrillsandspillssocialmedia': ['thrillsandspillssocial'],
    'socialisolationconnectionvdisruption': ['socialisolation'],
    'studygreatpeople': ['studygreatpeople', 'studygreatpeoplek'],
}


def key(text: str) -> str:
    text = re.sub(r'^L\.?\s*L\.?\s*', '', text, flags=re.I)
    text = re.sub(r'\b\d+\s*pages?\b', '', text, flags=re.I)
    text = text.casefold().replace('versus', 'v').replace('verus', 'v').replace('&', 'and')
    text = text.replace('cashfow', 'cashflow').replace('vunerable', 'vulnerable')
    return re.sub('[^a-z0-9]', '', text)


def safe_name(text: str) -> str:
    text = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '-', text)
    return re.sub(r'\s+', ' ', text).strip(' .')[:130]


def parse_courses(path: Path) -> list[dict]:
    lines = [p.text.strip() for p in Document(path).paragraphs if p.text.strip()]
    courses = []
    for index, line in enumerate(lines):
        heading = re.match(r'^(\d+)\.\s*(.+)$', line)
        if heading and index + 1 < len(lines) and re.fullmatch(r'\d+ SESSIONS', lines[index + 1]):
            courses.append({'number': int(heading[1]), 'title': heading[2], 'sessions': []})
        session = re.match(r'^SESSION\s+(\d+)\.\s*(.+)$', line)
        if session and courses:
            courses[-1]['sessions'].append({'number': int(session[1]), 'title': session[2]})
    if len(courses) != 21 or sum(len(course['sessions']) for course in courses) != 136:
        raise ValueError('The supplied contents did not parse into the expected 21 courses and 136 sessions.')
    return courses


def source_matches(title: str, lookup: dict[str, list[Path]]) -> list[Path]:
    matches = [path for alias in ALIASES.get(key(title), [key(title)]) for path in lookup.get(alias, [])]
    if key(title) == 'worktheperspectiveyouneverhadonwork':
        matches = [path for path in matches if 'W.O.R.K' in path.name]
    return sorted(set(matches))


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def run(source_root: Path, contents: Path, output: Path) -> dict:
    source_root, contents, output = source_root.resolve(), contents.resolve(), output.resolve()
    if output.exists():
        raise ValueError(f'Choose a new output folder; this one already exists: {output}')
    sources = sorted(path for path in source_root.rglob('*') if path.is_file()
                     and path.suffix.casefold() == '.docx' and not path.name.startswith('~$'))
    if not sources:
        raise ValueError('No Word documents were found.')
    courses = parse_courses(contents)
    lookup = {}
    for source in sources:
        lookup.setdefault(key(source.stem), []).append(source)
    known_titles = collect_known_titles(sources)
    cleaned, hashes, cutoffs = {}, {}, {}
    for source in sources:
        hashes[source] = hashlib.sha256(source.read_bytes()).hexdigest()
        text, cutoffs[source] = extract_clean_script(source, known_titles, LIBRARY_END)
        if not text:
            raise ValueError(f'No spoken body remains: {source.name}')
        cleaned[source] = text + '\n'
    plan, sessions = [], []
    assigned = set()
    for course in courses:
        folder = f"{course['number']:02d} - {safe_name(course['title'])}"
        for session in course['sessions']:
            matches = source_matches(session['title'], lookup)
            if not matches:
                raise ValueError(f"Missing source for course {course['number']}, session {session['number']}: {session['title']}")
            sessions.append({'module': course['number'], 'course': course['title'], 'session': session['number'],
                             'title': session['title'], 'sources': '; '.join(path.name for path in matches)})
            for source in matches:
                destination = Path(folder) / f"{session['number']:02d} - {safe_name(source.stem)}_clean.txt"
                plan.append((source, destination))
                assigned.add(source)
    unassigned = [source for source in sources if source not in assigned]
    for source in unassigned:
        folder = '_Reference Documents' if source.name in REFERENCE_NAMES else '_Additional Library Lessons'
        plan.append((source, Path(folder) / (safe_name(source.stem) + '_clean.txt')))
    if len({str(destination).casefold() for _, destination in plan}) != len(plan):
        raise ValueError('Output filenames collide; no files were written.')
    # Complete all parsing and mapping before creating the requested new folder.
    output.mkdir(parents=True)
    manifest = []
    for source, destination in plan:
        target = output / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(cleaned[source], encoding='utf-8')
        manifest.append({'source': str(source.relative_to(source_root)), 'output': str(destination),
                         'cutoff_found': cutoffs[source], 'words': len(cleaned[source].split()),
                         'source_sha256': hashes[source]})
    unchanged = all(hashlib.sha256(source.read_bytes()).hexdigest() == hashes[source] for source in sources)
    if not unchanged:
        raise RuntimeError('A source changed during processing; check the manifest before using the output.')
    write_csv(output / 'source_manifest.csv', manifest)
    write_csv(output / 'module_session_index.csv', sessions)
    summary = {'source_documents': len(sources), 'courses': len(courses), 'sessions': len(sessions),
               'clean_text_files': len(plan), 'additional_lessons': len([p for p in unassigned if p.name not in REFERENCE_NAMES]),
               'reference_documents': len([p for p in unassigned if p.name in REFERENCE_NAMES]),
               'sources_without_cutoff': [p.name for p in sources if not cutoffs[p]],
               'originals_unchanged': unchanged}
    (output / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    (output / 'README.txt').write_text(
        'CLEAN LIBRARY AUDIO TEXTS\n\n'
        'The numbered folders follow the supplied 21-course contents document and session order.\n'
        'Lessons used in multiple courses appear in each relevant module. Alternate source versions are kept separately.\n'
        'Additional Library Lessons contains source lessons not listed in that contents map.\n'
        'Reference Documents contains the Library index and Learning Centre overview, not lesson narration.\n'
        'The Extra Questions session is a question-only source and should be reviewed before narration.\n'
        'source_manifest.csv maps every output back to its original; module_session_index.csv lists all 136 sessions.\n'
        'summary.json identifies sources without a cutoff marker; their remaining text was retained.\n'
        'The contents document was used only for organization, not as replacement teaching text.\n'
        'All source Word documents were preserved and their hashes verified after processing.\n', encoding='utf-8')
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=LIBRARY)
    parser.add_argument('--contents', type=Path, default=CONTENTS)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.input, args.contents, args.output or args.input / 'Clean Audio Texts'), indent=2))


if __name__ == '__main__':
    main()
