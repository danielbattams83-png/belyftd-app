"""Read-only Firebase Rules API checks for the deployed Storage module policy.
Tests use mocked requests/resources; no customer files or rules releases are changed.
"""
import json
from pathlib import Path
import shutil
import subprocess
from urllib.request import Request, urlopen


def main():
    token = subprocess.check_output([shutil.which('gcloud.cmd') or shutil.which('gcloud'), 'auth', 'print-access-token', '--quiet'], text=True).strip()
    cases = []
    for tier in [0, 1, 2, 3, 4, '1', 1.5, None, True]:
        for module in [5, 6, 10, 11, 21, 22]:
            allowed = type(tier) is int and tier in [1, 2, 3, 4] and (tier >= 3 or (tier == 2 and module <= 10) or module <= 5)
            name = f'course-content/module-{module}/unit-1/audio/lesson.mp3'
            cases.append({'expectation': 'ALLOW' if allowed else 'DENY',
                          'request': {'path': '/b/belyft-d-app.firebasestorage.app/o/' + name, 'method': 'get',
                                      'auth': {'uid': 'rules-validation', 'token': {'subscriptionTier': tier}}},
                          'resource': {'name': name, 'bucket': 'belyft-d-app.firebasestorage.app'}})
    body = {'source': {'files': [{'name': 'storage.rules', 'content': Path('storage.rules').read_text()}]}, 'testSuite': {'testCases': cases}}
    request = Request('https://firebaserules.googleapis.com/v1/projects/belyft-d-app:test', data=json.dumps(body).encode(),
                      headers={'Authorization': 'Bearer ' + token, 'x-goog-user-project': 'belyft-d-app', 'Content-Type': 'application/json'})
    with urlopen(request, timeout=120) as response: result = json.load(response)
    results = result.get('testResults', [])
    if result.get('issues') or len(results) != len(cases) or any(test.get('state') != 'SUCCESS' for test in results):
        raise RuntimeError('Storage policy tests failed; review the source rules.')
    print(f'Passed {len(cases)} Storage policy checks, including boundary modules and unsupported claims.')


if __name__ == '__main__': main()
