"""Sync unit minTier metadata with the 1-5 / 1-10 / full curriculum policy.
No lesson text, media, completion, sponsor codes, or user claims are changed.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    token = subprocess.check_output([shutil.which('gcloud.cmd') or shutil.which('gcloud'), 'auth', 'print-access-token', '--quiet'], text=True).strip()
    base = 'https://firestore.googleapis.com/v1/projects/belyft-d-app/databases/(default)/documents'
    def request(url, data):
        req = Request(url, data=json.dumps(data).encode(), headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        with urlopen(req, timeout=120) as response: return json.load(response)
    def units():
        return [row['document'] for row in request(base + ':runQuery', {'structuredQuery': {'from': [{'collectionId': 'units', 'allDescendants': True}]}}) if 'document' in row]
    before = units()
    writes = []
    for doc in before:
        match = re.search(r'/modules/module-([1-9][0-9]*)/units/unit-[1-9][0-9]*$', doc['name'])
        if not match: continue
        number = int(match[1])
        tier = 1 if number <= 5 else 2 if number <= 10 else 3
        if doc['fields'].get('minTier', {}).get('integerValue') == str(tier): continue
        writes.append({'update': {'name': doc['name'], 'fields': {'minTier': {'integerValue': str(tier)}}},
                       'updateMask': {'fieldPaths': ['minTier']}, 'currentDocument': {'updateTime': doc['updateTime']}})
    print(f'{len(before)} unit documents inspected; {len(writes)} tier metadata updates.')
    if not args.apply: return
    backup = Path('tmp/tier-metadata-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    backup.parent.mkdir(exist_ok=True)
    backup.write_text(json.dumps(before, indent=2), encoding='utf-8')
    for index in range(0, len(writes), 400):
        result = request(base + ':batchWrite', {'writes': writes[index:index + 400]})
        if any(status.get('code', 0) for status in result.get('status', [])): raise RuntimeError('Some tier metadata updates failed')
    after = units()
    counts = {1: 0, 2: 0, 3: 0}
    originals = {doc['name']: doc['fields'] for doc in before}
    for doc in after:
        number = int(re.search(r'/modules/module-(\d+)/', doc['name'])[1])
        expected = 1 if number <= 5 else 2 if number <= 10 else 3
        assert int(doc['fields']['minTier']['integerValue']) == expected
        assert {key: value for key, value in doc['fields'].items() if key != 'minTier'} == {key: value for key, value in originals[doc['name']].items() if key != 'minTier'}
        counts[expected] += 1
    print('Verified tier metadata and unchanged lesson/media fields: ' + json.dumps(counts))


if __name__ == '__main__': main()
