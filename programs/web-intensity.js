"use strict";
var five = require("johnny-five");
var pixel = require("../lib/pixel.js");
var moment = require("moment");

var WebIntensity = {

};
module.exports = WebIntensity;

var opts = {};
opts.port = process.argv[2] || "";

var board = new five.Board(opts);
var strip = null;

var Intensity = require('../lib/insights-intensity');

var MaxColor = 255;
var MaxIntensity = 2.5;
var MinIntensity = 0.0;
// var motionDetectedAt = null;
// var MOTION_DETECTION_TIME_INTERVAL_THRESHOLD_MINUTES = 2;

var Colors = [
	{ // cold: dark blue
		red: 0,
		green: 0,
		blue: 204
	},
	{ // cool: turquoise
		red: 0,
		green: 204,
		blue: 204
	},
	{ // neutral: green
		red: 0,
		green: MaxColor / 2,
		blue: 0
	},
	{ // warm: yellow
		red: MaxColor,
		green: MaxColor,
		blue: 0
	},
	{ // hot: reddish
		red: 255,
		green: 140,
		blue: 0
	}	
];

var MarkerPixelColor = { 
	red: MaxColor,
	green: MaxColor,
	blue: MaxColor
};

var webIntensity = new Intensity("ConsumerRequest", 1);

function renderCurrentIntensity() {
	if (!strip) {
		return;
	}

/*
	var minutesSinceMotion = moment().diff(motionDetectedAt, 'minutes');
	console.log("minutes since motion:", minutesSinceMotion);
	if (minutesSinceMotion > MOTION_DETECTION_TIME_INTERVAL_THRESHOLD_MINUTES) {
		strip.color(rgb({red:0, green:0, blue:0}));
		strip.show();
		return;
	}
*/

	webIntensity.currentRelativeIntensity(function(err, intensity) {
		if (err) {
			console.log("error:", err);
		}
		else {
			console.log("webIntensity:", intensity);

			intensity = Math.max(intensity, MinIntensity);
			intensity = Math.min(intensity, MaxIntensity);
			intensity /= (MaxIntensity - MinIntensity);
			// intensity is between 0 and 1

			// Pick color from 0 - 4 given 0 - 1
	
			var colorIndex = parseInt(Math.round((Colors.length-1) * intensity));
			var currentStripColor = Colors[colorIndex];

			console.log("intensity normalized:", intensity, "setting color:", currentStripColor);
			strip.color(rgb(currentStripColor));

			var markerPixel = parseInt((strip.stripLength()-1) * intensity);
			var markerColor = MarkerPixelColor;

			console.log("setting marker at", markerPixel, markerColor);
			setPixel(markerPixel-2, rgb(blendColor(markerColor, currentStripColor)));
			setPixel(markerPixel-1, rgb(markerColor));
			setPixel(markerPixel, rgb(markerColor));
			setPixel(markerPixel+1, rgb(markerColor));
			setPixel(markerPixel+2, rgb(blendColor(markerColor, currentStripColor)));

			strip.show();
		}
	});
}

function setPixel(i, c) {
	var p = strip.pixel(i);
	if (p) {
		p.color(c);
	}
}

board.on("ready", function() {

	console.log("Board ready");

	strip = new pixel.Strip({
		data: 6,
		length: 32,
		board: this
	});

/*
	var motion = new five.IR.Motion(7);

	// "calibrated" occurs once, at the beginning of a session,
	motion.on("calibrated", function() {
	  console.log("motion sensor calibrated");
	});

	// "motionstart" events are fired when the "calibrated"
	// proximal area is disrupted, generally by some form of movement
	motion.on("motionstart", function() {
	  console.log("motionstart");
	  motionDetectedAt = moment();
	});

	// "motionend" events are fired following a "motionstart" event
	// when no movement has occurred in X ms
	motion.on("motionend", function() {
	  console.log("motionend");
	});
*/

	setInterval(renderCurrentIntensity, 60000);
	renderCurrentIntensity();
});

function rgb(color) {
	return "rgb(" + [parseInt(color.red), parseInt(color.green), parseInt(color.blue)].join(',') + ")";
}

function blendColor(color1, color2) {
	return {
		red: blendSingleColor(color1.red, color2.red),
		green: blendSingleColor(color1.green, color2.green),
		blue: blendSingleColor(color1.blue, color2.blue)
	};
}

function blendSingleColor(c1, c2) {
	return (c1 / 2) + (c2 / 2);
}

