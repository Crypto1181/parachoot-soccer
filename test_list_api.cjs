const https = require('https');

// Helper to make request
function makeRequest(path, label) {
    const options = {
        method: 'GET',
        hostname: 'flashscore4.p.rapidapi.com',
        path: path,
        headers: {
            'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
            'x-rapidapi-key': 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e',
            'useQueryString': true
        }
    };

    const req = https.request(options, function (res) {
        const chunks = [];
        res.on('data', function (chunk) { chunks.push(chunk); });
        res.on('end', function () {
            const body = Buffer.concat(chunks);
            try {
                const json = JSON.parse(body.toString());
                console.log(`\n=== RESULTS FOR ${label} ===`);
                console.log(`Path: ${path}`);
                
                let total = 0;
                let started = 0;
                let finished = 0;
                let notStarted = 0;

                json.forEach(t => {
                    if(t.matches) {
                        t.matches.forEach(m => {
                            total++;
                            if (m.match_status.is_finished) finished++;
                            else if (m.match_status.is_started) started++;
                            else notStarted++;
                        });
                    }
                });

                console.log(`Total Matches: ${total}`);
                console.log(`Not Started (Upcoming): ${notStarted}`);
                console.log(`Finished: ${finished}`);
                console.log(`Started (Live/InProgress): ${started}`);

                if (total > 0 && total < 5) {
                    console.log('Sample Matches:');
                    json.forEach(t => {
                        t.matches.forEach(m => {
                            console.log(`- ${m.home_team.name} vs ${m.away_team.name} [Status: ${JSON.stringify(m.match_status)}]`);
                        });
                    });
                }

            } catch (e) {
                console.error(`Error parsing JSON for ${label}:`, e.message);
            }
        });
    });
    req.end();
}

// Test Day 1 (Tomorrow)
makeRequest('/api/flashscore/v2/matches/list?day=1&sport_id=1', 'TOMORROW (day=1)');

// Test Day -1 (Yesterday)
makeRequest('/api/flashscore/v2/matches/list?day=-1&sport_id=1', 'YESTERDAY (day=-1)');
