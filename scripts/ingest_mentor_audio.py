"""Register known local Sophie/Omari production audio without replacing other media.

Run with the clean-docx Python environment. Defaults to a dry run; --apply uploads
new objects and patches unit audio maps, preserving existing tier and content.
Authentication uses the signed-in Google Cloud CLI account; no tokens are stored.
"""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
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
SITE = Path("H:/My Drive/Lyft'd Lessons/Site Files")
LESSONS = {
    'identitytheft': ('module-2', 'unit-1', 'Identity Theft', None),
    'against all odds': ('module-5', 'unit-1', 'Against All Odds', 'L.L AGAINST ALL ODDS THE PETER DANIELS STORY 2 PAGES.docx'),
    'hope': ('module-5', 'unit-2', 'Hope', None),
    'courage': ('module-5', 'unit-3', 'Courage', 'L.L COURAGE 3 pages.docx'),
}


def request_json(url, token, method='GET', data=None, raw=None):
    payload = raw if raw is not None else json.dumps(data).encode() if data is not None else None
    request = Request(url, data=payload, method=method, headers={
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'audio/mpeg' if raw is not None else 'application/json',
    })
    try:
        with urlopen(request, timeout=120) as response:
            body = response.read()
            return json.loads(body) if body else {}
    except HTTPError as error:
        if error.code == 404 and method == 'GET':
            return None
        # Do not print credentials, URLs with tokens, or remote response bodies.
        raise RuntimeError(f'{method} request failed with HTTP {error.code}.') from error


def discover(site):
    result = []
    for path in sorted((site / '4. Mentors').rglob('*.mp3')):
        match = re.fullmatch(r'(.+)-(sophie|omari)-\((english|chinese|swahili)\)', path.stem, re.I)
        if not match:
            continue
        lesson = match[1].strip().casefold().replace('-', '') if match[1].casefold() == 'identity-theft' else match[1].strip().casefold()
        if lesson not in LESSONS:
            raise ValueError(f'Unmapped mentor audio: {path.name}')
        module, unit, title, document = LESSONS[lesson]
        mentor, language = match[2].title(), match[3].title()
        if language not in ({'Sophie': {'English', 'Chinese'}, 'Omari': {'English', 'Swahili'}}[mentor]):
            raise ValueError(f'Unsupported mentor/language: {path.name}')
        filename = re.sub(r'[^A-Za-z0-9_.-]+', '-', path.stem.lower()).strip('-.') + '.mp3'
        result.append({'source': path, 'path': f'course-content/{module}/{unit}/audio/{filename}',
                       'module': module, 'unit': unit, 'title': title, 'document': document,
                       'label': f'{mentor} ({language})'})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--site-files', type=Path, default=SITE)
    args = parser.parse_args()
    cli = shutil.which('gcloud.cmd') or shutil.which('gcloud')
    if not cli:
        raise RuntimeError('Install/authenticate Google Cloud CLI first.')
    token = subprocess.check_output([cli, 'auth', 'print-access-token', '--quiet'], text=True).strip()
    media = discover(args.site_files)
    if not media:
        raise ValueError('No supported Sophie/Omari recordings were found.')
    firestore = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/'
    units = {}
    for item in media:
        name = f"modules/{item['module']}/units/{item['unit']}"
        if name not in units:
            units[name] = request_json(firestore + name, token)
        metadata = request_json(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/' + quote(item['path'], safe=''), token)
        digest = base64.b64encode(hashlib.md5(item['source'].read_bytes()).digest()).decode()
        if metadata and metadata.get('md5Hash') != digest:
            raise ValueError(f"Existing object differs from the local recording: {item['path']}; refusing to overwrite it.")
        item['upload'] = metadata is None
        print(('UPLOAD ' if item['upload'] else 'EXISTS ') + item['path'])
    print(f"Plan: {sum(item['upload'] for item in media)} new audio objects; {sum(unit is None for unit in units.values())} new units.")
    if not args.apply:
        return
    library = args.site_files / '2. Documents' / '2. 2025 LIBRARY LYFTD' / '2025 LIBRARY LYFTD'

    report = []
    for name, existing in units.items():
        relevant = [item for item in media if name == f"modules/{item['module']}/units/{item['unit']}"]
        fields = existing.get('fields', {}) if existing else {}
        audio = dict(fields.get('audioUrls', {}).get('mapValue', {}).get('fields', {}))
        for item in relevant:
            if item['upload']:
                query = urlencode({'uploadType': 'media', 'name': item['path'], 'ifGenerationMatch': '0'})
                request_json(f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?{query}', token,
                             method='POST', raw=item['source'].read_bytes())
                request_json(f'https://storage.googleapis.com/storage/v1/b/{BUCKET}/o/' + quote(item['path'], safe=''),
                             token, method='PATCH', data={'cacheControl': 'private, max-age=300'})
            label = next((key for key in audio if key.casefold() == item['label'].casefold()), item['label'])
            audio[label] = {'stringValue': item['path']}
            report.append({'source': str(item['source']), 'storagePath': item['path'], 'label': label, 'uploaded': item['upload']})
        patch = {'audioUrls': {'mapValue': {'fields': audio}},
                 'updatedAt': {'timestampValue': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}}
        if not existing:
            first = relevant[0]
            if not first['document']:
                raise ValueError(f'No source lesson for new unit {name}')
            body = extract_reading_document(library / first['document'])
            if not body:
                raise ValueError(f'Empty lesson text for {name}')
            patch.update({'title': {'stringValue': first['title']}, 'minTier': {'integerValue': '3'},
                          'textContent': {'stringValue': body}, 'videoUrls': {'mapValue': {'fields': {}}},
                          'sourceFile': {'stringValue': first['document']},
                          'contentKind': {'stringValue': 'reading'},
                          'readingContentPath': {'stringValue': f"course-content/{first['module']}/{first['unit']}/text.json"}})
            reading = {'schemaVersion': 1, 'contentKind': 'reading', 'content': body}
            query = urlencode({'uploadType': 'media', 'name': patch['readingContentPath']['stringValue'], 'ifGenerationMatch': '0'})
            request_json(f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?{query}', token, method='POST', data=reading)
        query = [('updateMask.fieldPaths', key) for key in patch]
        query.append(('currentDocument.updateTime', existing['updateTime']) if existing else ('currentDocument.exists', 'false'))
        request_json(firestore + name + '?' + urlencode(query), token, method='PATCH', data={'fields': patch})
        print('REGISTERED ' + name)
    report_path = Path(__file__).resolve().parents[1] / 'docs' / 'mentor-audio-import-20261021.json'
    report_path.write_text(json.dumps({'project': PROJECT, 'newAudioObjects': sum(item['upload'] for item in media), 'recordings': report}, indent=2), encoding='utf-8')
    print('Import complete: ' + str(report_path))


if __name__ == '__main__':
    main()
