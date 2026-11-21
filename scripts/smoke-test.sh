#!/usr/bin/env bash
# End-to-end test of a deployed stack: create, get, list (filter, paging),
# update, delete, and error cases. Requires the AWS CLI, curl, and jq.
# Usage: scripts/smoke-test.sh <stack-name> [region]
set -euo pipefail
stack=$1
region=${2:-$(aws configure get region)}

output() {
  aws cloudformation describe-stacks --region "$region" --stack-name "$stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
url=$(output GraphQLUrl)
api_id=$(output ApiId)
api_key=$(aws appsync list-api-keys --region "$region" --api-id "$api_id" --query 'apiKeys[0].id' --output text)

# gql <query> [variables-json] -> response body
gql() {
  jq -n --arg q "$1" --argjson v "${2:-{\}}" '{query: $q, variables: $v}' |
    curl -fsS -H "x-api-key: $api_key" -H 'Content-Type: application/json' --data @- "$url"
}
check() { # <description> <jq-filter> <json>
  if jq -e "$2" >/dev/null <<<"$3"; then echo "OK   $1"; else echo "FAIL $1: $3"; exit 1; fi
}

fields='id name createdAt updatedAt'
r=$(gql "mutation(\$i: CreateDemoInput!) { createDemo(input: \$i) { $fields } }" '{"i": {"name": "  Smoke test  "}}')
check 'create trims the name and sets timestamps' '.data.createDemo.name == "Smoke test" and .data.createDemo.createdAt != null' "$r"
id=$(jq -r '.data.createDemo.id' <<<"$r")

r=$(gql "query(\$id: ID!) { getDemo(id: \$id) { $fields } }" "{\"id\": \"$id\"}")
check 'get returns the item' ".data.getDemo.id == \"$id\"" "$r"

r=$(gql 'query { getDemo(id: "does-not-exist") { id } }')
check 'get of a missing id returns null' '.data.getDemo == null and (.errors | not)' "$r"

r=$(gql "query { listDemos(filter: {name: {beginsWith: \"Smoke\"}}) { items { $fields } nextToken } }")
check 'list with a filter includes the item' "[.data.listDemos.items[].id] | index(\"$id\") != null" "$r"

gql 'mutation { createDemo(input: {name: "Second"}) { id } }' >/dev/null
r=$(gql 'query { listDemos(limit: 1) { items { id } nextToken } }')
check 'list honors limit and returns a nextToken' '(.data.listDemos.items | length) == 1 and .data.listDemos.nextToken != null' "$r"

r=$(gql 'query { listDemos(limit: 0) { items { id } } }')
check 'list rejects limit 0' '.errors[0].errorType == "ValidationError"' "$r"

r=$(gql "mutation(\$i: UpdateDemoInput!) { updateDemo(input: \$i) { $fields } }" "{\"i\": {\"id\": \"$id\", \"name\": \"Renamed\"}}")
check 'update renames the item and bumps updatedAt' '.data.updateDemo.name == "Renamed" and .data.updateDemo.updatedAt >= .data.updateDemo.createdAt' "$r"

r=$(gql 'mutation { updateDemo(input: {id: "does-not-exist", name: "x"}) { id } }')
check 'update of a missing id fails with NotFound' '.errors[0].errorType == "NotFound"' "$r"

r=$(gql 'mutation { createDemo(input: {name: "   "}) { id } }')
check 'create rejects a blank name' '.errors[0].errorType == "ValidationError"' "$r"

r=$(gql "mutation(\$i: DeleteDemoInput!) { deleteDemo(input: \$i) { $fields } }" "{\"i\": {\"id\": \"$id\"}}")
check 'delete returns the deleted item' ".data.deleteDemo.id == \"$id\" and .data.deleteDemo.name == \"Renamed\"" "$r"

r=$(gql "mutation(\$i: DeleteDemoInput!) { deleteDemo(input: \$i) { id } }" "{\"i\": {\"id\": \"$id\"}}")
check 'delete of a missing id fails with NotFound' '.errors[0].errorType == "NotFound"' "$r"

r=$(curl -sS -H 'x-api-key: wrong' -H 'Content-Type: application/json' --data '{"query":"{ listDemos { items { id } } }"}' "$url")
check 'requests with a wrong API key are rejected' '.errors[0].errorType == "UnauthorizedException"' "$r"

echo "All checks passed"
