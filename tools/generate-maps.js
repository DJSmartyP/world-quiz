// Generate local, self-contained country silhouettes from Natural Earth 1:110m.
// Source: https://github.com/nvkelso/natural-earth-vector
// Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const geo = JSON.parse(fs.readFileSync(path.join(root, 'assets/natural-earth-countries.geojson'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'countries.js'), 'utf8');
const rows = source.match(/const COUNTRY_DATA = `([\s\S]*?)`;/)[1].split('\n');
const codes = rows.map(row => row.split('|')[2]);
const features = new Map();
for (const feature of geo.features) {
  for (const key of [feature.properties.ISO_A2, feature.properties.WB_A2]) {
    if (key && key !== '-99') features.set(key.toLowerCase(), feature);
  }
  if (feature.properties.ADMIN === 'Norway') features.set('no', feature);
}
const out = path.join(root, 'assets/maps');
fs.mkdirSync(out, {recursive: true});
const missing = [];
for (const code of codes) {
  const feature = features.get(code);
  if (!feature) { missing.push(code); continue; }
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const points = polygons.flat(2);
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if (maxX - minX > 180) { missing.push(`${code} (crosses date line)`); continue; }
  const scale = Math.min(280 / (maxX - minX || 1), 160 / (maxY - minY || 1));
  const offsetX = 160 - ((maxX + minX) / 2) * scale;
  const offsetY = 100 + ((maxY + minY) / 2) * scale;
  const xy = ([x, y]) => `${(x * scale + offsetX).toFixed(1)},${(-y * scale + offsetY).toFixed(1)}`;
  const paths = polygons.map(rings => rings.map(ring => `M${ring.map(xy).join('L')}Z`).join('')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img"><path d="${paths}" fill="#b5f26c" fill-rule="evenodd" stroke="#d7ffab" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  fs.writeFileSync(path.join(out, `${code}.svg`), svg);
}
console.log(`Generated ${codes.length - missing.length} maps. Missing: ${missing.join(', ') || 'none'}`);
