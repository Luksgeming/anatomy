#!/bin/sh
# Internal visual check: start an app's dev server, run one drive.mjs action file against it, and always stop the
# server afterwards (the user wants localhost off unless they ask for it).
# Usage: scripts/check.sh <app> <port> <actions.json> [drive options...]
app=$1; port=$2; actions=$3; shift 3
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root/apps/$app" || exit 1
npx next dev -p "$port" > /tmp/check-$app.log 2>&1 &
trap 'pkill -f "next dev -p $port" 2>/dev/null' EXIT INT TERM
curl -s --retry 60 --retry-delay 2 --retry-connrefused -o /dev/null "http://localhost:$port/" || { tail -20 /tmp/check-$app.log; exit 1; }
node "$root/packages/iso-kit/tools/drive.mjs" "http://localhost:$port${CHECK_PATH:-/}" --actions "$actions" "$@" 2>&1 | grep -v "^shot\|THREE.Clock\|PCFSoftShadowMap\|deprecated\|maxLeafTris\|TextureSource"
