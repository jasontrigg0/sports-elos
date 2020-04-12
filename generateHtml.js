const { generateInfo } = require("./streamingElo.js");
const { sortArray } = require("./util.js");
const { teamInfo } = require("./teams.js");
moment = require('moment');
fs = require('fs');

function generateHtml(sportInfo) {
  const tabInfo = {
    NFL: {
      label: "NFL",
      icon: "sports_football"
    },
    NBA: {
      label: "NBA",
      icon: "sports_basketball",
      active: true
    },
    MLB: {
      label: "MLB",
      icon: "sports_baseball"
    },
    NHL: {
      label: "NHL",
      icon: "sports_hockey"
    }
  };

  const tabHtml = generateTabRow(tabInfo);

  let cardHtml = '';
  for (let sport in sportInfo) {
    cardHtml += `<div style="margin-top: 25px; flex-direction: row; justify-content: space-around" class="tab-panel ${tabInfo[sport]["active"] ? "active" : ""}">`;
    cardHtml += generateCurrentCards(sport, sportInfo[sport]["currentInfo"], tabInfo[sport]);
    cardHtml += generateAlltimeCards(sport, sportInfo[sport]["alltimeElos"], tabInfo[sport]);
    cardHtml += '</div>';
  }

  const HTML_HEADER = `
  <head>
    <!-- Required styles for MDC Web -->
    <link rel="stylesheet" href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css">
    <link rel="stylesheet" href="mdc-demo-card.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <style>
     .tab-panel {
       display: none;
     }
     .tab-panel.active {
       display: flex;
     }
    </style>
  </head>
  <body>
  `;

  const HTML_FOOTER = `
    <!-- Required MDC Web JavaScript library -->
    <script src="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js"></script>
    <script>
     //setup tabs
     window.onload = function() {
       for (const e of document.querySelectorAll(".mdc-tab-bar")) {
         let tab = new mdc.tabBar.MDCTabBar(e)
         tab.preventDefaultOnClick = true

         tab.listen("MDCTabBar:activated", function({detail: {index: index}}) {
           // Hide all panels.
           for (const t of document.querySelectorAll(".tab-panel")) {
             t.classList.remove("active")
           }

           // Show the current one.
           let tab = document.querySelector(".tab-panel:nth-child(" + (index + 2) + ")")
           tab.classList.add("active")
         })
       }
     };
    </script>
  </body>
</html>
  `;

  return HTML_HEADER + tabHtml + cardHtml + HTML_FOOTER;
}

function generateTabRow(tabInfo) {
  const START = `
      <div class="mdc-tab-bar" role="tablist">
        <div class="mdc-tab-scroller">
          <div class="mdc-tab-scroller__scroll-area">
            <div class="mdc-tab-scroller__scroll-content">
  `;

  let allTabs = [];
  for (let tab in tabInfo) {
    allTabs.push(`
                <button class="mdc-tab${tabInfo[tab]["active"] ? " mdc-tab--active" : ""}" role="tab" aria-selected="true" tabindex="0">
                  <span class="mdc-tab__content">
                    <span class="mdc-tab__icon material-icons" aria-hidden="true">${tabInfo[tab]["icon"]}</span>
                    <span class="mdc-tab__text-label">${tabInfo[tab]["label"]}</span>
                  </span>
                  <span class="mdc-tab-indicator${tabInfo[tab]["active"] ? " mdc-tab-indicator--active" : ""}">
                    <span class="mdc-tab-indicator__content mdc-tab-indicator__content--underline"></span>
                  </span>
                  <span class="mdc-tab__ripple"></span>
                </button>
    `);
  }

  const END = `
            </div>
          </div>
        </div>
      </div>
  `;

  return START + allTabs.join("\n") + END;
}

function generateCard(image, header1, header2, header3) {
    return `
    <div class="mdc-card" style="margin-bottom: 20px; max-width: 500px;">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <div style="display: flex; margin-left: 15px; height: 80px; width: 80px; justify-content: center; align-items: center">
          <img style="max-height: 80px" src="${image}"></img>
        </div>
        <div>
          <div class="demo-card__primary">
            <h2 style="text-align: right" class="demo-card__title mdc-typography mdc-typography--headline6">${header1}</h2>
            <h2 style="text-align: right" class="demo-card__title mdc-typography mdc-typography--headline6">${header2}</h2>
          </div>
          <div style="text-align: right" class="demo-card__secondary mdc-typography mdc-typography--body2">${header3}</div>
        </div>
      </div>
    </div>`;
}

function generateCurrentCards(sport, currentInfo, tabInfo) {
  let eloList = [];
  for (let team in currentInfo) {
    eloList.push([team, currentInfo[team]["elo"]]);
  }
  sortArray(eloList, key= x=> -1 * x[1]);

  let allCards = [];
  let cnt = 1;
  for (let [team, elo] of eloList) {
    if (!teamInfo[sport][team]) {
      console.log(sport, team);
      console.log(eloList);
    }
    let lastResult = currentInfo[team]["last_result"];
    let wlt = lastResult["result"] === 1 ? "W" : lastResult["result"] === 0 ? "L" : "T";

    let card = generateCard(
      teamInfo[sport][team]["logo"],
      `#${cnt} ${teamInfo[sport][team]["name"]}`,
      Math.round(elo),
      `Last: ${lastResult["score"]} - ${lastResult["oppScore"]} (${wlt}) vs ${lastResult["opp"]}`
    );
    allCards.push(card);
    cnt += 1;
  }
  //MUST: set active for the correct panel below
  let html = "";
  let header = '<div style="text-align: center">Current</div>';

  return `  <div style="max-width: 500px">` + header + allCards.join("\n") + "\n" + `  </div>`;
}

function generateAlltimeCards(sport, alltimeElos, tabInfo) {
  let allCards = [];
  let cnt = 1;
  for (let info of alltimeElos) {
    let team = info["team"];
    if (!teamInfo[sport][team]) {
      console.log(sport, team, info["date"], info);
    }
    //info: {team, season, date, elo}
    let card = generateCard(
      teamInfo[sport][team]["logo"],
      `#${cnt} ${teamInfo[sport][team]["name"]}`,
      `${Math.round(info["elo"])}`,
      `${moment(info["date"]).format("LL")}`
    );
    allCards.push(card);
    cnt += 1;
  }

  let header = '<div style="text-align: center">All Time</div>';

  return `  <div style="max-width: 500px">` + header + allCards.join("\n") + "\n" + `  </div>`;
}

async function main() {
  const sportInfo = {
    NFL: await generateInfo(fs.readdirSync('game_data/nfl/').map(x => 'game_data/nfl/' + x), "0601"),
    NBA: await generateInfo(fs.readdirSync('game_data/nba/').map(x => 'game_data/nba/' + x), "0801"),
    MLB: await generateInfo(fs.readdirSync('game_data/mlb/').map(x => 'game_data/mlb/' + x)),
    NHL: await generateInfo(fs.readdirSync('game_data/nhl/').map(x => 'game_data/nhl/' + x), "0801")
  }

  const html = generateHtml(sportInfo);

  fs.writeFile('index.html', html, function (err) {
    if (err) return console.log(err);
  });
}

main();