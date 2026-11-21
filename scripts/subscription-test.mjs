// Subscribes to onCreateDemo over the AppSync real-time WebSocket endpoint,
// creates an item, and checks that the subscription receives it. Node 22+.
// Usage: node scripts/subscription-test.mjs <graphql-url> <api-key>
const [url, apiKey] = process.argv.slice(2);
if (!url || !apiKey) {
  console.error('Usage: node scripts/subscription-test.mjs <graphql-url> <api-key>');
  process.exit(2);
}

const host = new URL(url).host;
const realtimeUrl = url.replace('https://', 'wss://').replace('appsync-api', 'appsync-realtime-api');
const auth = { host, 'x-api-key': apiKey };
const header = Buffer.from(JSON.stringify(auth)).toString('base64url');
const name = `subscription-test-${Date.now()}`;

const timeout = setTimeout(() => fail('timed out waiting for the subscription event'), 30_000);
function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const ws = new WebSocket(realtimeUrl, ['graphql-ws', `header-${header}`]);
ws.onerror = (e) => fail(`WebSocket error: ${e.message ?? e.type}`);
ws.onopen = () => ws.send(JSON.stringify({ type: 'connection_init' }));
ws.onmessage = async ({ data }) => {
  const msg = JSON.parse(data);
  switch (msg.type) {
    case 'connection_ack':
      ws.send(JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          data: JSON.stringify({
            query: 'subscription($name: String) { onCreateDemo(name: $name) { id name } }',
            variables: { name },
          }),
          extensions: { authorization: auth },
        },
      }));
      break;
    case 'start_ack': {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          // Subscribers only receive (and filter on) fields the mutation selects.
          query: 'mutation($i: CreateDemoInput!) { createDemo(input: $i) { id name createdAt updatedAt } }',
          variables: { i: { name } },
        }),
      });
      if (!res.ok) fail(`createDemo returned HTTP ${res.status}`);
      break;
    }
    case 'data': {
      const item = msg.payload.data.onCreateDemo;
      if (item.name !== name) fail(`unexpected event ${JSON.stringify(item)}`);
      console.log(`OK   onCreateDemo received ${item.id}`);
      clearTimeout(timeout);
      ws.close();
      break;
    }
    case 'ka':
      break;
    case 'error':
    case 'connection_error':
      fail(JSON.stringify(msg.payload));
      break;
    default:
  }
};
