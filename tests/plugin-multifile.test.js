import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import WebSocket from 'ws';

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  server.close();
  await once(server, 'close');
  return port;
}

test('Safe Mode keeps two plugin files isolated across selection, broadcast and disconnect', { timeout: 15000 }, async t => {
  let port;
  try { port = await freePort(); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('Localhost sockets are blocked in this environment'); return; }
    throw error;
  }
  const dir = mkdtempSync(join(tmpdir(), 'figma-cli-test-'));
  const tokenPath = join(dir, 'token');
  writeFileSync(tokenPath, 'test-secret');
  const child = spawn(process.execPath, ['src/daemon.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'ignore',
    env: { ...process.env, DAEMON_PORT: String(port), DAEMON_MODE: 'plugin', FIGMA_CLI_DAEMON_TOKEN_FILE: tokenPath }
  });
  const sockets = [];
  const execute = async (action, fields = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/exec`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Daemon-Token': 'test-secret' },
      body: JSON.stringify({ action, ...fields })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    return body.result;
  };
  try {
    for (let i = 0; i < 50; i++) {
      try { await execute('files'); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 50)); }
    }
    const connect = async (id, title) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/plugin`);
      sockets.push(ws);
      await once(ws, 'open');
      ws.on('message', bytes => {
        const msg = JSON.parse(bytes.toString());
        if (msg.action === 'eval') ws.send(JSON.stringify({ type: 'result', id: msg.id, result: `${id}:${msg.code}` }));
      });
      ws.send(JSON.stringify({ type: 'hello', id, title, fileKey: id, version: 'test' }));
    };
    await connect('plugin:a', 'File A');
    await connect('plugin:b', 'File B');
    for (let i = 0; i < 20 && (await execute('files')).length < 2; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.deepEqual((await execute('files')).map(file => file.id), ['plugin:a', 'plugin:b']);
    await execute('use-file', { tabId: 'plugin:b' });
    assert.equal(await execute('eval', { code: '42' }), 'plugin:b:42');
    const all = await execute('eval-all', { code: 'x' });
    assert.deepEqual(all.map(file => file.result), ['plugin:a:x', 'plugin:b:x']);
    sockets[0].send(JSON.stringify({ type: 'event', eventType: 'selection', data: { nodes: [{ id: '1:2' }] } }));
    sockets[1].send(JSON.stringify({ type: 'event', eventType: 'selection', data: { nodes: [{ id: '3:4' }] } }));
    for (let i = 0; i < 20 && (await execute('events')).some(file => file.events.length === 0); i++) await new Promise(resolve => setTimeout(resolve, 25));
    const events = await execute('events');
    assert.equal(events[0].events[0].data.nodes[0].id, '1:2');
    assert.equal(events[1].events[0].data.nodes[0].id, '3:4');
    sockets[0].close();
    await once(sockets[0], 'close');
    assert.equal(await execute('eval', { code: 'after' }), 'plugin:b:after');
    assert.deepEqual((await execute('files')).map(file => file.id), ['plugin:b']);
  } finally {
    for (const socket of sockets) socket.close();
    child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
