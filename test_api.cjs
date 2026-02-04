
const https = require('https');

const options = {
  method: 'GET',
  hostname: 'flashscore4.p.rapidapi.com',
  port: null,
  path: '/api/flashscore/v2/matches/list?day=0&sport_id=1',
  headers: {
    'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
    'x-rapidapi-key': 'bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e',
    'useQueryString': true
  }
};

console.log('Fetching matches list (day=0)...');
const req = https.request(options, function (res) {
  const chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    console.log('Response received:');
    try {
        const json = JSON.parse(body.toString());
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.log(body.toString());
    }
  });
});

req.on('error', function (e) {
  console.error(e);
});

req.end();
