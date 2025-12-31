#!/bin/bash
cd /home/kavia/workspace/code-generation/thai-accountant-assistant-226192-226202/accountant_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

