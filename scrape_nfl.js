const axios = require('axios');
const cheerio = require('cheerio');
const stringify = require('csv-stringify');
const { writeCsv, sortArray, dedupListOfObjects } = require("./util.js");

const REQUEST_HEADERS = { "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0" };


async function scrapeTeams(year) {
  const url = `https://www.pro-football-reference.com/years/${year}/`;
  const response = await axios.get(url, {headers: REQUEST_HEADERS});
  const $ = cheerio.load(response.data);
  const allTeamUrls = [];
  $('th[data-stat="team_name"] a').each((i,x) => {
    const seasonUrl = $(x).attr("href");
    allTeamUrls.push(seasonUrl);
  });
  return allTeamUrls;
}

async function scrapeGames(year) {
  const url = `https://www.pro-football-reference.com/years/${year}/games.htm`;
  console.log(url);

  const response = await axios.get(url, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(response.data);

  let output = [];
  $('tbody tr:not(.thead)').each((i,x) => {

    if ($(x).find('td[data-stat="game_date"]').text() === "Playoffs") {
      return;
    }

    const winnerUrl = $(x).find('td[data-stat="winner"] a').attr("href");
    const loserUrl = $(x).find('td[data-stat="loser"] a').attr("href");
    const winner = winnerUrl.split("/")[2].toUpperCase();
    const loser = loserUrl.split("/")[2].toUpperCase();

    const location = $(x).find('td[data-stat="game_location"]').text();
    const winnerScore = $(x).find('td[data-stat="pts_win"]').text();
    const loserScore = $(x).find('td[data-stat="pts_lose"]').text();

    const game_url = $(x).find('td[data-stat="boxscore_word"] a').attr("href");
    let date = game_url.split("/")[2].slice(0,8);
    const home_team  = location === "@" ? winner : loser;
    const away_team  = location === "@" ? loser  : winner;
    const home_score = location === "@" ? winnerScore : loserScore;
    const away_score = location === "@" ? loserScore : winnerScore;

    output.push({
      game_url,
      date,
      home_team,
      away_team,
      home_score,
      away_score
    });
  });

  return output;
}

async function main() {
  for (let year=2019; year<2020; year++) {
    let games = await scrapeGames(year);
    writeCsv(games, `game_data/nfl/nfl_${year}.csv`);
  }
}

main();