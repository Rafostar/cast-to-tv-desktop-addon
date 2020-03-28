const { Shell, GObject } = imports.gi;
const Main = imports.ui.main;
const AggregateMenu = Main.panel.statusArea.aggregateMenu;
const Indicator = AggregateMenu._screencast._indicator;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;

/* TRANSLATORS: Title of the stream, shown on Chromecast and GNOME remote widget */
const TITLE = _("Desktop Stream");

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

		let [success, fileName] = this.record();

		if(!success || !this.is_recording())
		{
			this._addonNotify('Could not start desktop recording');
			return this.stopRecord();
		}

		Indicator.visible = true;

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
	}

	stopRecord()
	{
		if(this.is_recording())
			this.close();

		Indicator.visible = false;
	}

	_updatePipeConfig()
	{
		/* To do: Should be updated with signal connections */
		let videoParams = {};

		videoParams.fps = this._settings.get_int('desktop-fps');
		videoParams.mbps = this._settings.get_double('desktop-bitrate').toFixed(1);

		this.set_framerate(videoParams.fps);
		this.set_draw_cursor(true);

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

	destroy()
	{
		this.stopRecord();
	}
});
