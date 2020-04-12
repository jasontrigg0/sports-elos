const axios = require('axios');
const cheerio = require('cheerio');
const stringify = require('csv-stringify');
const { writeCsv, sortArray, dedupListOfObjects }  = require("./util.js");

let games = {};

const REQUEST_HEADERS = { "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0" };

async function scrapeGames(year) {
  const url = `https://www.baseball-reference.com/leagues/MLB/${year}-schedule.shtml`;
  const response = await axios.get(url, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(response.data);

  let output = [];
  $('div.section_wrapper p.game').each((i,x) => {
    const awayTeam = $(x).find('a').map((i,x) => $(x).attr('href'))[0].split("/")[2];
    const homeTeam = $(x).find('a').map((i,x) => $(x).attr('href'))[1].split("/")[2];
    const gameUrl  = $(x).find('a').map((i,x) => $(x).attr('href'))[2];
    const scores = $(x).text().match(/\(\d+\)/g);

    if (scores === null) {
      console.log($(x).text());
      return;
    }

    const date = gameUrl.split("/")[3].slice(3,11);
    const awayScore = scores[0].replace("(","").replace(")","");
    const homeScore = scores[1].replace("(","").replace(")","");

    output.push({
      game_url: gameUrl,
      date: date,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore
    });
  });

  return output;
}

async function main() {
  for (let year=2019; year<2020; year++) {
    console.log(`game_data/mlb/mlb_${year}.csv`);
    let games = await scrapeGames(year);
    writeCsv(games, `game_data/mlb/mlb_${year}.csv`);
  }
}

main();