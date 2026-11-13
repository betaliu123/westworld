#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npm run build
npm test
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project "$PWD" --qr-format image --qr-output "$PWD/work/preview-qr.png"
