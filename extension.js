/*
Cast to TV - Desktop Stream Add-on
Developer: Rafostar
Extension GitHub: https://github.com/Rafostar/cast-to-tv-desktop-addon
*/
const delay = 2000;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const extensionsPath = Local.path.substring(0, Local.path.lastIndexOf('/'));
const mainPath = extensionsPath + '/cast-to-tv@rafostar.github.com';

/* Imports from main extension */
imports.searchPath.unshift(mainPath);
const Widget = Local.imports.widget;
const Addons = imports.addons;
const Helper = imports.helper;
imports.searchPath.shift();

const gettextDomain = Local.metadata['gettext-domain'];
const extensionId = Local.metadata['extension-id'];

function init()
{
	Helper.initTranslations(Local.path, gettextDomain);
}

function enable()
{
	Addons.enableAddon(extensionId, Widget, delay);
}

function disable()
{
	Addons.disableAddon(extensionId);
}
