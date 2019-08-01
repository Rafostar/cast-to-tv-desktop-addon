const { GLib } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;
const extensionsPath = Local.path.substring(0, Local.path.lastIndexOf('/'));
const mainPath = extensionsPath + '/cast-to-tv@rafostar.github.com';
const shared = imports.shared.module.exports;
const Settings = imports.helper.getSettings(Local.path, Local.metadata['settings-schema']);

var addonMenuItem = class desktopMenu extends PopupMenu.PopupImageMenuItem
{
	constructor()
	{
		super(_("Desktop"), 'user-desktop-symbolic');
		this.connect('activate', () =>
		{
			/* Close other possible opened windows */
			GLib.spawn_command_line_async('pkill -SIGINT -f ' + mainPath + '/file-chooser|' +
				extensionsPath + '/cast-to-tv-.*-addon@rafostar.github.com/app');

			let list = ['none'];
			GLib.file_set_contents(shared.listPath, JSON.stringify(list, null, 1));

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
				title: _("Desktop Stream"),
				streamType: 'VIDEO_ENCODE',
				filePath: 'none',
				desktop: videoParams
			};
			GLib.file_set_contents(shared.selectionPath, JSON.stringify(selection, null, 1));
		});
	}

	destroy()
	{
		super.destroy();
	}
}
