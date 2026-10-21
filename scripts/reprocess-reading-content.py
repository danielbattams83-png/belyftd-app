"""Rebuild canonical reading JSON from original documents; never modify course media.
Dry-run by default. --apply updates active Firestore units and private Storage JSON.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from reading_content import extract_reading_document

PROJECT = 'belyft-d-app'
BUCKET = PROJECT + '.firebasestorage.app'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--site-files', type=Path, default=Path("H:/My Drive/Lyft'd Lessons/Site Files"))
    args = parser.parse_args()
    token = subprocess.check_output([shutil.which('gcloud.cmd') or shutil.which('gcloud'), 'auth', 'print-access-token', '--quiet'], text=True).strip()
    def request(url, method='GET', data=None, raw=None):
        payload = raw if raw is not None else json.dumps(data).encode() if data is not None else None
        req = Request(url, method=method, data=payload, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urlopen(req, timeout=120) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code == 404 and method == 'GET': return None
            raise RuntimeError(f'{method} failed: HTTP {error.code}') from None
    base = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
    rows = request(base + ':runQuery', 'POST', {'structuredQuery': {'from': [{'collectionId': 'units', 'allDescendants': True}]}})
    sources = list((args.site_files / '2. Documents').rglob('*.docx'))
    plan = []
    for row in rows:
        if 'document' not in row: continue
        doc = row['document']
        name = doc['name'].split('/documents/')[1]
        match = re.fullmatch(r'modules/module-(\d+)/units/unit-(\d+)', name)
        if not match: continue
        fields = doc['fields']
        # Explicitly inactive units are not part of this repair.
        if fields.get('active', {}).get('booleanValue') is False: continue
        code = f'{int(match[1])}.{int(match[2])}'
        masters = [p for p in sources if 'Master Files' in p.parts and re.match(r'^(?:LL[- .]*)?' + re.escape(code) + r'(?=[.() -]|$)', p.stem, re.I)]
        filename = fields.get('sourceFile', {}).get('stringValue', '')
        originals = masters or [p for p in sources if p.name == filename and not any(re.fullmatch(r'scripts?|narration|elevenlabs', part, re.I) for part in p.parts)]
        if len(originals) != 1: raise ValueError(f'Expected one original reading source for {name}; found {len(originals)}')
        source = originals[0]
        text = extract_reading_document(source)
        object_path = f'course-content/module-{match[1]}/unit-{match[2]}/text.json'
        reading = {'schemaVersion': 1, 'contentKind': 'reading', 'sourceFile': source.name, 'content': text}
        plan.append((doc, name, object_path, reading))
        print(f'{name}: {len(text)} clean characters from {source.name}')
    if not plan: raise ValueError('No active units found.')
    print(f'Plan: {len(plan)} reading JSON files and Firestore text fields; audio/video unchanged.')
    if not args.apply: return
    backup = Path('tmp/reading-content-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    backup.parent.mkdir(exist_ok=True)
    backup.write_text(json.dumps([item[0] for item in plan], indent=2), encoding='utf-8')
    for doc, name, object_path, reading in plan:
        query = urlencode({'uploadType': 'media', 'name': object_path})
        request(f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?{query}', 'POST', raw=json.dumps(reading, ensure_ascii=False).encode('utf-8'))
        request(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/' + quote(object_path, safe=''), 'PATCH', {'cacheControl': 'private, no-store'})
        fields = {'textContent': {'stringValue': reading['content']}, 'readingContentPath': {'stringValue': object_path},
                  'contentKind': {'stringValue': 'reading'}, 'sourceFile': {'stringValue': reading['sourceFile']},
                  'updatedAt': {'timestampValue': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}}
        query = [('updateMask.fieldPaths', key) for key in fields] + [('currentDocument.updateTime', doc['updateTime'])]
        request(base + '/' + name + '?' + urlencode(query), 'PATCH', {'fields': fields})
        verify = request(base + '/' + name)['fields']
        if verify['textContent']['stringValue'] != reading['content']: raise RuntimeError('Firestore verification failed: ' + name)
        raw = request(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/' + quote(object_path, safe='') + '?alt=media')
        if raw != reading: raise RuntimeError('Reading JSON verification failed: ' + name)
        print('UPDATED AND VERIFIED ' + name)
    print(f'Complete. Original Firestore records backed up locally: {backup}')


if __name__ == '__main__':
    main()
