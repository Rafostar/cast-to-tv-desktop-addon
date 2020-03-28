const fs = require('fs');
const path = require('path');
/* execSync should be removed once moved as async to GJS */
const { spawn, execSync } = require('child_process');
const debug = require('debug')('desktop-addon');
const noop = () => {};

const MAIN_EXT_PATH = path.join(__dirname + '/../../cast-to-tv@rafostar.github.com');
const shared = require(MAIN_EXT_PATH + '/shared');

const PLAYLIST_PATH = shared.hlsDir + '/playlist.m3u8';
const SINK_NAME = 'cast_to_tv';
const PACMD_INIT = ['load-module', 'module-null-sink', 'sink_name=cast_to_tv'];
const PACMD_PROPS = [
	'update-sink-proplist', SINK_NAME,
	'device.description="Wireless Display" device.icon_name="video-display"'
];

var prevSource;
var stopTimeout;

module.exports =
{
	handleSelection: function(selection, config)
	{
		return new Promise((resolve, reject) =>
		{
			var sinks = getSinks();
			var indexes = Object.keys(sinks);

			var isCastSink = indexes.some(index => sinks[index].name === SINK_NAME);
			var activeId = indexes.find(index => sinks[index].active === true);
			prevSource = sinks[activeId].name;

			if(isCastSink)
				setSink(err => (err) ? reject(err) : resolve());
			else
				prepareCast(err => (err) ? reject(err) : resolve());
		});
	},

	closeStream: function()
	{
		debug('Close signal but nothing to do');
	},

	fileStream: function(req, res)
	{
		res.setHeader('Access-Control-Allow-Origin', '*');

		fs.access(PLAYLIST_PATH, fs.constants.F_OK, (err) =>
		{
			if(err)
			{
				debug(err);
				return res.sendStatus(404);
			}

			return res.sendFile(PLAYLIST_PATH);
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

/*
   This should be done async and from GJS
   Set and restore sink can remain in node.js part of code
*/
function getSinks()
{
	var outStr;
	var list = [];

	try {
		outStr = execSync(`pacmd list-sinks | grep -e "name:" -e "index:"`).toString();
		list = outStr.split('>\n');
	}
	catch(err) {
		debug('Could not obtain audio devices list');
		debug(err);
	}

	var sinks = {};

	list.forEach(device =>
	{
		var name = device.substring(device.indexOf('<') + 1);
		if(name)
		{
			var index = device.substring(device.indexOf('index:') + 7, device.indexOf('\n'));
			var isActive = (device.includes('* index:'));

			sinks[index] = { name: name, active: isActive };
		}
	});

	return sinks;
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
		pacmdSpawn(['set-default-sink', prevSource], cb);
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
		`source=${prevSource}.monitor`,
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
	if(stopTimeout)
		clearTimeout(stopTimeout);

	stopTimeout = setTimeout(() => stopRecording(), 5000);
}
