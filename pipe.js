function getPipe(opts)
{
	let pipe = [
		/* Video Pipe */
		'videorate',
		'skip-to-first=true',
		'!',
		'video/x-raw,framerate=' + opts.framerate + '/1',
		'!',
	];

	switch(opts.videoEnc)
	{
		case 'vaapi':
			pipe.push(
				'vaapih264enc', // gstreamer-vaapi
				'rate-control=cbr',
				'cabac=true',
				'keyframe-period=' + opts.framerate
			);
			break;
		case 'nvenc':
			pipe.push(
				'nvh264enc', // gst-plugins-bad
				'preset=low-latency-hq',
				'rc-mode=cbr'
			);
			break;
		default:
			pipe.push(
				'x264enc', // gst-plugins-ugly
				'threads=' + opts.threads,
				'tune=zerolatency',
				'cabac=true',
				'sliced-threads=true',
				'b-adapt=false',
				'rc-lookahead=0',
				'key-int-max=' + opts.framerate,
				'speed-preset=superfast'
			);
			break;
	}

	pipe.push(
		'bitrate=' + opts.bitrate,
		'!',
		'video/x-h264,profile=main',
		'!'
	);

	if(opts.enableAudio)
	{
		pipe.push(
			/* Video -> Multiqueue */
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
			'!'
		);

		/* Audio Encoder Selection */
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
			/* Multiqueue Audio -> AAC Parse */
			'aparse.',
			'mqueue.src_1',
			'!',
			/* Multiqueue Video -> H264 Parse */
			'vparse.',
			'mqueue.src_0',
			'!'
		);
	}
	else
	{
		pipe.push(
			'queue',
			'!'
		);
	}

	pipe.push(
		/* H264 Parse */
		'h264parse', // gst-plugins-bad
		'name=vparse',
		'config-interval=-1',
		'!'
	);

	if(opts.enableAudio)
	{
		pipe.push(
			/* H264 Parse -> Mux */
			'outmux.',
			/* AAC Parse */
			'aacparse', // gst-plugins-good
			'name=aparse',
			'!'
			/* AAC Parse -> Mux */
		);
	}

	if(opts.hlsStream)
	{
		pipe.push(
			/* TS Mux */
			'mpegtsmux', // gst-plugins-bad
			'alignment=7',
			'name=outmux',
			'!',
			/* HLS Output */
			'hlssink', // gst-plugins-bad
			'async-handling=true',
			'location=' + opts.hlsDir + '/segment%05d.ts',
			'playlist-location=' + opts.hlsDir + '/playlist.m3u8',
			'target-duration=1',
			'playlist-length=10',
			'max-files=20'
		);
	}
	else
	{
		pipe.push(
			/* MKV Mux */
			'matroskamux', // gst-plugins-good
			'name=outmux',
			'min-cluster-duration=0',
			'!',
			/* TCP Server Out */
			'tcpserversink',
			'host=127.0.0.1',
			'port=4007',
			'sync=false', // reduces delay
			'sync-method=burst-keyframe',
			'burst-format=default',
			'recover-policy=latest',
			'time-min=-1',
			'blocksize=64',
			'buffers-max=1',
			'burst-value=1000',
			'max-lateness=1',
			'timeout=10000000000',
			'units-max=64',
			'units-soft-max=64'
		);
	}

	opts.width = opts.width || 1920;
	opts.height = opts.height || 1080;

	/* FHD Downscale */
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
