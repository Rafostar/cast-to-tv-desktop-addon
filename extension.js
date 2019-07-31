/*
cast-to-tv-desktop-addon
Developer: Rafostar
Extension GitHub: https://github.com/Rafostar/cast-to-tv-desktop-addon
*/

const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Gettext = imports.gettext;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const extensionsPath = Local.path.substring(0, Local.path.lastIndexOf('/'));
const mainPath = extensionsPath + '/cast-to-tv@rafostar.github.com';

imports.searchPath.unshift(mainPath);
const Widget = Local.imports.widget;
const Addons = imports.addons;

let castMenu;
let addonMenuItem;
let timeout;

function init()
{
	Gettext.bindtextdomain(Local.metadata['gettext-domain'], Local.path + '/locale');
}

function enable()
{
	if(!timeout)
	{
		/* Give main extension time to finish startup */
		timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () =>
		{
			timeout = null;

			castMenu = Addons.findCastToTv();
			if(castMenu)
			{
				addonMenuItem = new Widget.addonMenuItem();
				castMenu.castSubMenu.menu.addMenuItem(addonMenuItem);

				if(	typeof castMenu.isServiceEnabled !== 'undefined'
					&& castMenu.isServiceEnabled === false
				) {
					addonMenuItem.actor.hide();
				}

				if(typeof castMenu.serviceMenuItem !== 'undefined')
					Addons.setLastMenuItem(castMenu, castMenu.serviceMenuItem);

				if(typeof castMenu.settingsMenuItem !== 'undefined')
					Addons.setLastMenuItem(castMenu, castMenu.settingsMenuItem);
			}

			return GLib.SOURCE_REMOVE;
		});
	}
}

function disable()
{
	if(timeout)
		GLib.source_remove(timeout);

	if(addonMenuItem)
	{
		/* No need to reorder menu items when locking screen,
		as whole cast menu will be destroyed then anyway */
		let lockingScreen = (Main.sessionMode.currentMode == 'unlock-dialog'
			|| Main.sessionMode.currentMode == 'lock-screen');

		if(!lockingScreen && castMenu)
			Addons.setLastMenuItem(castMenu, addonMenuItem);

		addonMenuItem.destroy();
	}

	addonMenuItem = null;
	timeout = null;
}
