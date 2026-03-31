#!/usr/bin/env bash
# -----------------------------------------------
# ACC Integration Test Suite — Phase 1
# -----------------------------------------------
# Prerequisites:
#   1. Backend running: cd app/backend && cargo run
#   2. .env configured with valid APS_CLIENT_ID, APS_CLIENT_SECRET, DATABASE_URL
#   3. Supabase migrations applied
#
# Usage:
#   chmod +x test/acc_integration.sh
#   ./test/acc_integration.sh
# -----------------------------------------------

set -euo pipefail

BASE_URL="${BACKEND_URL:-http://localhost:3001}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_result() {
    local test_name="$1"
    local status="$2"
    local detail="${3:-}"

    if [ "$status" = "PASS" ]; then
        echo -e "  ${GREEN}✓${NC} ${test_name}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} ${test_name}"
        [ -n "$detail" ] && echo -e "    ${RED}→ ${detail}${NC}"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "======================================"
echo " ACC Integration Tests — Phase 1"
echo "======================================"
echo ""
echo "Target: ${BASE_URL}"
echo ""

# ------------------------------------------
# Test 1: Health endpoint
# ------------------------------------------
echo -e "${YELLOW}[1/5] Health Check${NC}"

HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health" 2>/dev/null || echo "CURL_FAIL")
HEALTH_CODE=$(echo "$HEALTH_RESP" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESP" | head -1)

if [ "$HEALTH_CODE" = "200" ]; then
    STATUS=$(echo "$HEALTH_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "")
    if [ "$STATUS" = "ok" ]; then
        print_result "GET /api/health returns 200 with status=ok" "PASS"
    else
        print_result "GET /api/health returns 200 but status != ok" "FAIL" "Body: $HEALTH_BODY"
    fi
else
    print_result "GET /api/health" "FAIL" "HTTP $HEALTH_CODE — is the backend running?"
fi

# ------------------------------------------
# Test 2: 2-Legged OAuth (token acquisition)
# ------------------------------------------
echo ""
echo -e "${YELLOW}[2/5] 2-Legged OAuth Token${NC}"

# We test this indirectly: the backend should be able to get a token.
# We add a quick test endpoint or we can test via the APS API directly.
# For Phase 1, we test that the /api/acc/token endpoint returns 401
# (no Autodesk connection yet), which proves the route + DB query work.
TOKEN_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/acc/token" 2>/dev/null || echo "CURL_FAIL")
TOKEN_CODE=$(echo "$TOKEN_RESP" | tail -1)

if [ "$TOKEN_CODE" = "401" ]; then
    print_result "GET /api/acc/token returns 401 (no connection yet — expected)" "PASS"
elif [ "$TOKEN_CODE" = "200" ]; then
    print_result "GET /api/acc/token returns 200 (already connected)" "PASS"
else
    print_result "GET /api/acc/token" "FAIL" "HTTP $TOKEN_CODE (expected 401 or 200)"
fi

# ------------------------------------------
# Test 3: 3-Legged OAuth redirect
# ------------------------------------------
echo ""
echo -e "${YELLOW}[3/5] 3-Legged OAuth Login Redirect${NC}"

LOGIN_RESP=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" "${BASE_URL}/api/acc/login" 2>/dev/null || echo "CURL_FAIL")
LOGIN_CODE=$(echo "$LOGIN_RESP" | cut -d'|' -f1)
LOGIN_REDIRECT=$(echo "$LOGIN_RESP" | cut -d'|' -f2)

if [ "$LOGIN_CODE" = "307" ] || [ "$LOGIN_CODE" = "302" ]; then
    if echo "$LOGIN_REDIRECT" | grep -q "developer.api.autodesk.com"; then
        print_result "GET /api/acc/login redirects to Autodesk OAuth" "PASS"
    else
        print_result "GET /api/acc/login redirects but not to Autodesk" "FAIL" "Redirect: $LOGIN_REDIRECT"
    fi
else
    print_result "GET /api/acc/login" "FAIL" "HTTP $LOGIN_CODE (expected 307 redirect)"
fi

# ------------------------------------------
# Test 4: Database tables exist
# ------------------------------------------
echo ""
echo -e "${YELLOW}[4/5] Database Tables${NC}"

# Source .env for DATABASE_URL
if [ -f "app/backend/.env" ]; then
    export $(grep -v '^#' app/backend/.env | xargs)
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
    print_result "DATABASE_URL not set — skipping DB checks" "FAIL" "Set DATABASE_URL in app/backend/.env"
else
    TABLES=("models" "model_metadata" "model_elements" "model_object_tree" "autodesk_tokens")
    for TABLE in "${TABLES[@]}"; do
        RESULT=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$TABLE');" 2>/dev/null | tr -d ' ' || echo "error")
        if [ "$RESULT" = "t" ]; then
            print_result "Table '$TABLE' exists" "PASS"
        else
            print_result "Table '$TABLE' exists" "FAIL" "Table not found — run migrations first"
        fi
    done
fi

# ------------------------------------------
# Test 5: CORS headers
# ------------------------------------------
echo ""
echo -e "${YELLOW}[5/5] CORS Headers${NC}"

CORS_RESP=$(curl -s -I -X OPTIONS \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: GET" \
    "${BASE_URL}/api/health" 2>/dev/null || echo "CURL_FAIL")

if echo "$CORS_RESP" | grep -qi "access-control-allow"; then
    print_result "CORS headers present on preflight" "PASS"
else
    print_result "CORS headers present on preflight" "FAIL" "No access-control-allow-* headers found"
fi

# ------------------------------------------
# Summary
# ------------------------------------------
echo ""
echo "======================================"
TOTAL=$((PASS + FAIL))
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC} / ${TOTAL} total"
echo "======================================"
echo ""

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
