#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:9229"
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export AWS_DEFAULT_REGION=us-east-1

echo "Waiting for cognito-local to be ready..."
for i in $(seq 1 30); do
  if curl -s "$ENDPOINT/health" > /dev/null 2>&1; then
    echo "cognito-local is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: cognito-local did not become ready in time"
    exit 1
  fi
  sleep 1
done

echo ""
echo "Creating user pool..."
POOL_OUTPUT=$(aws --endpoint "$ENDPOINT" cognito-idp create-user-pool \
  --pool-name TeamStatusPool \
  --username-attributes email \
  --auto-verified-attributes email \
  --schema '[{"Name":"given_name","Required":true,"Mutable":true},{"Name":"family_name","Required":true,"Mutable":true}]')

POOL_ID=$(echo "$POOL_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPool']['Id'])")
echo "User Pool ID: $POOL_ID"

echo ""
echo "Creating user pool client..."
CLIENT_OUTPUT=$(aws --endpoint "$ENDPOINT" cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name StatusAppClient \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --access-token-validity 1 \
  --id-token-validity 1 \
  --refresh-token-validity 7 \
  --token-validity-units '{"AccessToken":"hours","IdToken":"hours","RefreshToken":"days"}')

CLIENT_ID=$(echo "$CLIENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPoolClient']['ClientId'])")
echo "Client ID: $CLIENT_ID"

echo ""
echo "Creating test user..."
aws --endpoint "$ENDPOINT" cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "testuser@example.com" \
  --user-attributes \
    Name=email,Value=testuser@example.com \
    Name=email_verified,Value=true \
    Name=given_name,Value=Test \
    Name=family_name,Value=User \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS > /dev/null

echo "Setting permanent password..."
aws --endpoint "$ENDPOINT" cognito-idp admin-set-user-password \
  --user-pool-id "$POOL_ID" \
  --username "testuser@example.com" \
  --password "TestPass123!" \
  --permanent > /dev/null

echo ""
echo "========================================="
echo "Setup complete!"
echo ""
echo "Update your .env.local with:"
echo ""
echo "NEXT_PUBLIC_USER_POOL_ID=$POOL_ID"
echo "NEXT_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID"
echo "COGNITO_POOL_ID=$POOL_ID"
echo "COGNITO_CLIENT_ID=$CLIENT_ID"
echo ""
echo "Test user: testuser@example.com / TestPass123!"
echo "========================================="
