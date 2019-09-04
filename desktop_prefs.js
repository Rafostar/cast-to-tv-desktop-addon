const { Gio, Gtk } = imports.gi;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const GettextDomain = Gettext.domain(Local.metadata['gettext-domain']);
const _ = GettextDomain.gettext;
const extensionsPath = Local.path.substring(0, Local.path.lastIndexOf('/'));
const mainPath = extensionsPath + '/cast-to-tv@rafostar.github.com';

imports.searchPath.unshift(mainPath);
const { SettingLabel } = imports.prefs_shared;
const Helper = imports.helper;
const Settings = Helper.getSettings(Local.path, Local.metadata['settings-schema']);

function init()
{
	Helper.initTranslations(Local.path, Local.metadata['gettext-domain']);
}

class DesktopSettings extends Gtk.Grid
{
	constructor()
	{
		super({ margin: 20, row_spacing: 6 });
		this.title = new Gtk.Label({ label: _("Desktop") });
		let label = null;
		let widget = null;

		/* Label: Links Options */
		label = new SettingLabel(_("Desktop Options"), true);
		this.attach(label, 0, 0, 1, 1);

		/* Video Scaling */
		label = new SettingLabel(_("Video resolution"));
		widget = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
		widget.append('copy', _("Same as desktop"));
		widget.append('1080p', '1920x1080');
		widget.append('720p', '1280x720');
		widget.append('540p', '960x540');
		Settings.bind('desktop-resolution', widget, 'active-id', Gio.SettingsBindFlags.DEFAULT);
		this.attach(label, 0, 1, 1, 1);
		this.attach(widget, 1, 1, 1, 1);

		/* Recording FPS */
		label = new SettingLabel(_("Video FPS"));
		widget = new Gtk.SpinButton({halign:Gtk.Align.END});
		widget.set_sensitive(true);
		widget.set_range(10, 60);
		widget.set_value(Settings.get_int('desktop-fps'));
		widget.set_increments(1, 2);
		Settings.bind('desktop-fps', widget, 'value', Gio.SettingsBindFlags.DEFAULT);
		this.attach(label, 0, 2, 1, 1);
		this.attach(widget, 1, 2, 1, 1);

		/* Video Bitrate */
		label = new SettingLabel(_("Bitrate (Mbps)"));
		widget = new Gtk.SpinButton({halign:Gtk.Align.END, digits:1});
		widget.set_sensitive(true);
		widget.set_range(1.0, 10.0);
		widget.set_value(Settings.get_double('desktop-bitrate'));
		widget.set_increments(0.1, 0.2);
		Settings.bind('desktop-bitrate', widget, 'value', Gio.SettingsBindFlags.DEFAULT);
		this.attach(label, 0, 3, 1, 1);
		this.attach(widget, 1, 3, 1, 1);
	}

	destroy()
	{
		super.destroy();
	}
}

function buildPrefsWidget()
{
	let widget = new DesktopSettings();

	widget.show_all();
	return widget;
}
