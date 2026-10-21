"""Ingest every original unit DOCX/JSON and publish a text-free module catalog.
Dry-run by default. --apply updates canonical reading JSON, Firestore units/catalog,
and the bundled catalog snapshot, preserving existing media and tier policies.
"""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from reading_content import clean_content, extract_reading_document

PROJECT = 'belyft-d-app'
BUCKET = PROJECT + '.firebasestorage.app'
MODULE_TITLES = {2: 'Discovering Your Identity', 5: 'Building Resilience & Hope'}


def discover_sources(root):
    selected = {}
    excluded = 0
    for source in sorted(root.rglob('*')):
        if source.name == 'summary.json': continue
        if source.suffix.lower() not in ['.docx', '.json'] or not source.is_file(): continue
        if any(re.fullmatch(r'scripts?|narration|elevenlabs', p, re.I) for p in source.parts) or re.search(r'script_elevenlabs', source.name, re.I):
            excluded += 1
            continue
        match = re.match(r'^(?:LL[- .]*)?(\d+)[.-](\d+)(?=[.() _-]|$)', source.stem, re.I)
        if match:
            module, unit = map(int, match.groups())
        else:
            relative = source.relative_to(root).as_posix()
            module_match = re.search(r'module[- _]*(\d+)', relative, re.I)
            unit_match = re.search(r'unit[- _]*(\d+)', relative, re.I)
            if module_match and unit_match:
                module, unit = int(module_match[1]), int(unit_match[1])
            elif source.suffix.lower() == '.json':
                metadata = json.loads(source.read_text(encoding='utf-8-sig'))
                try:
                    module = int(str(metadata['moduleId']).removeprefix('module-'))
                    unit = int(str(metadata['unitId']).removeprefix('unit-'))
                except (KeyError, TypeError, ValueError):
                    raise ValueError(f'Unmapped JSON unit: {source.name}') from None
            else:
                raise ValueError(f'Unmapped original document: {source.name}')
        if module < 1 or unit < 1: raise ValueError(f'Invalid unit numbering: {source.name}')
        key = f'modules/module-{module}/units/unit-{unit}'
        priority = (int('Master Files' in source.parts), int(source.suffix.lower() == '.docx'))
        prior = selected.get(key)
        if prior and prior[1] == priority: raise ValueError(f'Ambiguous original sources for {key}')
        if not prior or priority > prior[1]: selected[key] = (source, priority)
    return {key: value[0] for key, value in selected.items()}, excluded


def extract_source(source):
    if source.suffix.lower() == '.docx': return extract_reading_document(source), None
    reading = json.loads(source.read_text(encoding='utf-8-sig'))
    if not isinstance(reading, dict) or reading.get('contentKind', 'reading') != 'reading':
        raise ValueError(f'Not reading JSON: {source.name}')
    text = reading.get('content', reading.get('textContent', ''))
    if not isinstance(text, str): raise ValueError(f'Invalid reading text: {source.name}')
    text = clean_content(text)
    if not text or '[' in text or ']' in text: raise ValueError(f'Invalid/empty reading JSON: {source.name}')
    return text, reading.get('title')


