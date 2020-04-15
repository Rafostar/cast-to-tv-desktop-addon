const { Gio, GLib, Shell, GObject } = imports.gi;
const Main = imports.ui.main;
const AggregateMenu = Main.panel.statusArea.aggregateMenu;
const Indicator = AggregateMenu._screencast._indicator;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Pipe = Local.imports.pipe;
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;
const noop = () => {};

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

		this.recordCfg = {
			framerate: this._settings.get_int('framerate'),
			bitrate: this._settings.get_double('bitrate').toFixed(1),
			encoder: this._settings.get_string('encoder'),
			cursor: this._settings.get_boolean('cursor'),
			audio: this._settings.get_boolean('audio'),
			hls: this._settings.get_boolean('hls')
		};
		this._updatePipeConfig();

		this._signalIds = [];
		let signals = {
			string: ['encoder'],
			int: ['framerate'],
			double: ['bitrate'],
			boolean: ['cursor', 'audio', 'hls']
		};

		for(let type in signals)
		{
			for(let setting of signals[type])
				this._connectSignal(setting, type);
		}
	}

	_connectSignal(setting, type)
	{
		this._signalIds.push(
			this._settings.connect(
				'changed::' + setting,
				this._updateSetting.bind(this, setting, type)
			)
		);
	}

	_updateSetting(setting, type)
	{
		this.recordCfg[setting] = this._settings['get_' + type](setting);

		if(type === 'double')
			this.recordCfg[setting] = this.recordCfg[setting].toFixed(1);

		this._updatePipeConfig();
	}

	startRecord()
	{
		this._imports.helper.createDir(this._imports.shared.hlsDir);

		if(!this.recordCfg.audio)
			return this._finishStartRecord();

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
						return this._logInfo('set audio sink error');

					this._finishStartRecord();
				});
			}
			else
			{
				this._prepareCast(hadErr =>
				{
					if(hadErr)
						return this._logInfo('prepare desktop cast error');

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
			{
				this._addonNotify('Desktop recording closed unexpectedly');
				return this._finishStopRecord();
			}

			let selection = {
				addon: 'DESKTOP',
				title: _(TITLE),
				streamType: 'LIVE',
				hlsStream: this.recordCfg.hls,
				maxLiveDelay: 7,
				filePath: _(TITLE)
			};

			this._imports.soupClient.postPlaybackData({
				playlist: [ selection.filePath ],
				selection: selection
			});

			return GLib.SOURCE_REMOVE;
		});
	}

	stopRecord(cb)
	{
		cb = cb || noop;

		if(!this.is_recording())
			return cb(null);

		this.close();
		this._finishStopRecord(cb);
	}

	_finishStopRecord(cb)
	{
		cb = cb || noop;

		this._restoreAudioSink(hadErr =>
		{
			if(hadErr)
				this._logInfo('cannot restore previous audio device');

			return cb(hadErr);
		});

		Indicator.visible = false;
	}

	_updatePipeConfig()
	{
		this.set_framerate(this.recordCfg.framerate);
		this.set_draw_cursor(this.recordCfg.cursor);

		let pipe = Pipe.getPipe({
			threads: '%T',
			framerate: this.recordCfg.framerate,
			bitrate: this.recordCfg.bitrate * 1000,
			width: global.screen_width,
			height: global.screen_height,
			enableAudio: this.recordCfg.audio,
			soundSrc: 'cast_to_tv.monitor',
			audioEnc: this.recordCfg.encoder,
			hlsStream: this.recordCfg.hls,
			hlsDir: this._imports.shared.hlsDir
		});

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

		/* Wait for recording to stop */
		GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () =>
		{
			this._pacmdSpawn(['unload-module', 'module-null-sink'], (hadErr) =>
			{
				if(hadErr) return cb(hadErr);

				this._pacmdSpawn(['set-default-sink', prevSource], cb);
			});

			return GLib.SOURCE_REMOVE;
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

	_logInfo(info)
	{
		log('Cast to TV: ' + info);
	}

	destroy()
	{
		this.stopRecord(() => prevSource = null);
		this.destroyed = true;

		this._signalIds.forEach(signalId =>
			this._settings.disconnect(signalId)
		);
	}
});
