#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[git-garbage-clean] Not a git repository: $ROOT_DIR" >&2
  exit 1
fi

git_dir="$(git rev-parse --git-dir)"
pack_dir="$git_dir/objects/pack"
objects_dir="$git_dir/objects"

tmp_pack_before="$(find "$pack_dir" -maxdepth 1 -type f -name 'tmp_pack_*' | wc -l | awk '{print $1}')"
tmp_obj_before="$(find "$objects_dir" -type f -name 'tmp_obj_*' | wc -l | awk '{print $1}')"
size_before="$(du -sh "$objects_dir" | awk '{print $1}')"

find "$pack_dir" -maxdepth 1 -type f -name 'tmp_pack_*' -delete
find "$objects_dir" -type f -name 'tmp_obj_*' -delete

tmp_pack_after="$(find "$pack_dir" -maxdepth 1 -type f -name 'tmp_pack_*' | wc -l | awk '{print $1}')"
tmp_obj_after="$(find "$objects_dir" -type f -name 'tmp_obj_*' | wc -l | awk '{print $1}')"
size_after="$(du -sh "$objects_dir" | awk '{print $1}')"

echo "[git-garbage-clean] repo: $ROOT_DIR"
echo "[git-garbage-clean] objects: $size_before -> $size_after"
echo "[git-garbage-clean] tmp_pack: $tmp_pack_before -> $tmp_pack_after"
echo "[git-garbage-clean] tmp_obj:  $tmp_obj_before -> $tmp_obj_after"
