const axios = require('axios');
const cheerio = require('cheerio');
const stringify = require('csv-stringify');
const { writeCsv, sortArray, dedupListOfObjects } = require("./util.js");

const REQUEST_HEADERS = { "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0" };

async function scrapeGames(year) {
  const url = `https://www.hockey-reference.com/leagues/NHL_${year}_games.html`;
  const response = await axios.get(url, {headers: REQUEST_HEADERS});
  const $ = cheerio.load(response.data);
  const output = [];
  const processRow = x => {
    let date = $(x).find('th[data-stat="date_game"] a').text().replace(/-/g,'');
    let gameUrl = $(x).find('th[data-stat="date_game"] a').attr('href');
    let homeTeam = $(x).find('td[data-stat="home_team_name"] a').attr('href');
    homeTeam = homeTeam.split("/")[2];
    let awayTeam = $(x).find('td[data-stat="visitor_team_name"] a').attr('href');
    awayTeam = awayTeam.split("/")[2];
    let homeScore = $(x).find('td[data-stat="home_goals"]').text();
    let awayScore = $(x).find('td[data-stat="visitor_goals"]').text();

    return {
      game_url: gameUrl,
      date: date,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore
    };
  };

  $('table#games tbody tr').each((i,x) => {
    output.push(processRow(x));
  });

  $('table#games_playoffs tbody tr').each((i,x) => {
    output.push(processRow(x));
  });

  return output;
}

async function main() {
  for (let year=2019; year<2020; year++) {
    if (year === 2005) continue; //lockout
    let games = await scrapeGames(year);
    writeCsv(games, `game_data/nhl/nhl_${year}.csv`);
  }
}

main();