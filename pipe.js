function getPipe(opts)
{
	let pipe = [
		/* Video Pipe */
		'videorate',
		'skip-to-first=true',
		'!',
		'video/x-raw,framerate=' + opts.framerate + '/1',
		'!',
		'x264enc', // gst-plugins-ugly
		'threads=' + opts.threads,
		'sliced-threads=true',
		'b-adapt=false',
		'rc-lookahead=0',
		'key-int-max=' + opts.framerate,
		'speed-preset=superfast',
		'bitrate=' + opts.bitrate,
		'!',
		'video/x-h264,profile=main',
		'!',
		'mqueue.sink_0',
		/* Audio Pipe */
		'pulsesrc', // gst-plugins-good
		'device=' + opts.soundSrc,
		'provide-clock=true',
		'do-timestamp=true',
		'buffer-time=40000',
		'!',
		'audiorate', // gst-plugins-base
		'skip-to-first=true',
		'!',
		'audio/x-raw,channels=2',
		'!'
	];

	switch(opts.audioEnc)
	{
		case 'faac':
			pipe.push(
				'faac', // gst-plugins-bad
				'midside=false',
				'tns=true'
			);
			break;
		default:
			pipe.push(
				'fdkaacenc', // gst-plugins-bad
				'hard-resync=true'
			);
			break;
	}

	pipe.push(
		'!',
		'multiqueue',
		'name=mqueue',
		'!',
		'aparse.',
		'mqueue.src_1',
		'!',
		'vparse.',
		'mqueue.src_0',
		'!',
		'h264parse', // gst-plugins-bad
		'name=vparse',
		'config-interval=-1',
		'!',
		'tsmux.',
		'aacparse', // gst-plugins-good
		'name=aparse',
		'!',
		'mpegtsmux', // gst-plugins-bad
		'alignment=7',
		'name=tsmux',
		'!',
		'hlssink', // gst-plugins-bad
		'async-handling=true',
		'location=' + opts.hlsDir + '/segment%05d.ts',
		'playlist-location=' + opts.hlsDir + '/playlist.m3u8',
		'target-duration=1',
		'playlist-length=10',
		'max-files=20'
	);

	opts.width = opts.width || 1920;
	opts.height = opts.height || 1080;

	if(opts.width > 1920 || opts.height > 1080)
	{
		let reduction;
		let width = 1920;
		let height = 1080;

		if(opts.width > 1920)
		{
			reduction = opts.width / 1920;
			height = Math.floor(opts.height / reduction);
		}
		else
		{
			reduction = opts.height / 1080;
			width = Math.floor(opts.width / reduction);
		}

		pipe.unshift(
			'videoscale',
			'!',
			'video/x-raw,width=' + width + ',height=' + height,
			'!'
		);
	}

	return pipe;
}
