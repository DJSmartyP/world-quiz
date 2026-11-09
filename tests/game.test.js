const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = fs.readFileSync(path.join(root, 'countries.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
function makeElement(id = '') {
  const classes = new Set();
  return {
    id, textContent: '', value: '', style: {}, disabled: false, children: [], listeners: {}, dataset: {},
    get className() { return [...classes].join(' '); },
    set className(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(item => classes.add(item)); },
    classList: {add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, toggle(value, force) { if (force) classes.add(value); else classes.delete(value); }, contains(value) { return classes.has(value); }},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute() {}, focus() {}, scrollIntoView() {},
    replaceChildren(...items) { this.children = items; },
    append(...items) { this.children.push(...items); }
  };
}
const elements = new Map(ids.map(id => [id, makeElement(id)]));
const cards = ['flag', 'map', 'country', 'capital'].map(mode => {
  const card = makeElement();
  card.dataset.mode = mode;
  return card;
});
const document = {
  getElementById(key) { assert(elements.has(key), `Missing #${key}`); return elements.get(key); },
  querySelectorAll(selector) { assert.equal(selector, '[data-mode]'); return cards; },
  createElement: () => makeElement(),
  createTextNode: text => ({textContent: text})
};
let tick;
const context = {
  document, window: {scrollTo() {}}, Math, console,
  setInterval(callback) { tick = callback; return 1; },
  clearInterval() { tick = undefined; }
};
vm.runInNewContext(data + '\n' + script + '\n;globalThis.testState = () => ({mode, questions, index, correct, elapsed, mapCodes: MAP_CODES});', context);
const el = key => elements.get(key);
const click = key => el(key).listeners.click();
const start = mode => cards.find(card => card.dataset.mode === mode).listeners.click();
const pickCorrect = () => {
  const state = context.testState();
  const target = state.questions[state.index];
  const answer = ['flag', 'map', 'capital'].includes(state.mode) ? target.name : target.capital;
  const choice = el('choices').children.find(button => button.textContent === answer);
  assert(choice, `Correct choice missing for ${target.name}`);
  choice.listeners.click();
};

assert.equal(cards.length, 4);
for (const code of context.testState().mapCodes) assert(fs.existsSync(path.join(root, 'assets/maps', `${code}.svg`)), `Missing map for ${code}`);
start('flag');
assert.equal(context.testState().questions.length, 10);
assert.equal(el('question-text').textContent, 'Which country has this flag?');
assert.equal(el('choices').children.length, 3);
assert.equal(el('clue-flag').alt, 'Mystery country flag');
for (let i = 0; i < 23; i++) tick();
pickCorrect();
assert.equal(el('score-value').textContent, '377');
assert.equal(el('feedback').children[0].textContent, 'Great job!');
click('next-button');
assert.equal(context.testState().index, 1);
click('skip-button');
assert.equal(context.testState().correct, 1);
click('next-button');
for (let i = 2; i < 10; i++) { pickCorrect(); click('next-button'); }
assert.equal(el('final-correct').textContent, '9 / 10');
assert.equal(el('final-score').textContent, '1177');
click('again-button');
assert.equal(context.testState().mode, 'flag');
assert.equal(context.testState().correct, 0);
assert.equal(el('time-value').textContent, '00:00');

click('back-button');
for (const [mode, question, clue] of [
  ['map', 'Which country has this shape?', 'clue-map'],
  ['country', 'What is this country’s capital?', 'clue-word'],
  ['capital', 'Which country has this capital?', 'clue-word']
]) {
  start(mode);
  assert.equal(el('question-text').textContent, question);
  assert.equal(el(clue).classList.contains('hidden'), false);
  assert.equal(el('choices').children.length, 3);
  if (mode === 'map') {
    const mapPath = path.join(root, el('clue-map').src);
    assert(fs.existsSync(mapPath), `Missing map: ${mapPath}`);
  }
  pickCorrect();
  assert.equal(context.testState().correct, 1);
  click('back-button');
}
console.log('All four modes, choices, scoring, results, skip and retry passed.');
