"use strict";
var async = require('async');
var Insights = require('../lib/insights');

var InsightsIntensity = function(eventType, recentnessHours) {
	this.eventType = eventType;
	this.recentnessHours = recentnessHours;
};

module.exports = InsightsIntensity;

InsightsIntensity.prototype.currentRelativeIntensity = function(done) {
	var insights = new Insights();

	var where = [
		"isBlackListed != 'true'",
		"isBot != 'true'",
		"isKnownScraperBot != 'true'",
		"app in ('Flightstats', 'Flightstats_mobile_web')"
	];

	var nrqlRecentVisitorCount = 
		"SELECT uniqueCount(ip) FROM ConsumerRequest WHERE " +
		where.join(" AND ") + 
		" since " + this.recentnessHours + " hours ago ";

	var nrqlWeeklyVisitorCount = 
		"SELECT uniqueCount(ip) FROM ConsumerRequest WHERE " +
		where.join(" AND ") +
		" since 1 week ago";

	var queries = [nrqlRecentVisitorCount, nrqlWeeklyVisitorCount];

	var self = this;
	async.map(
		queries,
		function(query, itemDone) {

			console.log("Running query:", query);

			insights.query(query, function(err, response) {
				var data = null;

				if (err) {
					console.log("Insights error:", err);
				}
				else {
					var results = JSON.parse(response.text).results[0];

					var keys = Object.keys(results);
					data = results[keys[0]];

					console.log("Insights response for", self.eventType, err, "\n\n", query, ":\n", data);
				}

				itemDone(err, data);
			});
			
		},
		function(err, result) {

			var recentCount = result[0];
			var weeklyCount = result[1];
			var periodsPerDay = 24 / self.recentnessHours;
			var periodsPerWeek = periodsPerDay * 7;
			var weeklyPeriodAvg = weeklyCount / periodsPerWeek;
			var quotient = recentCount / weeklyPeriodAvg;

			console.log("recent:", recentCount, "weekly total:", weeklyCount, "weeklyPeriodAvg:", weeklyPeriodAvg, "period interval:", self.recentnessHours, "periodsPerWeek:", periodsPerWeek, "quotient:", quotient);

			done(err, parseFloat(quotient));
		}
	);
};
