"use strict";
var five = require("johnny-five");
var pixel = require("../lib/pixel.js");

var opts = {};
opts.port = process.argv[2] || "";

var board = new five.Board(opts);
var strip = null;

var Intensity = require('./insights-intensity');
var intensityNeutralityThreshold = 0.05;

var MaxColor = 255;
var MaxIntensity = 2.0;
var MinIntensity = 0.1;

var Colors = {
	neutral: {
		red: 255,
		green: 255,
		blue: 204
	},
	cold: {
		red: 0,
		green: 0,
		blue: (MaxColor / MaxIntensity)
	},
	hot: {
		red: (MaxColor / MaxIntensity),
		green: 0,
		blue: 0
	}
};

var web3hIntensity = new Intensity("ConsumerRequest", 3);

function renderCurrentIntensity() {
	web3hIntensity.currentRelativeIntensity(function(err, intensity) {
		if (err) {
			console.log("error:", err);
		}
		else {
			console.log("web3hIntensity:", intensity);

			var currentStripColor;

			if (intensity < -intensityNeutralityThreshold) {
				currentStripColor = rgb(colorDiff(Colors.cold, Colors.neutral, intensity));
			}
			else if (intensity > intensityNeutralityThreshold) {
				currentStripColor = rgb(colorDiff(Colors.hot, Colors.neutral, intensity));
			}
			else {
				currentStripColor = rgb(colorDiff(Colors.neutral, Colors.neutral, intensity));
			}

			console.log("setting color:", currentStripColor);

			strip.color(currentStripColor);
			strip.show();
		}
	});
}

board.on("ready", function() {

	console.log("Board ready");

	strip = new pixel.Strip({
		data: 6,
		length: 32,
		board: this
	});


	setInterval(renderCurrentIntensity, 60000);
	renderCurrentIntensity();
});

function rgb(color) {
	return "rgb(" + [parseInt(color.red), parseInt(color.green), parseInt(color.blue)].join(',') + ")";
}

// Somewhere between max red and max neutral. 
// 
function colorDiff(c1, c2, scale) {
	return {
		red: Math.abs(c1.red - c2.red) * scale,
		green: Math.abs(c1.green / c2.green) * scale,
		blue: Math.abs(c1.blue / c2.blue) * scale
	};
}



