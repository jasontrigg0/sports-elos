const test = require('./util.js');
const { readCsvFiles, writeCsv, sortArray } = require('./util.js');

function elo_ev(p1_elo, p2_elo) {
  return (1.0 / (1.0 + Math.pow(10, ((p2_elo - p1_elo) / 400.))));
}

function elo_update(p1_elo, p2_elo, p1_result) {
  kfactor = 50;
  p1_expected = elo_ev(p1_elo, p2_elo);
  p1_new = (p1_elo + kfactor * (p1_result - p1_expected));
  return p1_new
}

async function updateElo(eloDict) {

}

async function generateInfo(infileList = undefined, year_cutoff = undefined) {
  const starting_elo = 1500;

  let teamInfo = {};
  let elo_dict = {};

  const TOP_ELO_CNT = 25;
  //list of top viewed elos, at most one per (team, season)
  let topElos = []; //{team, season, date elo}

  //let eloRows = await readCsvFiles(infileList);

  for (let file of infileList) {
    //reset for new file:
    //all elos revert halfway to the mean (TODO: refine this process)
    for (let team in teamInfo) {
      teamInfo[team]["elo"] = (teamInfo[team]["elo"] + starting_elo) / 2;
    }

    for await (let row of readCsvFiles([file])) {
      let team1 = row["home_team"];
      let team2 = row["away_team"];

      teamInfo[team1] = teamInfo[team1] || {};
      teamInfo[team2] = teamInfo[team2] || {};

      let results = {};

      if (parseInt(row["home_score"]) > parseInt(row["away_score"])) {
        results[team1] = 1;
        results[team2] = 0;
      } else if (parseInt(row["home_score"]) < parseInt(row["away_score"])) {
        results[team1] = 0;
        results[team2] = 1;
      } else { //tie
        results[team1] = 0.5;
        results[team2] = 0.5;
      }

      let MMDD = row["date"].slice(4,8);
      let year = parseInt(row["date"].slice(0,4));
      let season = MMDD < year_cutoff ? year - 1 : year;

      teamInfo[team1]["last_result"] = {
        score: row["home_score"],
        oppScore: row["away_score"],
        result: results[team1],
        opp: team2,
        season: season
      };

      teamInfo[team2]["last_result"] = {
        score: row["away_score"],
        oppScore: row["home_score"],
        result: results[team2],
        opp: team1,
        season: season
      }

      let team1_elo = teamInfo[team1]["elo"] || starting_elo;
      let team2_elo = teamInfo[team2]["elo"] || starting_elo;

      teamInfo[team1]["elo"] = elo_update(team1_elo, team2_elo, results[team1]);
      teamInfo[team2]["elo"] = elo_update(team2_elo, team1_elo, results[team2]);

      if (topElos.length < TOP_ELO_CNT || teamInfo[team1]["elo"] > topElos[topElos.length - 1]["elo"] || teamInfo[team2]["elo"] > topElos[topElos.length - 1]["elo"]) {
        //check if this is the top instance of (team, season)

        for (let team of [team1, team2]) {
          if (!topElos.some(x => x["team"] === team && x["season"] === season && x["elo"] > teamInfo[team]["elo"])) {
            topElos = topElos.filter(x => !(x["team"] === team && x["season"] === season));
            topElos.push({
              team: team,
              season: season,
              date: row["date"],
              elo: teamInfo[team]["elo"]
            });
          }
        }
        sortArray(topElos, x => -1 * x["elo"]);
        topElos = topElos.slice(0,TOP_ELO_CNT, 0);
      }
    }
  }
  //remove inactive teams from currentInfo
  for (let team in teamInfo) {
    const maxSeason = Math.max(...Object.values(teamInfo).map(x => x["last_result"]["season"]));
    if (teamInfo[team]["last_result"]["season"] !== maxSeason) {
      delete teamInfo[team];
    }
  }

  return {
    currentInfo: teamInfo,
    alltimeElos: topElos
  }
}

async function main() {
  const eloFiles = [];
  for (let year=2000; year<2020; year++) {
    eloFiles.push(`game_data/nba/nba_${year}.csv`);
  }

  const teamInfo = await generateInfo(eloFiles, "0801");
  //console.log(teamElos);
}

//main();



exports.generateInfo = generateInfo;