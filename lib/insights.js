var request = require('superagent');
var nconf = require("nconf");
var confPath = __dirname + '/../config.json';
console.log("confpath:", confPath);
nconf.argv().env().file({file: confPath});

var config = nconf.get("insights");

var Insights = function() {
	this.xQueryKey = config.xQueryKey;
	this.url = "https://insights-api.newrelic.com/v1/accounts/" + config.accountId + "/query?nrql=";
};

Insights.prototype.query = function(query, done) {
  try {
  	decodeURIComponent(query);
  }
  catch(ex) {
  	query = encodeURI(query);
  }

  request
    .get(this.url + query)
    .set("X-Query-Key", this.xQueryKey)
    .end(function(err, data) {
      if (err != null) {
        done(err);
      }
      else {
        done(null, data);
      }
    });
};

module.exports = Insights;