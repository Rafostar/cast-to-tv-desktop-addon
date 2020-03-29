const { Gio, GLib, Shell, GObject } = imports.gi;
const Main = imports.ui.main;
const AggregateMenu = Main.panel.statusArea.aggregateMenu;
const Indicator = AggregateMenu._screencast._indicator;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;

/* TRANSLATORS: Title of the stream, shown on Chromecast and GNOME remote widget */
const TITLE = _("Desktop Stream");
const SINK_NAME = 'cast_to_tv';
const PACMD_PATH = GLib.find_program_in_path('pacmd');
const PACMD_INIT = ['load-module', 'module-null-sink', 'sink_name=cast_to_tv'];
const PACMD_PROPS = [
	'update-sink-proplist', SINK_NAME,
	'device.description="Wireless Display" device.icon_name="video-display"'
];

let prevSource;

var CastDesktopRecorder = GObject.registerClass(
class CastDesktopRecorder extends Shell.Recorder
{
	_init(mainImports)
	{
		super._init({
			stage: global.stage,
			display: global.display
		});

		this._imports = mainImports;
		this._settings = this._imports.helper.getSettings(
			Local.path, Local.metadata['settings-schema']
		);

		this._updatePipeConfig();
	}

	startRecord()
	{
		this._imports.helper.createDir(this._imports.shared.hlsDir);

		this._getSinksAsync(sinks =>
		{
			let indexes = Object.keys(sinks);

			if(!indexes.length) return;

			let isCastSink = indexes.some(index => sinks[index].name === SINK_NAME);
			let activeId = indexes.find(index => sinks[index].active === true);
			prevSource = sinks[activeId].name;

			if(isCastSink)
			{
				this._setSink(hadErr =>
				{
					if(hadErr)
						return log('Cast to TV: set audio sink error');

					this._finishStartRecord();
				});
			}
			else
			{
				this._prepareCast(hadErr =>
				{
					if(hadErr)
						return log('Cast to TV: prepare desktop cast error');

					this._finishStartRecord();
				});
			}
		});
	}

	_finishStartRecord()
	{
		let [success, fileName] = this.record();

		if(!success || !this.is_recording())
		{
			this._addonNotify('Could not start desktop recording');
			return this._finishStopRecord();
		}

		Indicator.visible = true;

		/* Wait until at least two playlist items appear */
		GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () =>
		{
			if(!this.is_recording() || this.destroyed)
				return this._finishStopRecord();

			let selection = {
				addon: 'DESKTOP',
				title: _(TITLE),
				streamType: 'LIVE',
				hlsStream: true,
				filePath: _(TITLE)
			};

			this._imports.soupClient.postPlaybackData({
				playlist: [ selection.filePath ],
				selection: selection
			});
		});
	}

	stopRecord()
	{
		if(this.is_recording())
		{
			this.close();
			this._finishStopRecord();
		}
	}

	_finishStopRecord()
	{
		this._restoreAudioSink(hadErr =>
		{
			if(hadErr) log('Cast to TV: cannot restore previous audio device');
		});

		Indicator.visible = false;
	}

	_updatePipeConfig()
	{
		/* To do: Should be updated with signal connections */
		let videoParams = {};

		videoParams.fps = this._settings.get_int('framerate');
		videoParams.mbps = this._settings.get_double('video-bitrate').toFixed(1);

		this.set_framerate(videoParams.fps);
		this.set_draw_cursor(this._settings.get_boolean('draw-cursor'));

		let pipe = [
			/* Video Pipe */
			'x264enc',  // gst-plugins-ugly
			'sliced-threads=true',
			'tune=zerolatency',
			'speed-preset=superfast',
			'bitrate=' + videoParams.mbps * 1000,
			'key-int-max=' + videoParams.fps, // keyframe in every segment
			'!',
			'h264parse', // gst-plugins-bad
			'!',
			'video/x-h264,profile=main',
			'!',
			'mpegtsmux', // gst-plugins-bad
			'name=mux',
			'!',
			'hlssink', // gst-plugins-bad
			'async-handling=true',
			'location=' + this._imports.shared.hlsDir + '/segment%05d.ts',
			'playlist-location=' + this._imports.shared.hlsDir + '/playlist.m3u8',
			'target-duration=1',
			'playlist-length=3',
			'max-files=10',

			/* Audio Pipe */
			'pulsesrc', // gst-plugins-good
			'device=cast_to_tv.monitor',
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
			'!',
/*
			'faac', // gst-plugins-bad
			'midside=false',
			'tns=true',
*/
			'fdkaacenc', // gst-plugins-bad
			'hard-resync=true',

			'!',
			'mux.'
		];

		/* Screen exceeds max Chromecast resolution */
		if(global.screen_width > 1920 || global.screen_height > 1080)
		{
			let reduction;
			let width = 1920;
			let height = 1080;

			if(global.screen_width > 1920)
			{
				reduction = global.screen_width / 1920;
				height = Math.floor(global.screen_height / reduction);
			}
			else
			{
				reduction = global.screen_height / 1080;
				width = Math.floor(global.screen_width / reduction);
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

		this.set_pipeline(pipe.join(' '));
	}

	_addonNotify(mainBody)
	{
		this._imports.helper.notify('Cast to TV - Desktop Addon', mainBody);
	}

	_pacmdSpawn(command, cb)
	{
		let proc = Gio.Subprocess.new(
			[PACMD_PATH].concat(command), Gio.SubprocessFlags.NONE
		);

		proc.wait_async(null, (self, task) =>
		{
			let hadErr = !self.wait_finish(task);
			cb(hadErr);
		});
	}

	/* Would be better to change this into async and use promises */
	_prepareCast(cb)
	{
		let pacmdCfg = [
			'load-module', 'module-loopback',
			`source=${prevSource}.monitor`,
			'sink=cast_to_tv', 'adjust_time=5',
			'latency_msec=1', 'sink_dont_move=true'
		];

		this._pacmdSpawn(PACMD_INIT, (hadErr) =>
		{
			if(hadErr) return cb(hadErr);

			this._pacmdSpawn(PACMD_PROPS, (hadErr) =>
			{
				if(hadErr) return cb(hadErr);

				this._pacmdSpawn(pacmdCfg, (hadErr) =>
				{
					if(hadErr) return cb(hadErr);

					this._setSink(hadErr => cb(hadErr));
				});
			});
		});
	}

	_setSink(cb)
	{
		this._pacmdSpawn(['set-default-sink', SINK_NAME], cb);
	}

	_restoreAudioSink(cb)
	{
		if(!prevSource)
			return cb(null);

		this._pacmdSpawn(['unload-module', 'module-null-sink'], (hadErr) =>
		{
			if(hadErr) return cb(hadErr);

			this._pacmdSpawn(['set-default-sink', prevSource], cb);
		});
	}

	_getSinksAsync(cb)
	{
		let output = '';

		let [res, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
			null, [PACMD_PATH, 'list-sinks'], null, 0, null
		);

		let stream = new Gio.DataInputStream({
			base_stream: new Gio.UnixInputStream({ fd: stdout })
		});

		this._imports.helper.readOutputAsync(stream, (line, finish) =>
		{
			if(finish)
				return this._parseSinksOutput(output, cb);

			if(line.includes('name:') || line.includes('index:'))
				output += line + '\n';
		});
	}

	_parseSinksOutput(output, cb)
	{
		let list = output.split('>\n');
		let sinks = {};

		list.forEach(device =>
		{
			let name = device.substring(device.indexOf('<') + 1);
			if(name)
			{
				let index = device.substring(
					device.indexOf('index:') + 7,
					device.indexOf('\n')
				);
				let isActive = (device.includes('* index:'));

				sinks[index] = { name: name, active: isActive };
			}
		});

		cb(sinks);
	}

	destroy()
	{
		this.stopRecord();
		this.destroyed = true;
	}
});
