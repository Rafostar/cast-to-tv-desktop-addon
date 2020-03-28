const fs = require('fs');
const path = require('path');
const debug = require('debug')('desktop-addon');

const MAIN_EXT_PATH = path.join(__dirname + '/../../cast-to-tv@rafostar.github.com');
const shared = require(MAIN_EXT_PATH + '/shared');

const PLAYLIST_PATH = path.join(shared.hlsDir, 'playlist.m3u8');

var stopTimeout;

module.exports =
{
	handleSelection: function(selection, config)
	{
		debug('Nothing to do on handle selection');
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
// Unused but might be useful later
function setStopTimeout()
{
	if(stopTimeout)
		clearTimeout(stopTimeout);

	stopTimeout = setTimeout(() => stopRecording(), 5000);
}
*/
