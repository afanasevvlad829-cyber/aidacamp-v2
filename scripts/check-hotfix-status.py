"""Fail closed unless the exact isolated candidate passed Forgejo quality."""
import json
import os
import urllib.request

base = os.environ['API_URL'].rstrip('/')
repo = os.environ['REPOSITORY']
sha = os.environ['RELEASE_SHA']
req = urllib.request.Request(f'{base}/repos/{repo}/commits/{sha}/status', headers={
    'Authorization': 'token ' + os.environ['API_TOKEN'],
    'Accept': 'application/json',
})
with urllib.request.urlopen(req, timeout=30) as response:
    result = json.load(response)
quality = [s for s in result.get('statuses', []) if s.get('context', '').startswith('Quality Gate / quality')]
if not quality or any(s.get('status') != 'success' for s in quality):
    raise SystemExit('Exact release SHA has no successful Quality Gate; refusing promotion')
print('Exact release SHA Quality Gate passed')
