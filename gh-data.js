var Promise = require('promise');
var colors = require('colors');
var superagent = require('superagent');
var parse = require('csv-parse/lib/sync');
var fs = require("fs");
var readFile = Promise.denodeify(fs.readFile);
var writeFile = Promise.denodeify(fs.writeFile);

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


function onRecords(records){
  var upperBound = records.length;
  var cache = {};
  var bad_repos = {};
  return Promise.resolve(0).then(function traverse(index){
    console.log("Step %s of %s", index+1, upperBound);
    if(index === upperBound)
      return Promise.resolve(cache);
    var repo = records[index].repo;
    if(bad_repos.hasOwnProperty(repo)){
      console.log("bad repo %s", repo);
      return traverse(index + 1);
    }
    if(cache.hasOwnProperty(repo)){
      console.log("repo %s has been handled already", repo);
      return traverse(index + 1);
    }
    return getBasicRequest(repo).then(function done(response){
      cache[repo] = {
        forks_count : response.body.forks,
        stargazers_count : response.body.stargazers_count,
        watchers_count : response.body.watchers,
        size : response.body.size
      }
      return traverse(index + 1);
    }, function fail(err){
      if(err.status===403){
        var restoringTime = (+err.header['x-ratelimit-reset']) * 1000;
        var waitTime = restoringTime - Date.now();
        console.log(colors.red('please wait for ' + waitTime + 'ms'));
        return wait(waitTime).then(()=>traverse(index));
      }
      else{
        bad_repos[repo] = 1;
        console.log("error on repo %s : %s", repo, err);
        return traverse(index + 1);
      }
    })
  })
}

var onError = (err)=>console.log(colors.red("error %s occurred", err));

readFile(__dirname+'/react_deps')
.then(content=>onRecords(parse(content, {columns : true})), onError)
.then(function done(repos_data){
  var data = Object.keys(repos_data).map(function(key){
    return Object.assign({repo : key}, repos_data[key]);
  })
  return writeFile(__dirname + "/repos.json", JSON.stringify(data));
}, onError)
.then(function(){
  console.log("we are done");
}, onError);
