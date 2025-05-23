// Needed to load lumens.js. Will switch to full ES6 support in backend
// app soon.
require("babel-register")({
  "presets": ["es2015"]
});
var _ = require('lodash');
var fs = require('fs');

var express = require('express');
var proxy = require('express-http-proxy');
var stellarSdk = require('stellar-sdk');
var moment = require('moment');
var logger = require('morgan');
var net = require('net');


var redis = require("redis"),
    redisClient = redis.createClient(process.env.REDIS_URL);
var lumens = require("./common/lumens.js");
var nodes = require("./common/nodes.js");
//helmet = require("helmet");
//added by sweta, 14/03/2017
var https = require('https');
//https.createServer(options, app).listen(443);
//http.createServer(app).listen(8095);


var http = require('http');
//http.createServer(app).listen(8095);
//ended by sweta
const NODE_ERROR = -1;
const NODE_TIMEOUT = -2;

var app = express();
app.get('/ledgers/public', function(req, res) {
  debugger;
   
   
  var day = moment();
  var response = [];

  var multi = redisClient.multi();

  var days = 15;

  for (var i = 0; i < days; i++) {
    response.push({date: day.format("DD-MM")});
    multi.hmget('ledger_public'+day.format("YYYY-MM-DD"), 'transaction_count', 'operation_count');
    day = day.subtract(1, 'days')
  }

  multi.exec(function (err, redisRes) {
    if (err) {
      res.sendStatus(500);
      console.error(err);
      res.error("Error");
      return;
    }

    for (var i = 0; i < days; i++) {
      response[i].successful_transaction_count = parseInt(redisRes[i][0]);
      response[i].operation_count = parseInt(redisRes[i][1]);
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-token");
    res.setHeader('Access-Control-Allow-Headers', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(response);
  });
});

app.get('/api/lumens', function(req, res) {
  redisClient.get('api_lumens', function(err, data) {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    data = JSON.parse(data);
    res.send(data);
  });
});

app.get('/api/nodes', function(req, res) {
  // Find last timestamp with minutes % 5 == 0
  var date = moment();
  date = date.subtract(date.minutes() % 5, 'minutes');

  var dates = [];
  var multi = redisClient.multi();
  var measurements = 70;

  for (var i = 0; i < measurements; i++) {
    dates.push(date.format("YYYY-MM-DD HH:mm"));
    multi.hgetall("nodes_"+date.format("YYYY-MM-DD_HH:mm"));
    date = date.subtract(5, 'minutes')
  }

  multi.exec(function (err, redisRes) {
    if (err) {
      res.sendStatus(500);
      console.error(err);
      res.error("Error");
      return;
    }

    var response = {};

    for (var node of nodes) {
      if (!response[node.id]) {
        response[node.id] = [];
      }
    }

    for (var i = 0; i < measurements; i++) {
      if (!redisRes[i]) {
        continue;
      }

      for (var node of nodes) {
        var key = node.id;

        if (!redisRes[i][key]) {
          redisRes[i][key] = '0';
        }

        response[key].push({
          date: dates[i],
          status: redisRes[i][key]
        });
      }
    }

    res.send(response);
  });
});

function updateApiLumens() {
  Promise.all([
   // lumens.totalCoins("https://horizon.stellar.org"),
//     lumens.totalCoins("https://horizon.worldblockchainbank.org:8000"),
lumens.totalCoins("https://horizon.worldblockchainbank.org"),
    lumens.availableCoins(),
//    lumens.distributionAll(),
  //  lumens.distributionDirectSignup(),
    //lumens.distributionBitcoinProgram(),
//    lumens.distributionPartnershipProgram(),
  //  lumens.distributionBuildChallenge(),
  ]).then(function(data) {
    var response = {
      updatedAt: new Date(),
      totalCoins: data[0],
      availableCoins: data[1],
//      distributedCoins: data[2],
      programs: {
  //      directProgram: data[3],
    //    bitcoinProgram: data[4],
      //  partnershipProgram: data[5],
        //buildChallenge: data[6]
      }
    };

    redisClient.set("api_lumens", JSON.stringify(response), function(err, data) {
      if (err) {
        console.error(err);
        return;
      }

      console.log("/api/lumens data saved!");
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
}

setInterval(updateApiLumens, 10*60*1000);
updateApiLumens();

function checkNode(node) {
  return new Promise((resolve, reject) => {
    let client = new net.Socket();
    let start = moment();
    client.setTimeout(10*1000);
    console.log("checkNode: connecting to: "+node.host)

    client.connect(node.port, node.host, function() {
      client.end();
      resolve({id: node.id, connectedIn: moment().diff(start)});
    });

    client.on('error', () => {
      client.end();
      resolve({id: node.id, connectedIn: NODE_ERROR});
    });

    client.on('timeout', () => {
      client.end();
      resolve({id: node.id, connectedIn: NODE_TIMEOUT});
    });
  });
}

function checkNodes() {
  let date = moment();

  // Check uptime every 5 minutes
  if (date.minutes() % 5 != 0) {
    console.log("checkNodes: not time "+date.format("YYYY-MM-DD HH:mm"))
    return;
  }

  Promise.all(_.map(nodes, checkNode))
    .then(results => {
      let multi = redisClient.multi();
      var key = "nodes_"+date.format("YYYY-MM-DD_HH:mm")

      for (let result of results) {
        multi.hset(key, result.id, result.connectedIn);
      }

      // Expire the key after 32 days
      multi.expire(key, 60*60*24*32);

      multi.exec(function (err, res) {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Added nodes uptime stats: "+key+" "+res);
      });

    });
}

setInterval(checkNodes, 60*1000);
checkNodes();

// Stream ledgers - get last paging_token
redisClient.get('paging_token', function(err, pagingToken) {
  if (err) {
    console.error(err);
    return
  }

  if (!pagingToken) {
    pagingToken = 'now';
  }

  //var horizon = new stellarSdk.Server('https://horizon.stellar.org');
//  var horizon = new stellarSdk.Server('https://54.153.84.236:8000');
//var horizon = new stellarSdk.Server('https://horizon.worldblockchainbank.org:8000');
var horizon = new stellarSdk.Server('https://horizon.worldblockchainbank.org');
  horizon.ledgers().cursor(pagingToken).stream({
    onmessage: function(ledger) {
      var date = moment(ledger.closed_at).format("YYYY-MM-DD");
      var key = "ledger_public"+date;

      var multi = redisClient.multi();
      multi.hincrby(key, "transaction_count", ledger.successful_transaction_count);
      multi.hincrby(key, "operation_count", ledger.operation_count);
      // Expire the key after 32 days
      multi.expire(key, 60*60*24*32);
      multi.set("paging_token", ledger.paging_token);
      multi.exec(function (err, res) {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Added Ledger:"+ledger.sequence+" "+ledger.closed_at+" "+res);
      });
    }
  });
});

app.set('port', (process.env.PORT ||3443));
app.set('json spaces', 2);
//app.use(helmet());//change
app.use(logger('combined'));
https.createServer({
      key: fs.readFileSync('/etc/letsencrypt/live/dashboard.hashcashconsultants.com/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/dashboard.hashcashconsultants.com/fullchain.pem'),
//      passphrase:'changeit'
    }, app).listen(3443);

if (process.env.DEV) {
  app.use('/', proxy('localhost:3000', {
    filter: function(req, res) {
      return req.path == "/" || req.path.indexOf(".js") >= 0 || req.path.indexOf(".html") >= 0;
    }
  }));
}

 else {
  app.use(express.static('dist'));

/*
   app.use('/', proxy('https://bittransact.com:3443', {
    filter: function(req, res) {
      return req.path == "/" || req.path.indexOf(".js") >= 0 || req.path.indexOf(".html") >= 0;
    }
  }));

*/
}



//app.listen(app.get('port'), function() {
  //console.log('Listening on port', app.get('port'));
//});
//app.listen = function() {
  //var server = http.createServer(this);
//  return server.listen.apply(server, arguments);
//};

