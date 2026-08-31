#!/bin/bash

# Get the list of staged files (only .ts and .js files, excluding test files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js)$' | grep -v -E '(test|spec)\.(ts|js)$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

CONSOLE_LOG_FOUND=false

echo "[Husky] Checking for console.log statements in staged files..."

for FILE in $STAGED_FILES; do
  # Check if file exists (could be deleted)
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  # Search for console.log (but exclude console.error, console.warn, etc.)
  if grep -n -E "console\.log\(" "$FILE"; then
    echo "❌ Found console.log in: $FILE"
    CONSOLE_LOG_FOUND=true
  fi
done

if [ "$CONSOLE_LOG_FOUND" = true ]; then
  echo ""
  echo "❌ Commit failed: console.log statements found in staged files."
  echo "Please remove console.log statements before committing."
  echo "Tip: You can use console.error, console.warn, or a proper logger instead."
  exit 1
fi

echo "✅ No console.log statements found"
exit 0