def encode(value):
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, str): return {'stringValue': value}
    if isinstance(value, list): return {'arrayValue': {'values': [encode(item) for item in value]}}
    if isinstance(value, dict): return {'mapValue': {'fields': {key: encode(item) for key, item in value.items()}}}
    raise ValueError('Unsupported Firestore value')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--site-files', type=Path, default=Path("H:/My Drive/Lyft'd Lessons/Site Files"))
    args = parser.parse_args()
    root = args.site_files / '2. Documents' / '3. Unit Documents'
    if (root / 'Clean Reading Units').is_dir(): root = root / 'Clean Reading Units'
    if not root.is_dir(): raise ValueError('Unit Documents folder is missing')
    sources, excluded = discover_sources(root)
    if not sources: raise ValueError('No original unit documents were found')
    token = subprocess.check_output([shutil.which('gcloud.cmd') or shutil.which('gcloud'), 'auth', 'print-access-token', '--quiet'], text=True).strip()
    def request(url, method='GET', data=None, raw=None):
        payload = raw if raw is not None else json.dumps(data).encode() if data is not None else None
        req = Request(url, method=method, data=payload, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urlopen(req, timeout=120) as response: return json.load(response)
        except HTTPError as error:
            if error.code == 404 and method == 'GET': return None
            raise RuntimeError(f'{method} failed: HTTP {error.code}') from None
    base = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
    rows = request(base + ':runQuery', 'POST', {'structuredQuery': {'from': [{'collectionId': 'units', 'allDescendants': True}]}})
    existing = {row['document']['name'].split('/documents/')[1]: row['document'] for row in rows if 'document' in row}
    all_units = {name: dict(doc.get('fields', {})) for name, doc in existing.items() if re.fullmatch(r'modules/module-[1-9][0-9]*/units/unit-[1-9][0-9]*', name)}
    updates = []
    module_titles = dict(MODULE_TITLES)
    supplemental_modules = set()
    for name, source in sources.items():
        text, json_title = extract_source(source)
        metadata = json.loads(source.read_text(encoding='utf-8-sig')) if source.suffix.lower() == '.json' else {}
        module, unit = name.split('/')[1::2]
        old = all_units.get(name, {})
        title = json_title or old.get('title', {}).get('stringValue') or re.sub(r'^(?:LL[- .]*)?\d+[.-]\d+[.() _-]*', '', source.stem, flags=re.I).replace('_', ' ').strip(' ()-')
        number = int(module.removeprefix('module-'))
        if metadata.get('moduleTitle'): module_titles[number] = clean_content(metadata['moduleTitle'])
        if metadata.get('supplemental'): supplemental_modules.add(module)
        fields = {'title': encode(clean_content(title)), 'textContent': encode(text), 'contentKind': encode('reading'),
                  'readingContentPath': encode(f'course-content/{module}/{unit}/text.json'), 'sourceFile': encode(metadata.get('sourceFile', source.name)),
                  'minTier': encode(1 if number == 1 else 2 if number <= 3 else 3)}
        if metadata.get('sourceFiles'): fields['sourceFiles'] = encode(metadata['sourceFiles'])
        if name not in existing: fields.update({'audioUrls': encode({}), 'videoUrls': encode({}), 'active': encode(True)})
        all_units[name] = {**old, **fields}
        updates.append((name, source, fields))
    grouped = defaultdict(list)
    for name, fields in all_units.items():
        if fields.get('active', {}).get('booleanValue') is False: continue
        module, unit = name.split('/')[1::2]
        if not fields.get('textContent', {}).get('stringValue', '').strip(): continue
        object_path = fields.get('readingContentPath', {}).get('stringValue')
        if not object_path: raise ValueError(f'Canonical reading JSON missing for retained unit {name}')
        has_media = any(value.get('stringValue', '').strip() for key in ['audioUrls', 'videoUrls'] for value in fields.get(key, {}).get('mapValue', {}).get('fields', {}).values())
        grouped[module].append({'id': unit, 'title': fields.get('title', {}).get('stringValue', unit), 'hasText': True, 'hasMedia': has_media})
    catalog = [{'id': module, 'title': module_titles.get(int(module[7:]), ''), 'supplemental': module in supplemental_modules, 'units': sorted(units, key=lambda unit: int(unit['id'][5:]))} for module, units in sorted(grouped.items(), key=lambda pair: int(pair[0][7:]))]
    print(f'{len(sources)} unique original units; {excluded} narration files excluded; {len(existing)} existing units retained/updated.')
    for module in catalog: print(f"{module['id']}: {len(module['units'])} units ({sum(not u['hasMedia'] for u in module['units'])} text-only)")
    if not args.apply:
        print('Dry run; rerun with --apply to publish.')
        return
    backup = Path('tmp/curriculum-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    backup.parent.mkdir(exist_ok=True)
    backup.write_text(json.dumps(existing, indent=2), encoding='utf-8')
    def publish_unit(update):
        name, source, fields = update
        reading = {'schemaVersion': 1, 'contentKind': 'reading', 'sourceFile': source.name, 'content': fields['textContent']['stringValue']}
        object_path = fields['readingContentPath']['stringValue']
        request(f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?' + urlencode({'uploadType': 'media', 'name': object_path}), 'POST', raw=json.dumps(reading, ensure_ascii=False).encode('utf-8'))
        request(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/' + quote(object_path, safe=''), 'PATCH', {'cacheControl': 'private, no-store'})
        query = [('updateMask.fieldPaths', key) for key in fields]
        query.append(('currentDocument.updateTime', existing[name]['updateTime']) if name in existing else ('currentDocument.exists', 'false'))
        request(base + '/' + name + '?' + urlencode(query), 'PATCH', {'fields': fields})
        verify = request(base + '/' + name)['fields']
        if verify['textContent'] != fields['textContent']: raise RuntimeError(f'Verification failed: {name}')
        print('INGESTED ' + name, flush=True)
    with ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(publish_unit, updates))
    for module in catalog:
        fields = {key: encode(value) for key, value in module.items()}
        request(base + '/moduleCatalog/' + module['id'], 'PATCH', {'fields': fields})
        if request(base + '/moduleCatalog/' + module['id'])['fields'] != fields: raise RuntimeError('Catalog verification failed')
    snapshot = Path(__file__).resolve().parents[1] / 'src/app/models/course-catalog.json'
    snapshot.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Published and verified {sum(len(m["units"]) for m in catalog)} units. Local snapshot: {snapshot.name}')


if __name__ == '__main__': main()
