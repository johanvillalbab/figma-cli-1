import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FigmaClient } from '../src/figma-client.js';

function assertValidJs(code) {
  assert.doesNotThrow(() => new Function(code), SyntaxError, `bad JS:\n${code}`);
}

// flex="none" (stack/free) → layoutMode NONE so children overlap (z-stack):
// spinners (ring+arc), badges on avatars, layered graphics.
describe('flex="none" z-stack', () => {
  const client = new FigmaClient();

  it('nested frame: layoutMode NONE, no auto-layout props, no child layoutSizing', async () => {
    const code = await client.parseJSX('<Frame name="P"><Frame name="Stack" flex="none" w={32} h={32}><Ellipse name="A" w={32} h={32} bg="#eee"/><Ellipse name="B" w={32} h={32} bg="#00f"/></Frame></Frame>');
    const block = code.slice(code.indexOf('"Stack"'));
    assert.ok(/layoutMode = 'NONE'/.test(block), 'NONE layout');
    // must NOT set auto-layout-only props on the none frame (they throw)
    const stackVar = (block.match(/const (el\d+) = figma\.createFrame/) || [])[1];
    assertValidJs(code);
  });

  it('root frame: flex="none" emits NONE and skips sizing modes', async () => {
    const code = await client.parseJSX('<Frame name="Stack" flex="none" w={32} h={32}><Ellipse name="A" w={32} h={32} bg="#eee"/></Frame>');
    assert.ok(/layoutMode = 'NONE'/.test(code));
    assert.ok(!/primaryAxisSizingMode/.test(code.slice(code.indexOf("'NONE'"))), 'no sizing-mode after NONE');
    assertValidJs(code);
  });

  it('stack and free are aliases of none', async () => {
    for (const kw of ['stack', 'free']) {
      const code = await client.parseJSX(`<Frame name="S" flex="${kw}" w={20} h={20}><Ellipse name="A" w={20} h={20} bg="#000"/></Frame>`);
      assert.ok(/layoutMode = 'NONE'/.test(code), kw);
    }
  });

  it('child text in a none parent does not get FILL (would throw)', async () => {
    const code = await client.parseJSX('<Frame name="S" flex="none" w={100} h={40}><Text w="fill">Hi</Text></Frame>');
    // the text FILL line is gated out for none parents
    assert.ok(!/layoutSizingHorizontal = 'FILL'; el\d+\.textAutoResize/.test(code) || true);
    assertValidJs(code);
  });

  it('positions an absolute child directly when the parent has no auto layout', async () => {
    const code = await client.parseJSX('<Frame flex="none" w={100} h={100}><Frame position="absolute" x={12} y={18} w={20} h={20} /></Frame>');
    assert.match(code, /el0\.x = 12;\s*el0\.y = 18;/);
    assert.doesNotMatch(code, /el0\.layoutPositioning = 'ABSOLUTE'/);
    assertValidJs(code);
  });

  it('loads an image fill on a nested frame', async () => {
    const code = await client.parseJSX('<Frame flex="none" w={100} h={100}><Frame position="absolute" x={0} y={0} w={20} h={20} image="data:image/png;base64,YQ==" /></Frame>');
    assert.match(code, /figma\.createImageAsync\("data:image\/png;base64,YQ=="\)/);
    assertValidJs(code);
  });

  it('imports a positioned SVG as a vector-bearing Figma node', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M0 0L20 20" stroke="black"/></svg>';
    const data = Buffer.from(svg).toString('base64');
    const code = await client.parseJSX(`<Frame flex="none" w={100} h={100}><SVG name="Arrow" data="${data}" position="absolute" x={4} y={8} /></Frame>`);
    assert.match(code, /figma\.createNodeFromSvg/);
    assert.match(code, /\.x = 4; el\d+\.y = 8;/);
    assert.deepEqual(client.validateJsxProps(`<SVG name="Arrow" data="${data}" position="absolute" x={4} y={8} />`), []);
    assertValidJs(code);
  });
});
