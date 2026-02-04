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
                
                if (label === 'STATS') {
                     // Stats often come in sections (match, 1st half, etc)
                     // Let's print the keys and the first item of each array
                     console.log('Stats Keys:', Object.keys(json));
                     Object.keys(json).forEach(key => {
                        if (Array.isArray(json[key]) && json[key].length > 0) {
                             console.log(`Sample item in ${key}:`, JSON.stringify(json[key][0], null, 2));
                        }
                     });
                } else if (label === 'LINEUPS') {
                    // Lineups usually have home/away
                    console.log('Lineups Keys:', Object.keys(json));
                    // Check if keys are '0' and '1'
                    ['0', '1'].forEach(k => {
                        if (json[k]) {
                            console.log(`Lineup [${k}]:`);
                            console.log(JSON.stringify(json[k], null, 2).substring(0, 500));
                        }
                    });
                } else {
                     // Default dump
                     console.log(JSON.stringify(json, null, 2).substring(0, 1000));
                }
            } catch (e) {
                console.error(`Error parsing JSON for ${label}:`, e.message);
            }
        });
    });
    req.end();
}

const MATCH_ID = 'GCxZ2uHc';

// 1. Match Details
makeRequest(`/api/flashscore/v2/matches/details?match_id=${MATCH_ID}`, 'DETAILS');

// 2. Match Stats
makeRequest(`/api/flashscore/v2/matches/match/stats?match_id=${MATCH_ID}`, 'STATS');

// 3. Match Lineups
makeRequest(`/api/flashscore/v2/matches/match/lineups?match_id=${MATCH_ID}`, 'LINEUPS');

// 4. Match H2H
makeRequest(`/api/flashscore/v2/matches/h2h?match_id=${MATCH_ID}`, 'H2H');

// 5. Match Summary
makeRequest(`/api/flashscore/v2/matches/match/summary?match_id=${MATCH_ID}`, 'SUMMARY');

// 6. List by Date (Test for date filter)
const today = new Date();
const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
makeRequest(`/api/flashscore/v2/matches/list-by-date?date=${dateStr}&sport_id=1`, 'LIST_BY_DATE');

// 7. List by Day (Test for day offset)
makeRequest(`/api/flashscore/v2/matches/list?day=0&sport_id=1`, 'LIST_BY_DAY');
