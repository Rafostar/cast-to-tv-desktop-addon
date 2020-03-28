const { GObject } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Local.metadata['gettext-domain']);
const { CastDesktopRecorder } = Local.imports.recorder;
const _ = Gettext.gettext;

var AddonMenuItem = GObject.registerClass(
class CastDesktopMenuItem extends PopupMenu.PopupImageMenuItem
{
	_init(mainImports)
	{
		super._init(_("Desktop"), 'preferences-desktop-remote-desktop-symbolic');
		this.isDesktopStream = true;

		let recorder = new CastDesktopRecorder(mainImports);
		this._activateSignal = this.connect('activate', () =>
		{
			(recorder.is_recording()) ?
				recorder.stopRecord() : recorder.startRecord();
		});
	}

	destroy()
	{
		this.disconnect(this._activateSignal);
		super.destroy();
	}
});
