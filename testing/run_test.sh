#!/bin/sh

PORT=3001

if curl -s http://localhost:$PORT/ping; then
  echo "API Server still up, restarting"
  curl --silent http://localhost:$PORT/shutdown >/dev/null
fi

npm run api >/dev/null 2>/dev/null &
wait-on http://localhost:$PORT/ping
cd testing && uv run run_tests.py "$@"
curl --silent http://localhost:$PORT/shutdown >/dev/null
