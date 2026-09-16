"""Read-only gate executed over SSH: hash every current build file except shared media."""
import hashlib
from pathlib import Path
import re
import sys

expected = sys.argv[1]
if not re.fullmatch('[0-9a-f]{64}', expected):
    raise SystemExit('A complete runtime SHA256 is required')
digests = []
for part in ['client', 'server']:
    base = Path('/var/www/aidacamp/current') / part
    entries = []
    for path in base.rglob('*'):
        relative = str(path.relative_to(base))
        if path.is_file() and not (part == 'client' and relative.startswith('images/')):
            entries.append((relative, hashlib.sha256(path.read_bytes()).hexdigest()))
    if not entries:
        raise SystemExit('Runtime directory is empty')
    canonical = ''.join(f'{name}\0{digest}\n' for name, digest in sorted(entries))
    digests.append(hashlib.sha256(canonical.encode()).hexdigest())
actual = hashlib.sha256('\n'.join(digests).encode()).hexdigest()
if actual != expected:
    raise SystemExit(f'Runtime changed: expected {expected}, actual {actual}')
print(f'Runtime manifest verified: {actual}')
