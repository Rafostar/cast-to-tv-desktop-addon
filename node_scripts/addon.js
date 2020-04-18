const fs = require('fs');
const path = require('path');
const net = require('net');
const debug = require('debug')('desktop-addon');

const MAIN_EXT_PATH = path.join(__dirname + '/../../cast-to-tv@rafostar.github.com');
const shared = require(MAIN_EXT_PATH + '/shared');

const PLAYLIST_PATH = path.join(shared.hlsDir, 'playlist.m3u8');

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

	fileStream: function(req, res, selection)
	{
		res.setHeader('Access-Control-Allow-Origin', '*');

		if(selection.hlsStream)
		{
			return fs.access(PLAYLIST_PATH, fs.constants.F_OK, (err) =>
			{
				if(err)
				{
					debug(err);
					return res.sendStatus(404);
				}

				debug('Send HLS playlist file');
				return res.sendFile(PLAYLIST_PATH);
			});
		}

		var socket = net.createConnection({
			host: '127.0.0.1',
			port: selection.tcpPort
		});

		socket.setNoDelay(true);

		const onSocketData = function(data)
		{
			res.write(data);
		}

		socket.once('connect', () =>
		{
			socket._readableState.highWaterMark = 1;
			socket._writableState.highWaterMark = 1;

			debug('New client connected to HTTP server');

			res.setHeader('Content-Type', 'video/x-matroska');
			res.setHeader('Connection', 'keep-alive');
			res.statusCode = 200;

			socket.on('data', onSocketData);
		});

		socket.once('close', () =>
		{
			debug('Connection closed');
			socket.removeListener('data', onSocketData);
		});

		res.once('close', () =>
		{
			socket.destroy();
			debug('Socket destroyed');
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
