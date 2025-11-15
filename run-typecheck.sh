#!/bin/bash
cd "$(dirname "$0")"
npm run typecheck 2>&1 | tee typecheck-output.txt
