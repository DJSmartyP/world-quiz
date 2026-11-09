const countries = COUNTRY_DATA.split('\n').map(line => {
  const [name, capital, code, region, aliases = ''] = line.split('|');
  return {name, capital, code, region, answers: [capital, ...aliases.split(',').filter(Boolean)]};
});
const byCode = new Map(countries.map(country => [country.code, country]));
const EASY_CODES = `ar au at be br ca cl cn co hr cu cz dk eg fi fr de gh gr hu is in ir ie it jm jp ke kz mx mn ma np nl nz ng no pk pe ph pl pt ro sa es se ch th tr ua gb us uy vn zm zw`.split(' ');
const MAP_CODES = EASY_CODES.filter(code => !['fr', 'is', 'jm', 'no'].includes(code));
const modes = {
  flag: {title: 'Match the Flag', label: 'FLAG SCAN', question: 'Which country has this flag?', caption: 'Look at the colours and shapes on this flag.', codes: EASY_CODES, answer: country => country.name},
  map: {title: 'Match the Map', label: 'SHAPE SCAN', question: 'Which country has this shape?', caption: 'Look at the outline of this land mass.', codes: MAP_CODES, answer: country => country.name},
  country: {title: 'Country Match', label: 'CAPITAL SCAN', question: 'What is this country’s capital?', caption: 'Find the capital city that belongs to this country.', codes: EASY_CODES, answer: country => country.capital},
  capital: {title: 'Capital Match', label: 'COUNTRY SCAN', question: 'Which country has this capital?', caption: 'Find the country that belongs to this capital city.', codes: EASY_CODES, answer: country => country.name}
};
const $ = id => document.getElementById(id);
const TOTAL = 10;
const pools = {flag: [], map: [], country: [], capital: []};
let mode = 'flag';
let mission = 0;
let questions = [];
let index = 0;
let correct = 0;
let elapsed = 0;
let timer = null;
let locked = false;
let soundOn = true;
let audioContext;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function selectQuestions(selectedMode) {
  const chosen = [];
  while (chosen.length < TOTAL) {
    if (!pools[selectedMode].length) pools[selectedMode] = shuffle(modes[selectedMode].codes.map(code => byCode.get(code)).filter(Boolean));
    const candidate = pools[selectedMode].pop();
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }
  return chosen;
}
function flagEmoji(code) {
  return [...code.toUpperCase()].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
}
function tone(frequency, duration = .09) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (_) { /* Sound is optional. */ }
}
function showScreen(screen) {
  for (const id of ['intro', 'game', 'results']) $(id).classList.toggle('hidden', id !== screen);
  $('modes').classList.toggle('hidden', screen !== 'intro');
  if (screen !== 'intro') window.scrollTo({top: 0, behavior: 'smooth'});
}
function showModes() {
  clearInterval(timer);
  timer = null;
  showScreen('intro');
  $('modes').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function timeBonus() {
  return correct ? Math.max(0, 300 - elapsed) : 0;
}
function updateScorebar() {
  $('correct-value').textContent = String(correct).padStart(2, '0');
  $('time-value').textContent = formatTime(elapsed);
  $('score-value').textContent = String(correct * 100 + timeBonus()).padStart(3, '0');
}
function startMission(selectedMode) {
  clearInterval(timer);
  mode = selectedMode;
  mission++;
  questions = selectQuestions(mode);
  index = 0;
  correct = 0;
  elapsed = 0;
  $('game-title').textContent = modes[mode].title;
  $('mission-number').textContent = String(mission).padStart(3, '0');
  $('scan-label').textContent = modes[mode].label;
  showScreen('game');
  showQuestion();
  updateScorebar();
  timer = setInterval(() => { elapsed++; updateScorebar(); }, 1000);
}
function makeChoices(country) {
  const answer = modes[mode].answer(country);
  const others = shuffle(modes[mode].codes.map(code => byCode.get(code)).filter(Boolean))
    .map(candidate => modes[mode].answer(candidate))
    .filter(candidate => candidate !== answer);
  const choices = [answer];
  for (const candidate of others) {
    if (!choices.includes(candidate)) choices.push(candidate);
    if (choices.length === 3) break;
  }
  return shuffle(choices);
}
function showQuestion() {
  const country = questions[index];
  locked = false;
  $('question-count').textContent = `${String(index + 1).padStart(2, '0')} / ${TOTAL}`;
  $('question-index').textContent = String(index + 1).padStart(2, '0');
  $('progress-fill').style.width = `${index / TOTAL * 100}%`;
  $('question-text').textContent = modes[mode].question;
  $('clue-caption').textContent = modes[mode].caption;
  $('feedback').className = 'feedback hidden';
  $('feedback').replaceChildren();
  $('next-button').classList.add('hidden');
  $('skip-button').classList.remove('hidden');
  for (const id of ['clue-flag', 'clue-map', 'clue-word', 'flag-fallback']) $(id).classList.add('hidden');
  if (mode === 'flag') {
    const flag = $('clue-flag');
    const fallback = $('flag-fallback');
    fallback.textContent = flagEmoji(country.code);
    flag.onload = () => { flag.classList.remove('hidden'); fallback.classList.add('hidden'); };
    flag.onerror = () => { flag.classList.add('hidden'); fallback.classList.remove('hidden'); };
    flag.alt = 'Mystery country flag';
    flag.src = `https://flagcdn.com/w320/${country.code}.png`;
  } else if (mode === 'map') {
    const map = $('clue-map');
    map.src = `assets/maps/${country.code}.svg`;
    map.alt = 'Mystery country silhouette';
    map.classList.remove('hidden');
  } else {
    const word = $('clue-word');
    word.textContent = mode === 'country' ? country.name : country.capital;
    word.classList.remove('hidden');
  }
  const choices = $('choices');
  choices.replaceChildren();
  for (const label of makeChoices(country)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-button';
    button.textContent = label;
    button.addEventListener('click', () => selectAnswer(label));
    choices.append(button);
  }
}
function selectAnswer(selection, skipped = false) {
  if (locked) return;
  locked = true;
  const answer = modes[mode].answer(questions[index]);
  const isCorrect = !skipped && selection === answer;
  if (isCorrect) { correct++; tone(800); }
  else tone(260, .14);
  for (const button of $('choices').children) {
    button.disabled = true;
    if (button.textContent === answer) button.classList.add('choice-correct');
    else if (button.textContent === selection) button.classList.add('choice-wrong');
  }
  const box = $('feedback');
  box.className = `feedback${isCorrect ? '' : ' wrong'}`;
  const strong = document.createElement('strong');
  strong.textContent = isCorrect ? 'Great job!' : skipped ? 'Here’s the answer.' : 'Good try!';
  box.replaceChildren(strong, document.createTextNode(` ${answer} is the right answer.`));
  $('skip-button').classList.add('hidden');
  $('next-button').textContent = index === TOTAL - 1 ? 'SEE RESULTS ↗' : 'NEXT QUESTION ↗';
  $('next-button').classList.remove('hidden');
  $('progress-fill').style.width = `${(index + 1) / TOTAL * 100}%`;
  updateScorebar();
  $('next-button').focus({preventScroll: true});
}
function nextQuestion() {
  if (!locked) return;
  index++;
  if (index === TOTAL) endMission();
  else showQuestion();
}
function endMission() {
  clearInterval(timer);
  timer = null;
  $('results-title').textContent = `${modes[mode].title} complete!`;
  $('results-message').textContent = correct === TOTAL ? 'Perfect scan! You got every answer right.' : correct >= 7 ? 'Fantastic exploring! You know a lot about the world.' : correct >= 4 ? 'Nice work! Want to see what else you know?' : 'Great exploring! Every round helps you discover more.';
  $('final-score').textContent = String(correct * 100 + timeBonus()).padStart(3, '0');
  $('final-correct').textContent = `${correct} / ${TOTAL}`;
  $('final-time').textContent = formatTime(elapsed);
  showScreen('results');
  tone(620, .12);
}

for (const card of document.querySelectorAll('[data-mode]')) card.addEventListener('click', () => startMission(card.dataset.mode));
$('next-button').addEventListener('click', nextQuestion);
$('skip-button').addEventListener('click', () => selectAnswer('', true));
$('again-button').addEventListener('click', () => startMission(mode));
$('back-button').addEventListener('click', showModes);
$('modes-button').addEventListener('click', showModes);
$('sound-toggle').addEventListener('click', () => {
  soundOn = !soundOn;
  $('sound-toggle').textContent = soundOn ? '♪' : '♩';
  $('sound-toggle').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  if (soundOn) tone(660);
});
