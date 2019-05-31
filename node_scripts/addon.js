var gstRecorder = require('gstreamer-recorder');
var recorder = new gstRecorder({ audio: { encoder: 'lamemp3enc' }});

var config;
var selection;

exports.handleSelection = function(selectionContents, configContents)
{
	config = configContents;
	selection = selectionContents;

	var devices = recorder.getAudioDevices(true);
	var audioSrc = 'cast_to_tv.monitor';

	if(devices.includes(audioSrc)) recorder.opts.audio.device = audioSrc;
	else recorder.opts.audio.device = null;
}

exports.closeStream = function()
{
	config = null;
	selection = null;
}

exports.fileStream = function(req, res)
{
	res.setHeader('Content-Type', 'video/x-matroska');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Connection', 'keep-alive');
	res.statusCode = 200;

	recorder.start().pipe(res);
	req.on('close', recorder.stop);
}

exports.subsStream = function(req, res)
{
	res.sendStatus(204);
}

exports.coverStream = function(req, res)
{
	res.sendStatus(204);
}
