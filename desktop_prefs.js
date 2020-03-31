imports.gi.versions.Gtk = '3.0';

const { Gio, Gtk, GObject } = imports.gi;
const Local = imports.misc.extensionUtils.getCurrentExtension();

const EXTENSIONS_PATH = Local.path.substring(0, Local.path.lastIndexOf('/'));
const LOCAL_PATH = EXTENSIONS_PATH + '/cast-to-tv-desktop-addon@rafostar.github.com';
const MAIN_PATH = EXTENSIONS_PATH + '/cast-to-tv@rafostar.github.com';

/* Imports from main extension */
imports.searchPath.unshift(MAIN_PATH);
const { SettingLabel, addToGrid } = imports.prefs_shared;
const Helper = imports.helper;
imports.searchPath.shift();

const Metadata = Helper.readFromFile(LOCAL_PATH + '/metadata.json');
const Settings = Helper.getSettings(LOCAL_PATH, Metadata['settings-schema']);
const Gettext = imports.gettext.domain(Metadata['gettext-domain']);
const _ = Gettext.gettext;

function init()
{
	Helper.initTranslations(LOCAL_PATH, Metadata['gettext-domain']);
}

let DesktopSettings = GObject.registerClass(
class DesktopSettings extends Gtk.Grid
{
	_init()
	{
		super._init({ margin: 20, row_spacing: 6 });
		this.title = new Gtk.Label({ label: _("Desktop") });
		let label = null;
		let widget = null;

		/* Label: Desktop Options */
		label = new SettingLabel(_("Desktop Options"), true);
		addToGrid(this, label, null, true);

		/* Recording FPS */
		label = new SettingLabel(_("Video FPS"));
		widget = new Gtk.SpinButton({halign:Gtk.Align.END});
		widget.set_range(10, 60);
		widget.set_value(Settings.get_int('framerate'));
		widget.set_increments(1, 2);
		Settings.bind('framerate', widget, 'value', Gio.SettingsBindFlags.DEFAULT);
		addToGrid(this, label, widget);

		/* Video Bitrate */
		label = new SettingLabel(_("Bitrate (Mbps)"));
		widget = new Gtk.SpinButton({halign:Gtk.Align.END, digits:1});
		widget.set_range(1.0, 10.0);
		widget.set_value(Settings.get_double('bitrate'));
		widget.set_increments(0.1, 0.2);
		Settings.bind('bitrate', widget, 'value', Gio.SettingsBindFlags.DEFAULT);
		addToGrid(this, label, widget);

		/* Audio Encoder */
		label = new SettingLabel(_("Audio encoder"));
		widget = new Gtk.ComboBoxText({halign:Gtk.Align.END});
		widget.append('fdkaacenc', "FDK AAC");
		widget.append('faac', "FAAC");
		Settings.bind('encoder', widget, 'active-id', Gio.SettingsBindFlags.DEFAULT);
		addToGrid(this, label, widget);

		/* Draw Cursor */
		label = new SettingLabel(_("Show cursor"));
		widget = new Gtk.Switch({halign:Gtk.Align.END});
		widget.set_active(Settings.get_boolean('cursor'));
		Settings.bind('cursor', widget, 'active', Gio.SettingsBindFlags.DEFAULT);
		addToGrid(this, label, widget);
	}
});

function buildPrefsWidget()
{
	let widget = new DesktopSettings();

	widget.show_all();
	return widget;
}
