import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkerCode, listPagesCode } from '../src/design-extract.js';

test('walkerCode produces syntactically valid JS', () => {
  const code = walkerCode('123:45');
  // Throws SyntaxError if invalid. Wrap in a function shell because the
  // code is an async IIFE expression.
  assert.doesNotThrow(() => new Function(`return ${code}`));
});

test('walkerCode embeds page id and options', () => {
  const code = walkerCode('123:45', { maxDepth: 5, textLimit: 40 });
  assert.match(code, /"123:45"/);
  assert.match(code, /MAX_DEPTH = 5/);
  assert.match(code, /TEXT_LIMIT = 40/);
});

test('walkerCode defaults: depth 8, text 80', () => {
  const code = walkerCode('1:1');
  assert.match(code, /MAX_DEPTH = 8/);
  assert.match(code, /TEXT_LIMIT = 80/);
});

test('listPagesCode is valid JS', () => {
  assert.doesNotThrow(() => new Function(`return ${listPagesCode()}`));
});

test('walkerCode loads the page before reading children (dynamic-page mode)', () => {
  const code = walkerCode('1:1');
  assert.match(code, /loadAsync/);
  // loadAsync must appear BEFORE the first children access
  assert.ok(code.indexOf('loadAsync') < code.indexOf('count(page)'));
});

import { buildCensus, assignSemanticNames } from '../src/design-extract.js';

export const FIXTURE_PAGES = [
  {
    id: '1:1', name: 'Buttons', nodeCount: 10,
    frames: [
      { t: 'FRAME', n: 'Row', w: 400, h: 40, lm: 'HORIZONTAL', gap: 8, fills: ['#ffffff'], kids: [
        { t: 'COMPONENT', n: 'Primary', w: 71, h: 32, lm: 'HORIZONTAL', gap: 8, pad: [6, 12, 6, 12], fills: ['#1f883d'], r: 6, kids: [
          { t: 'TEXT', n: 'Button', w: 47, h: 20, txt: { chars: 'Button', font: 'Inter', style: 'Semi Bold', size: 14, lh: 20 }, fills: ['#ffffff'] },
        ] },
        { t: 'COMPONENT', n: 'Default', w: 71, h: 32, lm: 'HORIZONTAL', gap: 8, pad: [6, 12, 6, 12], fills: ['#f6f8fa'], strokes: ['#d0d7de'], sw: 1, r: 6, kids: [
          { t: 'TEXT', n: 'Button', w: 47, h: 20, txt: { chars: 'Button', font: 'Inter', style: 'Semi Bold', size: 14, lh: 20 }, fills: ['#1f2328'] },
        ] },
      ] },
    ],
  },
];

test('buildCensus counts colors from fills and strokes', () => {
  const census = buildCensus(FIXTURE_PAGES);
  assert.equal(census.colors.get('#ffffff'), 2);   // frame fill + text fill
  assert.equal(census.colors.get('#1f883d'), 1);
  assert.equal(census.colors.get('#d0d7de'), 1);   // stroke
});

test('buildCensus strips opacity suffix from paint strings', () => {
  const census = buildCensus([{ id: 'x', name: 'P', nodeCount: 1, frames: [
    { t: 'FRAME', n: 'F', w: 10, h: 10, fills: ['#000000@50'] },
  ] }]);
  assert.equal(census.colors.get('#000000'), 1);
});

test('assignSemanticNames classifies by lightness and chroma', () => {
  const colors = new Map([
    ['#ffffff', 50],  // near-white → background
    ['#1f2328', 40],  // dark, low sat → text-primary
    ['#0969da', 30],  // chromatic → accent
    ['#d0d7de', 20],  // light gray → border
    ['#59636e', 10],  // mid gray → text-*
  ]);
  const named = assignSemanticNames(colors);
  assert.equal(named['background'], '#ffffff');
  assert.equal(named['text-primary'], '#1f2328');
  assert.equal(named['accent'], '#0969da');
  assert.ok(Object.values(named).includes('#d0d7de'));
  assert.equal(Object.keys(named).length, 5);
});

test('assignSemanticNames suffixes duplicates with -alt, -3, -4', () => {
  const colors = new Map([
    ['#0969da', 30], ['#d1242f', 20], ['#8250df', 10],
  ]);
  const named = assignSemanticNames(colors);
  assert.equal(named['accent'], '#0969da');
  assert.equal(named['accent-alt'], '#d1242f');
  assert.equal(named['accent-3'], '#8250df');
});
