const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const gstRecorder = require('gstreamer-recorder');
const debug = require('debug')('desktop-addon');
const noop = () => {};

const MAIN_EXT_PATH = path.join(__dirname + '/../../cast-to-tv@rafostar.github.com');
const shared = require(MAIN_EXT_PATH + '/shared');

const SINK_NAME = 'cast_to_tv';
const PACMD_INIT = ['load-module', 'module-null-sink', 'sink_name=cast_to_tv'];
const PACMD_PROPS = [
	'update-sink-proplist', SINK_NAME,
	'device.description="Wireless Display" device.icon_name="video-display"'
];

var activeDev;
var stopTimeout;
var isStreaming = false;
var recorder = new gstRecorder({
	output: 'hls',
	format: 'mpegts',
	audio: { device: 'cast_to_tv.monitor', encoder: 'faac', props: ['midside=false', 'tns=true'] },
	file: { dir: shared.hlsDir }
});

module.exports =
{
	handleSelection: function(selection, config)
	{
		return new Promise((resolve, reject) =>
		{
			var sinks = recorder.getAudioSinks();
			var indexes = Object.keys(sinks);

			var isCastSink = indexes.some(index => sinks[index].name === SINK_NAME);
			var activeId = indexes.find(index => sinks[index].active === true);
			activeDev = sinks[activeId].name;

			recorder.opts.video = { ...recorder.opts.video, ...selection.desktop };

			if(isCastSink)
				setSink(err => err ? reject(err) : resolve());
			else
				prepareCast(err => err ? reject(err) : resolve());
		});
	},

	closeStream: function()
	{
		stopRecording(err =>
		{
			if(err) return debug(err);

			fs.access(recorder.opts.file.dir, fs.constants.F_OK, (err) =>
			{
				if(err) return debug(err);

				fs.readdir(recorder.opts.file.dir, (err, files) =>
				{
					if(err) return debug(err);

					files.forEach(file => fs.unlinkSync(recorder.opts.file.dir + '/' + file));
					fs.rmdir(recorder.opts.file.dir, () => {});
				});
			});
		});
	},

	fileStream: function(req, res)
	{
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/x-mpegURL');
		res.statusCode = 200;

		if(recorder.process)
		{
			setStopTimeout();
			return fs.createReadStream(recorder.opts.file.dir + '/playlist.m3u8').pipe(res);
		}

		if(!fs.existsSync(recorder.opts.file.dir))
			fs.mkdirSync(recorder.opts.file.dir);

		recorder.start(err =>
		{
			if(err)
			{
				debug(err);
				return res.sendStatus(404);
			}

			isStreaming = true;
			/* Give time for playlist to fill itself */
			setTimeout(() =>
			{
				setStopTimeout();
				fs.createReadStream(recorder.opts.file.dir + '/playlist.m3u8').pipe(res);
			}, 1200);
		});
	},

	subsStream: function(req, res)
	{
		res.sendStatus(204);
	},

	coverStream: function(req, res)
	{
		res.sendStatus(204);
	}
}

function stopRecording(cb)
{
	cb = cb || noop;

	if(!isStreaming) return cb(null);

	isStreaming = false;

	if(recorder.process)
		recorder.stop(restoreAudioSink(cb));
	else
		restoreAudioSink(cb);
}

function pacmdSpawn(opts, cb)
{
	cb = cb || noop;

	const onSpawnExit = function(code)
	{
		ps.removeListener('error', onSpawnError);
		cb(null);
	}

	const onSpawnError = function(err)
	{
		ps.removeListener('exit', onSpawnExit);
		cb(err);
	}

	var ps = spawn('pacmd', opts);

	ps.once('error', onSpawnError);
	ps.once('exit', onSpawnExit);
}

function restoreAudioSink(cb)
{
	cb = cb || noop;

	pacmdSpawn(['unload-module', 'module-null-sink'], () => {
		pacmdSpawn(['set-default-sink', activeDev], cb);
	});
}

function setSink(cb)
{
	cb = cb || noop;

	pacmdSpawn(['set-default-sink', SINK_NAME], cb);
}

function prepareCast(cb)
{
	var pacmdCfg = [
		'load-module', 'module-loopback',
		`source=${activeDev}.monitor`,
		'sink=cast_to_tv', 'adjust_time=5', 'latency_msec=1', 'sink_dont_move=true'
	];

	pacmdSpawn(PACMD_INIT, (err) =>
	{
		if(err) return cb(err);

		pacmdSpawn(PACMD_PROPS, (err) =>
		{
			if(err) return cb(err);

			pacmdSpawn(pacmdCfg, (err) =>
			{
				if(err) return cb(err);

				setSink(cb);
			});
		});
	});
}

function setStopTimeout()
{
	if(stopTimeout) clearTimeout(stopTimeout);
	stopTimeout = setTimeout(() => stopRecording(), 5000);
}
