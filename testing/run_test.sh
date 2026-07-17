#!/bin/sh
npm run api >/dev/null 2>/dev/null &
wait-on http://localhost:19339/ping
cd testing && uv run run_tests.py "$@"
curl --silent http://localhost:19339/shutdown >/dev/null
