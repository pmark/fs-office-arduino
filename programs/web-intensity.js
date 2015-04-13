"use strict";
var five = require("johnny-five");
var pixel = require("../lib/pixel.js");

var opts = {};
opts.port = process.argv[2] || "";

var board = new five.Board(opts);
var strip = null;

var Intensity = require('./insights-intensity');

var MaxColor = 255;
var MaxIntensity = 2.0;
var MinIntensity = 0.0;

var Colors = {
	cold: { // dark blue
		red: 0,
		green: 0,
		blue: 204
	},
	cool: { // turquoise
		red: 0,
		green: 204,
		blue: 204
	},
	neutral: { // white
		red: MaxColor,
		green: MaxColor,
		blue: MaxColor
	},
	warm: { // yellow
		red: MaxColor,
		green: MaxColor,
		blue: 153
	},
	hot: { // orange
		red: MaxColor,
		green: 128,
		blue: 0
	}	
};

var currentMarker = 0;
var MarkerPixelColors = [
	{ 
		red: 0,
		green: 0,
		blue: 0
	},
	{ 
		red: MaxColor,
		green: 102,
		blue: 178
	}
];

var web3hIntensity = new Intensity("ConsumerRequest", 3);

function renderCurrentIntensity() {
	web3hIntensity.currentRelativeIntensity(function(err, intensity) {
		if (err) {
			console.log("error:", err);
		}
		else {
			console.log("web3hIntensity:", intensity);

			intensity = Math.max(intensity, MinIntensity);
			intensity = Math.min(intensity, MaxIntensity);
			intensity /= 2.0;
			// intensity is between 0 and 1

			var colorKeys = Object.keys(Colors);
			var colorIndex = colorKeys.length * intensity;
			var currentColorKey = colorKeys[colorIndex];
			var currentStripColor = Colors[currentColorKey];

			console.log("intensity:", intensity, "setting color:", currentStripColor);
			strip.color(currentStripColor);

			var markerPixel = parseInt(strip.stripLength() * intensity);
			strip.pixel(markerPixel, rgb(MarkerPixelColors[currentMarker++]));
			strip.show();

			if (currentMarker > 1) {
				currentMarker = 0;
			}
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



renderCurrentIntensity();