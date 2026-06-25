// Wave L / L1 — shareable moment links.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './momentLink.js';
const { encodeMoment, decodeMoment, momentToUrl, momentFromLocation, embedSnippet } = globalThis.InfrixCinema;

const moment = { mode: 'cinema.proof', position: 7, camera: { x: -120, y: 44, zoom: 1.5 }, view: 'split', lens: 'auditor', query: 'kind:contract' };

test('encode → decode round-trips all view-state fields', () => {
  const back = decodeMoment(encodeMoment(moment));
  assert.equal(back.mode, 'cinema.proof');
  assert.equal(back.position, 7);
  assert.equal(back.camera.x, -120);
  assert.equal(back.camera.zoom, 1.5);
  assert.equal(back.view, 'split');
  assert.equal(back.lens, 'auditor');
  assert.equal(back.query, 'kind:contract');
});

test('the encoded string is URL-safe (no + / = or #)', () => {
  const s = encodeMoment(moment);
  assert.ok(!/[+/=#&]/.test(s), 'no unsafe chars: ' + s);
});

test('momentToUrl + momentFromLocation reconstruct the moment', () => {
  const url = momentToUrl('https://app.example/cinema', moment);
  assert.ok(url.includes('#cinema='));
  const back = momentFromLocation(url.slice(url.indexOf('#')));
  assert.equal(back.lens, 'auditor');
  assert.equal(back.position, 7);
});

test('the link carries NO scene data (only view state keys)', () => {
  const json = JSON.stringify(JSON.parse(Buffer.from(encodeMoment(moment).replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString('utf8')));
  assert.ok(!/nodes|edges|label|balance/.test(json), 'no scene payload in the link');
});

test('decode is tolerant of garbage / missing input', () => {
  assert.equal(decodeMoment('not-base64!!'), null);
  assert.equal(decodeMoment(''), null);
  assert.equal(momentFromLocation('#nothing-here'), null);
  const partial = decodeMoment(encodeMoment({ mode: 'cinema.full' }));
  assert.equal(partial.position, 0);
  assert.equal(partial.camera.zoom, 1);
});

test('embedSnippet targets embed mode at the same moment', () => {
  const snip = embedSnippet('https://app.example/cinema', moment);
  assert.match(snip, /<iframe/);
  assert.match(snip, /#cinema=/);
  const back = momentFromLocation(snip.slice(snip.indexOf('#cinema'), snip.indexOf('"', snip.indexOf('#cinema'))));
  assert.equal(back.mode, 'cinema.embed');
});
