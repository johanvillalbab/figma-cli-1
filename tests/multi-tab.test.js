import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FigmaClient } from '../src/figma-client.js';

const pages = [
  { id: 'tab-a', title: 'Main', url: 'https://www.figma.com/design/file-a/Main', webSocketDebuggerUrl: 'ws://figma/tab-a' },
  { id: 'tab-b', title: 'Branch', url: 'https://www.figma.com/design/file-a/branch/branch-b/Branch', webSocketDebuggerUrl: 'ws://figma/tab-b' },
  { id: 'home', title: 'Home', url: 'https://www.figma.com/files/feed', webSocketDebuggerUrl: 'ws://figma/home' }
];

class FakeWebSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 1;
    queueMicrotask(() => this.emit('open'));
  }

  send(data) {
    const { id, method, params } = JSON.parse(data);
    const value = method === 'Runtime.enable' ? undefined
      : params.expression === 'typeof figma !== "undefined"' ? true
      : this.url.endsWith('tab-a') ? 'file-a' : 'branch-b';
    queueMicrotask(() => this.emit('message', Buffer.from(JSON.stringify({
      id,
      result: { result: { value } }
    }))));
  }

  close() { this.readyState = 3; }
}

test('CDP targets each design tab by exact tab ID, including a branch of the same file', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ json: async () => pages });
  const clients = [];
  try {
    const designs = await FigmaClient.listDesignPages();
    assert.deepEqual(designs.map(page => page.id), ['tab-a', 'tab-b']);

    const values = await Promise.all(designs.map(async page => {
      const client = new FigmaClient({ WebSocketImpl: FakeWebSocket });
      clients.push(client);
      await client.connect(null, { pageId: page.id, timeoutMs: 1000 });
      return client.eval('figma.fileKey');
    }));
    assert.deepEqual(values, ['file-a', 'branch-b']);
    assert.deepEqual(clients.map(client => client.ws.url), ['ws://figma/tab-a', 'ws://figma/tab-b']);

    const missing = new FigmaClient({ WebSocketImpl: FakeWebSocket });
    await assert.rejects(missing.connect(null, { pageId: 'closed-tab' }), /not open/);
  } finally {
    clients.forEach(client => client.close());
    globalThis.fetch = originalFetch;
  }
});
