var Promise = require('promise');
var colors = require('colors');
var superagent = require('superagent');
var parse = require('csv-parse');
var transform = require('stream-transform');
var fs = require('fs');
var util = require('util');

var ghUser =  process.env.GH_USER;
var ghPwd =  process.env.GH_PWD;

if(ghPwd === undefined || ghUser === undefined)
    return console.log('please provide github credentials');


var githubEndPoint = 'https://api.github.com/';
var reposEndPoint = githubEndPoint + 'repos/'
var repoEndPoint = repo => reposEndPoint + repo;

/*
  'x-ratelimit-limit': '5000',
  'x-ratelimit-remaining': '4998',
  'x-ratelimit-reset': '1446817687', ==> time of rate limit reset in seconds.
*/

var wait = delay => new Promise(resolve => setTimeout(resolve, delay));

function getBasicRequest(repo){
    var url = repoEndPoint(repo);
    console.log(colors.green('Github request: ' + url ));
    return new Promise(function(resolve, reject){
        superagent.get(url).auth(ghUser, ghPwd).query({}).end(function(err, res){
            if(err){
                reject(err);
            }
            else{
                var remainRequests = +res.header['x-ratelimit-remaining'];
                console.log(colors.red('# of requests until limit is reached:' + remainRequests));
                resolve(res);
            }
        });
    });
}

var parser = parse({delimiter: ','});
var input = fs.createReadStream(__dirname+'/react_deps.csv');
var output = fs.createWriteStream(__dirname + '/repos.csv');
var isHeader = true, repos={}, step=0;
var transformer = transform(function(record, callback){
  if(isHeader){
    isHeader = false;
    return callback(null, "repo,stars,forks,watchers,size\n");
  }
  console.log(colors.green("step #" + ++step));
  var repo = record[0];
  if(repos.hasOwnProperty(repo))
    return callback();
  repos[repo] = 1;
  (function core(){
    getBasicRequest(repo).then(function done(response){
      var body = response.body;
      var row = util.format("%s,%d,%d,%d,%d\n",repo, body.stargazers_count, body.forks, body.watchers, body.size)
      callback(null, row);
    }, function(err){
      if(err.status===403){
        var restoringTime = (+err.header['x-ratelimit-reset']) * 1000;
        var waitTime = restoringTime - Date.now();
        console.log(colors.red('please wait for ' + waitTime + 'ms'));
        wait(waitTime).then(core);
      }
      else{
        console.log("error on repo %s : %s", repo, err);
        callback();
      }
    });
  })();
}, {parallel: 1});
input.pipe(parser).pipe(transformer).pipe(output);
