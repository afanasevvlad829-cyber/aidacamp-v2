#!/usr/bin/env bash
# Test script for file-level locking system
# Demonstrates lock acquire, check, release, and cleanup workflows
#
# Run with: bash scripts/test-file-locking.sh [verbose]

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOCK_MANAGER="$REPO_ROOT/scripts/file-lock-manager.sh"
AUDIT_TOOL="$REPO_ROOT/scripts/audit-file-locks.sh"
VERBOSE="${1:-}"

if [[ ! -f "$LOCK_MANAGER" ]]; then
  echo "❌ File lock manager not found: $LOCK_MANAGER" >&2
  exit 1
fi

test_file="src/components/hero/Mobile.astro"

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
tests_passed=0
tests_failed=0

test_step() {
  echo ""
  echo -e "${BLUE}→ $1${NC}"
}

test_pass() {
  echo -e "${GREEN}✓ $1${NC}"
  tests_passed=$((tests_passed + 1))
}

test_fail() {
  echo -e "${RED}✗ $1${NC}"
  tests_failed=$((tests_failed + 1))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FILE-LEVEL LOCKING SYSTEM TEST SUITE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Check lock on unlocked file
test_step "Test 1: Check lock on unlocked file (should not be locked)"
if bash "$LOCK_MANAGER" check "$test_file" &>/dev/null; then
  test_pass "File is not locked"
else
  test_fail "File should not be locked initially"
fi

# Test 2: Acquire lock
test_step "Test 2: Acquire lock on file"
if bash "$LOCK_MANAGER" acquire "$test_file" "Testing file lock system" &>/dev/null; then
  test_pass "Lock acquired successfully"
else
  test_fail "Failed to acquire lock"
fi

# Test 3: Check lock on locked file
test_step "Test 3: Verify lock is now active"
if ! bash "$LOCK_MANAGER" check "$test_file" &>/dev/null; then
  test_pass "File is locked (check returns error as expected)"
else
  test_fail "File should be locked but check did not fail"
fi

# Test 4: Audit shows lock
test_step "Test 4: Audit shows the lock"
if bash "$AUDIT_TOOL" audit 2>&1 | grep -F "ACTIVE LOCKS:" | head -1 > /dev/null && \
   bash "$AUDIT_TOOL" audit 2>&1 | grep -F "$test_file" > /dev/null; then
  test_pass "Audit correctly shows locked file"
else
  test_fail "Audit should show the locked file"
fi

# Test 5: Release lock
test_step "Test 5: Release lock"
if bash "$LOCK_MANAGER" release "$test_file" &>/dev/null; then
  test_pass "Lock released successfully"
else
  test_fail "Failed to release lock"
fi

# Test 6: Verify lock is gone
test_step "Test 6: Verify lock is released"
if bash "$LOCK_MANAGER" check "$test_file" &>/dev/null; then
  test_pass "File is no longer locked"
else
  test_fail "File should not be locked after release"
fi

# Test 7: Cleanup expired locks
test_step "Test 7: Cleanup expired locks"
if bash "$LOCK_MANAGER" cleanup &>/dev/null; then
  test_pass "Cleanup completed successfully"
else
  test_fail "Cleanup failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $tests_passed${NC}"
echo -e "${RED}Failed: $tests_failed${NC}"

if [[ $tests_failed -eq 0 ]]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
