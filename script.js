const COUNTRY_DATA = `Afghanistan|Kabul|af|Asia
Albania|Tirana|al|Europe
Algeria|Algiers|dz|Africa
Argentina|Buenos Aires|ar|South America
Armenia|Yerevan|am|Asia
Australia|Canberra|au|Oceania
Austria|Vienna|at|Europe
Azerbaijan|Baku|az|Asia
Bahamas|Nassau|bs|North America
Bahrain|Manama|bh|Asia
Bangladesh|Dhaka|bd|Asia
Belgium|Brussels|be|Europe
Belize|Belmopan|bz|North America
Bhutan|Thimphu|bt|Asia
Bosnia and Herzegovina|Sarajevo|ba|Europe
Botswana|Gaborone|bw|Africa
Brazil|Brasília|br|South America|Brasilia
Brunei|Bandar Seri Begawan|bn|Asia
Bulgaria|Sofia|bg|Europe
Cambodia|Phnom Penh|kh|Asia
Cameroon|Yaoundé|cm|Africa|Yaounde
Canada|Ottawa|ca|North America
Chile|Santiago|cl|South America
China|Beijing|cn|Asia
Colombia|Bogotá|co|South America|Bogota
Costa Rica|San José|cr|North America|San Jose
Croatia|Zagreb|hr|Europe
Cuba|Havana|cu|North America
Cyprus|Nicosia|cy|Europe
Czechia|Prague|cz|Europe
Denmark|Copenhagen|dk|Europe
Dominican Republic|Santo Domingo|do|North America
Ecuador|Quito|ec|South America
Egypt|Cairo|eg|Africa
El Salvador|San Salvador|sv|North America
Estonia|Tallinn|ee|Europe
Ethiopia|Addis Ababa|et|Africa
Fiji|Suva|fj|Oceania
Finland|Helsinki|fi|Europe
France|Paris|fr|Europe
Georgia|Tbilisi|ge|Asia
Germany|Berlin|de|Europe
Ghana|Accra|gh|Africa
Greece|Athens|gr|Europe
Guatemala|Guatemala City|gt|North America
Honduras|Tegucigalpa|hn|North America
Hungary|Budapest|hu|Europe
Iceland|Reykjavík|is|Europe|Reykjavik
India|New Delhi|in|Asia
Iran|Tehran|ir|Asia
Iraq|Baghdad|iq|Asia
Ireland|Dublin|ie|Europe
Italy|Rome|it|Europe
Jamaica|Kingston|jm|North America
Japan|Tokyo|jp|Asia
Jordan|Amman|jo|Asia
Kazakhstan|Astana|kz|Asia
Kenya|Nairobi|ke|Africa
Kuwait|Kuwait City|kw|Asia
Laos|Vientiane|la|Asia
Latvia|Riga|lv|Europe
Lebanon|Beirut|lb|Asia
Lithuania|Vilnius|lt|Europe
Luxembourg|Luxembourg|lu|Europe|Luxembourg City
Madagascar|Antananarivo|mg|Africa
Malaysia|Kuala Lumpur|my|Asia
Maldives|Malé|mv|Asia|Male
Malta|Valletta|mt|Europe
Mexico|Mexico City|mx|North America
Mongolia|Ulaanbaatar|mn|Asia|Ulan Bator,Ulanbaatar
Morocco|Rabat|ma|Africa
Mozambique|Maputo|mz|Africa
Nepal|Kathmandu|np|Asia
Netherlands|Amsterdam|nl|Europe
New Zealand|Wellington|nz|Oceania
Nicaragua|Managua|ni|North America
Nigeria|Abuja|ng|Africa
North Macedonia|Skopje|mk|Europe
Norway|Oslo|no|Europe
Oman|Muscat|om|Asia
Pakistan|Islamabad|pk|Asia
Panama|Panama City|pa|North America
Paraguay|Asunción|py|South America|Asuncion
Peru|Lima|pe|South America
Philippines|Manila|ph|Asia
Poland|Warsaw|pl|Europe
Portugal|Lisbon|pt|Europe
Qatar|Doha|qa|Asia
Romania|Bucharest|ro|Europe
Saudi Arabia|Riyadh|sa|Asia
Senegal|Dakar|sn|Africa
Serbia|Belgrade|rs|Europe
Singapore|Singapore|sg|Asia
Slovakia|Bratislava|sk|Europe
Slovenia|Ljubljana|si|Europe
South Korea|Seoul|kr|Asia
Spain|Madrid|es|Europe
Sweden|Stockholm|se|Europe
Switzerland|Bern|ch|Europe|Berne
Thailand|Bangkok|th|Asia
Tunisia|Tunis|tn|Africa
Turkey|Ankara|tr|Asia
Uganda|Kampala|ug|Africa
Ukraine|Kyiv|ua|Europe|Kiev
United Arab Emirates|Abu Dhabi|ae|Asia
United Kingdom|London|gb|Europe
United States|Washington, D.C.|us|North America|Washington,Washington DC,Washington D C
Uruguay|Montevideo|uy|South America
Uzbekistan|Tashkent|uz|Asia
Venezuela|Caracas|ve|South America
Vietnam|Hanoi|vn|Asia
Zambia|Lusaka|zm|Africa
Zimbabwe|Harare|zw|Africa`;

