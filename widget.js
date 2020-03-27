const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;

const EXTENSIONS_PATH = Local.path.substring(0, Local.path.lastIndexOf('/'));
const MAIN_PATH = EXTENSIONS_PATH + '/cast-to-tv@rafostar.github.com';

const gstConfig = Local.imports.gst_config.config;

/* Imports from main extension */
imports.searchPath.unshift(MAIN_PATH);
const Helper = imports.helper;
const Soup = imports.soup;
const shared = imports.shared.module.exports;
imports.searchPath.shift();

const CastSettings = Helper.getSettings(MAIN_PATH);
const Settings = Helper.getSettings(Local.path, Local.metadata['settings-schema']);
/* TRANSLATORS: Title of the stream, shown on Chromecast and GNOME remote widget */
const TITLE = _("Desktop Stream");


const { GLib, Shell } = imports.gi;

var addonMenuItem = class desktopMenu extends PopupMenu.PopupImageMenuItem
{
	constructor()
	{
		super(_("Desktop"), 'user-desktop-symbolic');

		this.listeningPortSignal = null;
		this.isDesktopStream = true;

		let castRecorder = null;

		GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () =>
		{
			castRecorder = new Shell.Recorder({
				stage: global.stage,
				screen: global.screen
				//display: global.display
			});

			return false;
		});

		this.connect('activate', () =>
		{
			Helper.closeOtherApps(MAIN_PATH);

			castRecorder.set_pipeline(gstConfig);

			let [success, fileName] = castRecorder.record();

			log('RECORDER ON_START: ' + castRecorder.is_recording());
			log('RECORDER FILENAME: ' + fileName);

			this.timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () =>
			{
				castRecorder.close();
				log('RECORDER ON_END: ' + castRecorder.is_recording());

				return false;
			});
		});

		this.destroy = () =>
		{
			if(this.listeningPortSignal)
				CastSettings.disconnect(this.listeningPortSignal);

			super.destroy();
		}
	}
}
