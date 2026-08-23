#!/usr/bin/env bash
# public/icon.svg 에서 설치 아이콘 PNG를 생성한다.
#
# 생성물은 저장소에 커밋한다. 빌드 타임에 래스터화하지 않는 이유:
#   - sharp 같은 네이티브 의존성을 CI에 들이지 않아도 된다
#   - 아이콘은 거의 바뀌지 않는데 매 빌드마다 변환하는 건 낭비다
# 아이콘을 고쳤을 때만 이 스크립트를 다시 돌리면 된다.
#
# 필요: rsvg-convert (brew install librsvg)

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert 가 필요합니다: brew install librsvg" >&2
  exit 1
fi

SRC=public/icon.svg
OUT=public/icons
mkdir -p "$OUT"

# icon.svg는 내용이 전부 maskable 안전영역(중심 반지름 80%) 안에 있어서
# any/maskable/apple-touch를 같은 소스로 낸다. 아래 세 파일이 크기만 다르다.
render() {
  rsvg-convert -w "$1" -h "$1" "$SRC" -o "$2"
  echo "  $2 (${1}px)"
}

echo "아이콘 생성:"
render 192 "$OUT/icon-192.png"
render 512 "$OUT/icon-512.png"
render 180 "$OUT/apple-touch-icon-180.png"
echo "완료."