const countries = COUNTRY_DATA.split('\n').map(line => {
  const [name, capital, code, region, aliases = ''] = line.split('|');
  return {name, capital, code, region, answers: [capital, ...aliases.split(',').filter(Boolean)]};
});
const $ = id => document.getElementById(id);
const TOTAL = 10;
const TIME_LIMIT = 120;
let pool = [];
let mission = 0;
let questions = [];
let index = 0;
let correct = 0;
let secondsLeft = TIME_LIMIT;
let timer = null;
let nextTimeout = null;
let locked = false;
let hintShown = false;
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
function nextQuestions() {
  const selected = [];
  while (selected.length < TOTAL) {
    if (!pool.length) pool = shuffle(countries);
    const candidate = pool.pop();
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected;
}
function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function flagEmoji(code) {
  return [...code.toUpperCase()].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
}
function tone(frequency, duration = .08) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (_) { /* Sound is optional. */ }
}
function showScreen(screen) {
  for (const id of ['intro', 'game', 'results']) $(id).classList.toggle('hidden', id !== screen);
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function updateScorebar() {
  $('correct-value').textContent = String(correct).padStart(2, '0');
  $('time-value').textContent = formatTime(secondsLeft);
  $('score-value').textContent = String(correct ? correct * 100 + secondsLeft * 2 : 0).padStart(3, '0');
  $('time-value').style.color = secondsLeft <= 20 ? 'var(--red)' : '';
}
function startMission() {
  clearInterval(timer);
  clearTimeout(nextTimeout);
  mission++;
  questions = nextQuestions();
  index = 0;
  correct = 0;
  secondsLeft = TIME_LIMIT;
  $('mission-number').textContent = String(mission).padStart(3, '0');
  showScreen('game');
  showQuestion();
  updateScorebar();
  timer = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateScorebar();
    if (!secondsLeft) endMission(true);
  }, 1000);
}
function showQuestion() {
  const country = questions[index];
  locked = false;
  hintShown = false;
  $('question-count').textContent = `${String(index + 1).padStart(2, '0')} / ${TOTAL}`;
  $('progress-fill').style.width = `${index / TOTAL * 100}%`;
  $('country-name').textContent = country.name;
  $('country-name-question').textContent = country.name;
  $('region-name').textContent = country.region.toUpperCase();
  $('answer-input').value = '';
  $('answer-input').disabled = false;
  $('submit-button').disabled = false;
  $('hint-button').disabled = false;
  $('skip-button').disabled = false;
  $('feedback').className = 'feedback hidden';
  $('feedback').replaceChildren();
  const flag = $('country-flag');
  const fallback = $('flag-fallback');
  flag.style.display = 'none';
  fallback.style.display = 'none';
  fallback.textContent = flagEmoji(country.code);
  flag.onload = () => { flag.style.display = 'block'; fallback.style.display = 'none'; };
  flag.onerror = () => { flag.style.display = 'none'; fallback.style.display = 'block'; };
  flag.alt = `Flag of ${country.name}`;
  flag.src = `https://flagcdn.com/w320/${country.code}.png`;
  $('answer-input').focus({preventScroll:true});
}
function feedback(title, detail, isWrong) {
  const box = $('feedback');
  box.className = `feedback${isWrong ? ' wrong' : ''}`;
  const heading = document.createElement('strong');
  heading.textContent = title;
  box.replaceChildren(heading, document.createTextNode(detail));
}
function resolveQuestion(answer, skipped = false) {
  if (locked) return;
  locked = true;
  const country = questions[index];
  const isCorrect = !skipped && country.answers.some(candidate => normalize(candidate) === normalize(answer));
  if (isCorrect) {
    correct++;
    tone(780);
    setTimeout(() => tone(1040), 90);
    feedback('Correct scan!', `${country.capital} is the capital of ${country.name}.`, false);
  } else {
    tone(240, .16);
    feedback(skipped ? 'Country skipped.' : 'Not quite.', `The capital of ${country.name} is ${country.capital}.`, true);
  }
  $('answer-input').disabled = true;
  $('submit-button').disabled = true;
  $('hint-button').disabled = true;
  $('skip-button').disabled = true;
  $('progress-fill').style.width = `${(index + 1) / TOTAL * 100}%`;
  updateScorebar();
  nextTimeout = setTimeout(() => {
    index++;
    if (index === TOTAL) endMission(false);
    else showQuestion();
  }, 1550);
}
function endMission(timedOut) {
  clearInterval(timer);
  clearTimeout(nextTimeout);
  timer = null;
  locked = true;
  const bonus = correct ? secondsLeft * 2 : 0;
  const score = correct * 100 + bonus;
  $('results-title').textContent = timedOut ? 'Time is up.' : 'Mission complete.';
  $('results-message').textContent = correct === TOTAL ? 'Perfect scan. You know your way around the world.' : correct >= 7 ? 'Strong navigation. Ready to explore somewhere new?' : correct >= 4 ? 'Good journey. Another scan will take you further.' : 'Every explorer starts somewhere. Take another trip around the globe.';
  $('final-score').textContent = String(score).padStart(3, '0');
  $('final-correct').textContent = `${correct} / ${TOTAL}`;
  $('final-time').textContent = `+${bonus}`;
  showScreen('results');
  tone(600, .12);
}

$('country-count').textContent = `${countries.length}`;
$('start-button').addEventListener('click', startMission);
$('again-button').addEventListener('click', startMission);
$('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  const answer = $('answer-input').value.trim();
  if (answer) resolveQuestion(answer);
});
$('skip-button').addEventListener('click', () => resolveQuestion('', true));
$('hint-button').addEventListener('click', () => {
  if (locked || hintShown) return;
  hintShown = true;
  const capital = questions[index].capital;
  feedback('Scanner hint', `It starts with “${capital[0].toUpperCase()}” and has ${capital.replace(/[^A-Za-z]/g, '').length} letters.`, false);
  $('hint-button').disabled = true;
});
$('sound-toggle').addEventListener('click', () => {
  soundOn = !soundOn;
  $('sound-toggle').textContent = soundOn ? '♪' : '♩';
  $('sound-toggle').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  if (soundOn) tone(660);
});
