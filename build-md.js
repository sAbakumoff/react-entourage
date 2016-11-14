var parse = require('csv-parse');
var fs = require("fs");

var input = fs.readFile(__dirname+'/samples1star_out.csv', function(err, data){
	if(err) return console.log(err);
	parse(data, {}, function(err, output){
		if(err) return console.log(err);
		var str="";
		output.forEach(function(row){
			str+="* ["+row[0]+"](https://github.com/"+row[0]+") " + row[2] + "\n";
		});
		fs.writeFile(__dirname+"/samples_list_1star.md",str, function(err){
			if(err) return console.log(err);
			console.log("done");
		});
  		//output.should.eql([ [ '1', '2', '3', '4' ], [ 'a', 'b', 'c', 'd' ] ]);
	});
});


//var input = '#Welcome\n"1","2","3","4"\n"a","b","c","d"';
