const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
const elements = new Map(ids.map(id => [id, {
  id,
  textContent: '',
  value: '',
  style: {},
  className: '',
  disabled: false,
  listeners: {},
  classList: {toggle() {}},
  addEventListener(name, callback) { this.listeners[name] = callback; },
  setAttribute() {},
  focus() {},
  replaceChildren(...children) { this.children = children; },
  append(...children) { this.children = [...(this.children || []), ...children]; }
}]));
const pending = new Map();
let id = 0;
let tick;
const document = {
  getElementById(key) { assert(elements.has(key), `Missing #${key}`); return elements.get(key); },
  createElement() { return {textContent: ''}; },
  createTextNode(text) { return {textContent: text}; }
};
const context = {
  document,
  window: {scrollTo() {}},
  setInterval(callback) { tick = callback; return 1; },
  clearInterval() { tick = undefined; },
  setTimeout(callback) { pending.set(++id, callback); return id; },
  clearTimeout(key) { pending.delete(key); },
  Math,
  console
};
vm.runInNewContext(script + '\n;globalThis.testState = () => ({questions, index, correct, secondsLeft});', context);
const el = key => elements.get(key);
const click = key => el(key).listeners.click();
const advance = () => { const [key, callback] = pending.entries().next().value; pending.delete(key); callback(); };

assert(Number(el('country-count').textContent) >= 100);
click('start-button');
assert.equal(context.testState().questions.length, 10);
assert.equal(el('time-value').textContent, '02:00');
const first = context.testState().questions[0];
el('answer-input').value = first.capital;
el('answer-form').listeners.submit({preventDefault() {}});
assert.equal(context.testState().correct, 1);
assert.equal(el('score-value').textContent, '340');
assert.match(el('feedback').children[0].textContent, /Correct/);
while (context.testState().index === 0) advance();
assert.equal(context.testState().index, 1);
click('hint-button');
assert.match(el('feedback').children[0].textContent, /hint/);
click('skip-button');
assert.equal(context.testState().correct, 1);
assert.equal(el('feedback').children.length, 2);
for (let i = 0; i < 119; i++) tick();
assert.equal(el('time-value').textContent, '00:01');
tick();
assert.equal(el('results-title').textContent, 'Time is up.');
assert.equal(el('final-score').textContent, '100');
assert.equal(el('final-correct').textContent, '1 / 10');
click('again-button');
assert.equal(context.testState().correct, 0);
assert.equal(context.testState().index, 0);
assert.equal(el('time-value').textContent, '02:00');
console.log('Game flow, scoring, timeout, hint, and retry passed.');
