const axios = require('axios');
const cheerio = require('cheerio');
const stringify = require('csv-stringify');
const { writeCsv, sortArray, dedupListOfObjects } = require("./util.js");

let games = {};

const REQUEST_HEADERS = { "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0" }

async function scrapeTeams(year) {
  const url = `https://www.basketball-reference.com/leagues/NBA_${year+1}.html`;
  const response = await axios.get(url, {headers: REQUEST_HEADERS});
  const $ = cheerio.load(response.data);
  const allTeamUrls = [];
  $('th[data-stat="team_name"] a').each((i,x) => {
    const seasonUrl = $(x).attr("href");
    allTeamUrls.push(seasonUrl);
  });
  return allTeamUrls;
}

async function scrapeGames(url) {
  url = `https://www.basketball-reference.com/${url}`.replace(".html","_games.html"); //2020.html -> 2020_games.html
  console.log(url);
  const response = await axios.get(url, { headers: REQUEST_HEADERS });
  const $ = cheerio.load(response.data);

  let output = [];
  $(`tr`).each((i,x) => {
    if (!$(x).find('td[data-stat="box_score_text"] a').attr("href")) {
      return;
    }
    const gameUrl = $(x).find('td[data-stat="box_score_text"] a').attr("href");
    const home = $(x).find('td[data-stat="game_location"]').text() === "";

    const date = gameUrl.match(/\d{8}/)[0];

    //const team1 = $(x).find('td[data-stat="team_ID"]').text();
    //TODO: read team1 from url
    const team1 = url.match(/[A-Z]{3}/)[0];
    const team2 = $(x).find('td[data-stat="opp_name"] a').attr("href").match(/[A-Z]{3}/)[0];
    const homeTeam = home ? team1 : team2;
    const awayTeam = home ? team2 : team1;

    const score1 = $(x).find('td[data-stat="pts"]').text();
    const score2 = $(x).find('td[data-stat="opp_pts"]').text();
    const homeScore = home ? score1 : score2;
    const awayScore = home ? score2 : score1;

    if (homeScore && awayScore) { //skip games that haven't been played yet
      output.push({
        game_url: gameUrl,
        date: date,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore
      });
    }
  });

  return output;
}

async function scrapeYear(year) {
  let allGames = [];
  const allTeamUrls = await scrapeTeams(year);
  for (let teamUrl of allTeamUrls) {
    const games = await scrapeGames(teamUrl);
    allGames = [].concat(allGames,games);
  }
  allGames = dedupListOfObjects(allGames);
  sortArray(allGames, x=>x["date"]);
  return allGames;
}

async function main() {
  for (let year=2019; year<2020; year++) {
    let games = await scrapeYear(year);
    writeCsv(games, `game_data/nba/nba_${year}.csv`);
  }
}

main();