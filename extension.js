/*
Cast to TV - Desktop Stream Add-on
Developer: Rafostar
Extension GitHub: https://github.com/Rafostar/cast-to-tv-desktop-addon
*/
const Local = imports.misc.extensionUtils.getCurrentExtension();
const { AddonMenuItem } = Local.imports.widget;

const EXTENSIONS_PATH = Local.path.substring(0, Local.path.lastIndexOf('/'));
const MAIN_PATH = EXTENSIONS_PATH + '/cast-to-tv@rafostar.github.com';
const GETTEXT_DOMAIN = Local.metadata['gettext-domain'];
const EXTENSION_ID = Local.metadata['extension-id'];

/* Imports from main extension */
imports.searchPath.unshift(MAIN_PATH);
const Addons = imports.addons;
const Helper = imports.helper;
imports.searchPath.shift();

function init()
{
	Helper.initTranslations(Local.path, GETTEXT_DOMAIN);
}

function enable()
{
	Addons.enableAddon(EXTENSION_ID, AddonMenuItem);
}

function disable()
{
	Addons.disableAddon(EXTENSION_ID);
}
