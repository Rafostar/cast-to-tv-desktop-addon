const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;

const EXTENSIONS_PATH = Local.path.substring(0, Local.path.lastIndexOf('/'));
const MAIN_PATH = EXTENSIONS_PATH + '/cast-to-tv@rafostar.github.com';

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

var addonMenuItem = class desktopMenu extends PopupMenu.PopupImageMenuItem
{
	constructor()
	{
		super(_("Desktop"), 'user-desktop-symbolic');

		this.listeningPortSignal = null;
		this.isDesktopStream = true;
		this.connect('activate', () =>
		{
			Helper.closeOtherApps(MAIN_PATH);

			let videoSetting = Settings.get_string('desktop-resolution');
			let videoParams = {};

			switch(videoSetting)
			{
				case '1080p':
					videoParams.width = 1920;
					videoParams.height = 1080;
					videoParams.scaling = true;
					break;
				case '720p':
					videoParams.width = 1280;
					videoParams.height = 720;
					videoParams.scaling = true;
					break;
				case '540p':
					videoParams.width = 960;
					videoParams.height = 540;
					videoParams.scaling = true;
					break;
				default:
					videoParams.width = 0;
					videoParams.height = 0;
					videoParams.scaling = false;
					break;
			}

			videoParams.fps = Settings.get_int('desktop-fps');
			videoParams.mbps = Settings.get_double('desktop-bitrate').toFixed(1);

			let selection = {
				addon: 'DESKTOP',
				title: TITLE,
				streamType: 'LIVE',
				hlsStream: true,
				filePath: TITLE,
				desktop: videoParams
			};

			if(!Soup.client)
			{
				Soup.createClient(CastSettings.get_int('listening-port'));
				this.listeningPortSignal = CastSettings.connect('changed::listening-port', () =>
					Soup.client.setNodePort(CastSettings.get_int('listening-port'))
				);
			}

			Soup.client.postPlaybackData({
				playlist: [ TITLE ],
				selection: selection
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
