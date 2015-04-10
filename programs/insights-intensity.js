"use strict";
var async = require('async');
var Insights = require('./insights');
var HOURS_PER_WEEK = 24 * 7;
var HOURS_PER_PERIOD = 6;
var SparkIO = require('./spark-io');
var spark = new SparkIO();

var InsightsIntensity = function(eventType, recentnessHours) {
	this.eventType = eventType;
	this.recentnessHours = recentnessHours;
	this.reportKey = eventType + recentnessHours + 'h';
};

InsightsIntensity.reportData = {};

module.exports = InsightsIntensity;

function nrqlRecentVisitorCount(sinceHours) {
	var untilHours = sinceHours + HOURS_PER_PERIOD;
	var until = (untilHours > 0) ? "until " + untilHours + " hours ago" : '';
	return "SELECT uniqueCount(ip) FROM ConsumerRequest WHERE isBlackListed != 'true' and isBot != 'true' and isKnownScraperBot != 'true' and app in ('Flightstats', 'Flightstats_mobile_web') since " +
			sinceHours + " hours ago " + until;
}

InsightsIntensity.prototype.getLastDay = function(done) {
	var insights = new Insights();

	var periodsPerDay = 24 / HOURS_PER_PERIOD;
	var periodsPerWeek = 7 * periodsPerDay;

	var nrqlWeeklyVisitorCount = "SELECT uniqueCount(ip) FROM ConsumerRequest WHERE isBlackListed != 'true' and isBot != 'true' and isKnownScraperBot != 'true' and app in ('Flightstats', 'Flightstats_mobile_web') since 1 week ago";

	var queries = [nrqlWeeklyVisitorCount];

	for (var i=0; i < periodsPerDay; i++) {
		queries.push(nrqlRecentVisitorCount(24 - (i * HOURS_PER_PERIOD)));
	}

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

					console.log("Insights response for", self.eventType, err, data);
				}

				itemDone(err, data);
			});
			
		},
		function(err, result) {
			var value = 0;
			if (result[1]) {
				value = result[0] / result[1];
			}
			done(err, parseFloat(value));
		});

}

//////////////////////////////////////

var edgeAndWebReport = function(done) {
	spark.clear(2,2,2, function() {});

	var edge3hIntensity = new InsightsIntensity("EdgeRequest", 3);
	// var edge12hIntensity = new InsightsIntensity("EdgeRequest", 12);
	var web3hIntensity = new InsightsIntensity("ConsumerRequest", 3);
	// var web12hIntensity = new InsightsIntensity("ConsumerRequest", 12);

	async.eachSeries([
		edge3hIntensity, 
		// edge12hIntensity,
		web3hIntensity,
		// web12hIntensity
	],
	function(intensity, itemDone) {
		intensity.getRecent(function(err, value) {
			value++;
			console.log("-----------:", value);
			value = Math.min(2.0, value);
			value = Math.max(0.1, value);
			InsightsIntensity.reportData[intensity.reportKey] = value;
			itemDone(null, value);
		});
	},
	function(err) {
		if (err) {
			console.log("edgeAndWebReport Error", err);
		}
		console.log("edgeAndWebReport: ", InsightsIntensity.reportData);
		done(err, InsightsIntensity.reportData);
	});
}(function(err, report) {

	// Display first report items data
	var i = 0;
	var sectionSize = 16;
	var graphSize = sectionSize;

	async.eachSeries(
		Object.keys(report),
		function(reportName, itemDone) {
			var data = report[reportName];
			var intensityValue = parseFloat(data);
			
			renderIntensity(
				intensityValue,
				(i++ * sectionSize) + (sectionSize / 2) - (graphSize / 2),
				graphSize,
				reportColors[reportName].red,
				reportColors[reportName].green,
				reportColors[reportName].blue, 
				itemDone);
		},
		function(err) {
			console.log("Done rendering all");
		}
	);
});

var reportColors = {
	EdgeRequest3h: {
		red: 255,
		green: 204,
		blue: 0
	},
	ConsumerRequest3h: {
		red: 0,
		green: 102,
		blue: 102
	}
};

function renderIntensity(intensityValue, pixelOffset, pixelCount, red, green, blue, done) {
	var fullRange = pixelCount;
	var normalRange = parseInt(fullRange * 0.25);
	var scaledRange = parseInt(normalRange * intensityValue);
	var tailRange = parseInt(scaledRange * 0.25);

	var center = fullRange / 2;
	var left = center - (scaledRange / 2);
	var tailLeft = left - (tailRange / 2);

	var maxColor = 64 * intensityValue * intensityValue;
	var steps = center - tailLeft;

	var pixels = [];
	var position, r,g,b;

	for (position=tailLeft; position < (center+steps); position++) {
		var prgb = [];
		prgb.push(parseInt(position + pixelOffset));

		var colorScale = 1.0 - (Math.abs(center - position) / steps);
		colorScale *= colorScale;

		r = parseInt((red / 2.0) * intensityValue * colorScale);
		g = parseInt((green / 2.0) * intensityValue * colorScale);
		b = parseInt((blue / 2.0) * intensityValue * colorScale);

		prgb.push(r);
		prgb.push(g);
		prgb.push(b);
		// console.log(intensityValue, prgb, prgb.join(','));

		pixels.push(prgb.join(','));
	}

	spark.rgbPositions(pixels.join(','), function(err, response) {
		// console.log(response.text);
		done(err);
	});
}


