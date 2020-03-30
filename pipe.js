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
		'video/x-h264,profile=main,framerate=' + opts.framerate + '/1',
		'!',
		'h264parse', // gst-plugins-bad
		'config-interval=-1',
		'!',
		'mqueue.sink_0',
		/* Audio Pipe */
		'pulsesrc', // gst-plugins-good
		'device=' + opts.soundSrc,
		'provide-clock=true',
		'do-timestamp=true',
		'buffer-time=40000',
		'!',
		'queue',
		'leaky=2',
		'max-size-buffers=0',
		'max-size-time=0',
		'max-size-bytes=0',
		'!',
		'audiorate', // gst-plugins-base
		'skip-to-first=true',
		'!',
		'audio/x-raw,channels=2',
		'!',
		'audioconvert', // gst-plugins-base
		'!',
		'queue',
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
		'aacparse', // gst-plugins-good
		'!',
		'mqueue.sink_1',
		'multiqueue',
		'name=mqueue',
		'!',
		'tsmux.sink_0',
		'mqueue.src_1',
		'!',
		'tsmux.sink_1',
		'mpegtsmux', // gst-plugins-bad
		'alignment=7',
		'name=tsmux',
		'!',
		'hlssink', // gst-plugins-bad
		'async-handling=true',
		'location=' + opts.hlsDir + '/segment%05d.ts',
		'playlist-location=' + opts.hlsDir + '/playlist.m3u8',
		'target-duration=1',
		'playlist-length=5',
		'max-files=10'
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
			'!',
			'queue',
			'!'
		);
	}

	return pipe;
}
