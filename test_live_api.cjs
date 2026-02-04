const https = require('https');

const options = {
  method: 'GET',
  hostname: 'flashscore4.p.rapidapi.com',
  path: '/api/flashscore/v2/matches/live?sport_id=1',
  headers: {
    'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
    'x-rapidapi-key': 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e',
    'useQueryString': true
  }
};

const req = https.request(options, function (res) {
  const chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    const json = JSON.parse(body.toString());
    
    // Check if we have any matches that are NOT live
    let nonLiveCount = 0;
    let totalMatches = 0;
    
    json.forEach(tournament => {
      if (tournament.matches) {
        tournament.matches.forEach(match => {
            totalMatches++;
            // Check flags
            const status = match.match_status;
            if (!status.is_in_progress && !status.is_started) {
                console.log(`Found non-live match: ${match.home_team.name} vs ${match.away_team.name} - Status: ${JSON.stringify(status)}`);
                nonLiveCount++;
            }
        });
      }
    });
    
    console.log(`Total matches: ${totalMatches}`);
    console.log(`Non-live matches: ${nonLiveCount}`);
  });
});

req.end();
