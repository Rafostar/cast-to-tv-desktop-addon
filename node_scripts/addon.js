var net = require('net');
var gstRecorder = require('gstreamer-recorder');
var recorder = new gstRecorder({ output: 'server', audio: { encoder: 'lamemp3enc' }});

exports.handleSelection = function(selection, config)
{
	var devices = recorder.getAudioDevices(true);
	var audioSrc = 'cast_to_tv.monitor';

	if(devices.includes(audioSrc))
		recorder.opts.audio.device = audioSrc;
	else
		recorder.opts.audio.device = null;

	recorder.opts.server.port = config.listeningPort + 1;
	recorder.opts.video = { ...recorder.opts.video, ...selection.desktop };
}

exports.closeStream = function()
{
	stopRecording();
}

exports.fileStream = function(req, res)
{
	recorder.start((err) =>
	{
		if(err) return res.sendStatus(404);

		var socket = net.createConnection({
			port: recorder.opts.server.port,
			host: recorder.opts.server.host
		});

		var type = (recorder.opts.format === 'matroska') ? 'x-matroska' : 'mp4';

		res.setHeader('Content-Type', `video/${type}`);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Connection', 'keep-alive');
		res.statusCode = 200;

		socket.pipe(res);
		socket.on('error', () => stopRecording());
	});

	req.on('close', () => stopRecording());
	req.on('end', () => stopRecording());
}

exports.subsStream = function(req, res)
{
	res.sendStatus(204);
}

exports.coverStream = function(req, res)
{
	res.sendStatus(204);
}

function stopRecording()
{
	if(recorder.process)
		recorder.stop();
}
