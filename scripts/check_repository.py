#!/usr/bin/env python3
"""Check tracked Markdown file targets and SHA-256 manifests, without network access."""

import hashlib
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def check(root: Path) -> list[str]:
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=root
    ).decode().split("\0")
    files = {name for name in tracked if name}
    errors = []
    for name in sorted(files):
        path = root / name
        if path.suffix == ".md":
            # Only inline Markdown links/images; ignore fenced code examples.
            content = re.sub(r"(?ms)^```.*?^```[^\n]*", "", path.read_text())
            for match in re.finditer(r"\]\(<?([^\s)>]+)>?(?:\s+[^)]*)?\)", content):
                target = match.group(1)
                url = urlsplit(target)
                if url.scheme or url.netloc or not url.path:
                    continue
                destination = (path.parent / unquote(url.path)).resolve()
                if not destination.is_relative_to(root):
                    errors.append(f"{name}: link escapes repository: {target}")
                elif destination.relative_to(root).as_posix() not in files:
                    errors.append(f"{name}: link target is not tracked: {target}")
        if path.name == "checksums.sha256":
            for number, line in enumerate(path.read_text().splitlines(), 1):
                if not line.strip():
                    continue
                match = re.fullmatch(r"([0-9a-fA-F]{64}) [ *](.+)", line)
                if not match:
                    errors.append(f"{name}:{number}: invalid SHA-256 entry")
                    continue
                expected, target = match.groups()
                asset = (path.parent / target).resolve()
                if (not asset.is_relative_to(root)
                        or asset.relative_to(root).as_posix() not in files
                        or not asset.is_file()):
                    errors.append(f"{name}:{number}: missing tracked asset: {target}")
                elif hashlib.sha256(asset.read_bytes()).hexdigest() != expected.lower():
                    errors.append(f"{name}:{number}: SHA-256 mismatch: {target}")
    return errors


if __name__ == "__main__":
    problems = check(ROOT)
    if problems:
        print("\n".join(problems))
        raise SystemExit(1)
    print("Tracked Markdown file targets and SHA-256 manifests passed.")
