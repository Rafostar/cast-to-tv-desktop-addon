const { GLib } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const _ = Gettext.gettext;
const extensionsPath = Local.path.substring(0, Local.path.lastIndexOf('/'));
const mainPath = extensionsPath + '/cast-to-tv@rafostar.github.com';
imports.searchPath.unshift(mainPath);
const shared = imports.shared.module.exports;

var addonMenuItem = class linkMenu extends PopupMenu.PopupImageMenuItem
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

			let selection = {
				addon: 'DESKTOP',
				title: _("Desktop Stream"),
				streamType: 'VIDEO_ENCODE',
				filePath: 'none'
			};
			GLib.file_set_contents(shared.selectionPath, JSON.stringify(selection, null, 1));
		});
	}

	destroy()
	{
		super.destroy();
	}
}
