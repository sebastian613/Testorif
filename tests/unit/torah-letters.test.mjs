import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../../data/torah-letters.json', import.meta.url)));
const torah = readFileSync(new URL('../../data/torah-string.txt', import.meta.url), 'utf8').trim();

test('Torah string is the 304,850-letter Leningrad Codex Ketiv text', () => {
  assert.equal([...torah].length, 304850);
  assert.match(torah, /^[א-ת]+$/);
  assert.ok(torah.startsWith('בראשיתבראאלהים'));
  assert.ok(torah.endsWith('לעיניכלישראל'));
});

test('letter counts cover all 27 forms and agree with the string', () => {
  assert.equal(data.letterOrder.length, 27);
  let sum = 0;
  for (const ch of data.letterOrder) {
    const n = torah.split(ch).length - 1;
    assert.equal(data.total.counts[ch], n, ch);
    sum += n;
  }
  assert.equal(sum, data.total.letters);
  assert.equal(data.books.reduce((s, b) => s + b.letters, 0), data.total.letters);
});
