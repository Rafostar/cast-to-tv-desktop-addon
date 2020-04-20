imports.gi.versions.Gtk = '3.0';

const { Gtk, GObject } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const { CastDesktopRecorder } = Local.imports.recorder;
const _ = Gettext.gettext;

const REMOTE_DESKTOP_ICON = 'preferences-desktop-remote-desktop-symbolic';
const FALLBACK_ICON = 'video-display-symbolic';

var AddonMenuItem = GObject.registerClass(
class CastDesktopMenuItem extends PopupMenu.PopupImageMenuItem
{
	_init(mainImports)
	{
		let iconName = (Gtk.IconTheme.get_default().has_icon(REMOTE_DESKTOP_ICON)) ?
			REMOTE_DESKTOP_ICON : FALLBACK_ICON;

		super._init(_("Desktop"), iconName);
		this.isDesktopStream = true;

		this.castRecorder = new CastDesktopRecorder(mainImports);
		this._activateSignal = this.connect('activate', () =>
		{
			(this.castRecorder.is_recording()) ?
				this.castRecorder.stopRecord() : this.castRecorder.startRecord();
		});
	}

	_onCastStop()
	{
		this.castRecorder.stopRecord();
	}

	destroy()
	{
		this.disconnect(this._activateSignal);
		this.castRecorder.destroy();

		super.destroy();
	}
});
