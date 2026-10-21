"""Organize original reading documents using the existing Clean Audio Texts index.
Reading extraction preserves exercises; it never reads the audio-script text outputs.
Original files are hash-verified and never modified. Run --apply to write a new tree.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
from reading_content import extract_reading_document

DOCUMENTS = Path("H:/My Drive/Lyft'd Lessons/Site Files/2. Documents")


def safe_name(text):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', '-', text).strip(' .')[:130]


def plan_library(library, index_root):
    with (index_root / 'module_session_index.csv').open(encoding='utf-8-sig', newline='') as handle:
        sessions = list(csv.DictReader(handle))
    with (index_root / 'source_manifest.csv').open(encoding='utf-8-sig', newline='') as handle:
        manifest = list(csv.DictReader(handle))
    originals = {source.name: source for source in library.glob('*.docx') if not source.name.startswith('~$')}
    if not originals: raise ValueError('No original library documents')
    hashes = {name: hashlib.sha256(source.read_bytes()).hexdigest() for name, source in originals.items()}
    # Use the previously reviewed index only for structure; all text comes from original DOCX.
    for row in manifest:
        if row['source'] not in originals: raise ValueError('Indexed original is missing: ' + row['source'])
    reading = {name: extract_reading_document(source) for name, source in originals.items()}
    exports, units, assigned = {}, [], set()
    for row in sessions:
        module, unit = int(row['module']), int(row['session'])
        names = row['sources'].split('; ')
        assigned.update(names)
        folder = f'{module:02d} - {safe_name(row["course"])}'
        variants = [{'sourceFile': name, 'content': reading[name]} for name in names]
        content = variants[0]['content'] if len(variants) == 1 else '\n\n'.join(f'Reading version {i + 1}\n\n{variant["content"]}' for i, variant in enumerate(variants))
        payload = {'schemaVersion': 1, 'contentKind': 'reading', 'moduleId': f'module-{module}', 'unitId': f'unit-{unit}',
                   'moduleTitle': row['course'], 'title': row['title'], 'sourceFile': names[0], 'sourceFiles': names,
                   'content': content, 'variants': variants}
        exports[Path(folder) / f'unit-{unit}' / 'text.json'] = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
        for name in names:
            exports[Path(folder) / f'{unit:02d} - {safe_name(Path(name).stem)}_reading.md'] = reading[name] + '\n'
        units.append(payload)
    supplemental = [row for row in manifest if row['output'].startswith('_Additional Library Lessons')]
    for number, row in enumerate(supplemental, 1):
        name = row['source']; assigned.add(name)
        title = re.sub(r'^L\.?L\.?\s*', '', Path(name).stem, flags=re.I)
        title = re.sub(r'\s+\d+\s+pages?$', '', title, flags=re.I)
        payload = {'schemaVersion': 1, 'contentKind': 'reading', 'moduleId': 'module-22', 'unitId': f'unit-{number}',
                   'moduleTitle': 'Additional Library Lessons', 'supplemental': True, 'title': title,
                   'sourceFile': name, 'sourceFiles': [name], 'content': reading[name]}
        exports[Path('_Additional Library Lessons') / f'unit-{number}' / 'text.json'] = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
        exports[Path('_Additional Library Lessons') / (safe_name(Path(name).stem) + '_reading.md')] = reading[name] + '\n'
        units.append(payload)
    references = [row for row in manifest if row['output'].startswith('_Reference Documents')]
    for row in references:
        name = row['source']; assigned.add(name)
        exports[Path('_Reference Documents') / (safe_name(Path(name).stem) + '_reading.md')] = reading[name] + '\n'
    if assigned != set(originals): raise ValueError('The existing index does not cover every original document')
    summary = {'sourceDocuments': len(originals), 'courseModules': len({row['module'] for row in sessions}),
               'courseUnits': len(sessions), 'supplementalUnits': len(supplemental), 'referenceDocuments': len(references),
               'sourceHashes': hashes, 'allTextTagFree': all('[' not in text and ']' not in text for text in reading.values())}
    exports[Path('module_session_index.csv')] = (index_root / 'module_session_index.csv').read_text(encoding='utf-8-sig')
    manifest_rows = ['source,output,source_sha256']
    for relative in exports:
        if relative.suffix == '.md':
            source_name = next((name for name in originals if safe_name(Path(name).stem) + '_reading.md' in relative.name), None)
            if source_name:
                import io
                buffer = io.StringIO()
                writer = csv.writer(buffer)
                writer.writerow([source_name, str(relative), hashes[source_name]])
                manifest_rows.append(buffer.getvalue().strip())
    exports[Path('source_manifest.csv')] = '\n'.join(manifest_rows) + '\n'
    exports[Path('summary.json')] = json.dumps(summary, ensure_ascii=False, indent=2) + '\n'
    exports[Path('README.txt')] = ('CLEAN READING UNITS\n\nNumbered folders match the existing 21-course/136-session audio index.\n'
        'All reading text is extracted directly from original Word documents, including exercises and reflections.\n'
        'Markdown files preserve individual source versions; each session text.json combines its indexed versions.\n'
        'Additional Library Lessons is supplemental reading (internal module-22), outside the numbered curriculum.\n'
        'Reference Documents are preserved for reference and are not presented as course units.\n'
        'Voice directions are removed. No narration script is an input. Source documents are unchanged.\n')
    return exports, units, originals, summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', type=Path, default=DOCUMENTS / '2. 2025 LIBRARY LYFTD' / '2025 LIBRARY LYFTD')
    parser.add_argument('--output', type=Path, default=DOCUMENTS / '3. Unit Documents' / 'Clean Reading Units')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    exports, units, originals, summary = plan_library(args.library, args.library / 'Clean Audio Texts')
    print(json.dumps({key: value for key, value in summary.items() if key != 'sourceHashes'}, indent=2))
    # Validate all destinations before writing any file; never replace unrelated content.
    for relative, text in exports.items():
        target = args.output / relative
        if target.exists() and target.read_text(encoding='utf-8') != text:
            raise ValueError('A differing reading export already exists: ' + str(target))
    if not args.apply:
        print(f'Dry run: {len(exports)} files would be written to {args.output}')
        return
    for relative, text in exports.items():
        target = args.output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists(): target.write_text(text, encoding='utf-8')
    for name, source in originals.items():
        if hashlib.sha256(source.read_bytes()).hexdigest() != summary['sourceHashes'][name]: raise RuntimeError('An original changed: ' + name)
    print(f'Wrote and verified {len(exports)} reading files. All {len(originals)} original documents unchanged.')
    print('Destination: ' + str(args.output))


if __name__ == '__main__': main()
