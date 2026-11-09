# World Scanner

A friendly, browser-based geography game with four ways to play:

- **Match the Flag:** see a flag and pick its country.
- **Match the Map:** see a country silhouette and pick its country.
- **Country Match:** see a country and pick its capital.
- **Capital Match:** see a capital and pick its country.

Each mission has 10 questions and three choices per question. There is no time limit. Correct answers earn 100 points each, plus a time bonus of up to 300 points when at least one answer is right. Players can retry the same mode or choose a different one.

Open `index.html` in a browser to play. No install, build step, account, or API key is needed. Run `node tests/game.test.js` to check the game flow.

Flags load from [FlagCDN](https://flagcdn.com/), with emoji fallback. The local silhouette SVGs are generated from [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) public-domain country outlines. The source GeoJSON is kept in `assets/natural-earth-countries.geojson`; run `node tools/generate-maps.js` to regenerate the silhouettes.
