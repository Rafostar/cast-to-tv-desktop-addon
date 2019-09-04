# Basic Makefile

UUID = cast-to-tv-desktop-addon@rafostar.github.com
GETTEXT = cast-to-tv-desktop-addon
PACKAGE = "Cast to TV - Desktop Stream Addon"
TOLOCALIZE = widget.js desktop_prefs.js
ZIPFILES = *.js *.json node_scripts schemas locale COPYING README.md
INSTALLPATH = ~/.local/share/gnome-shell/extensions
POTPATH = $(INSTALLPATH)/cast-to-tv@rafostar.github.com/po/$(GETTEXT)
POTFILE = cast-to-tv-desktop-addon.pot
TRANSLATIONSPATH = /tmp/cast-to-tv-translations

# Compile schemas #
glib-schemas:
	glib-compile-schemas ./schemas/

# Create/update potfile #
potfile:
	mkdir -p $(POTPATH)
	xgettext -o $(POTPATH)/$(POTFILE) --language=JavaScript --add-comments=TRANSLATORS: --package-name $(PACKAGE) $(TOLOCALIZE)

# Download and compile latest translation files #
sync-translations:
	$(info Fetching latest translations from git...)
	git clone --depth 1 https://github.com/Rafostar/gnome-shell-extension-cast-to-tv.git $(TRANSLATIONSPATH)
	$(MAKE) -C $(TRANSLATIONSPATH) compilemo
	mv -f $(TRANSLATIONSPATH)/locale_addons/$(GETTEXT) ./locale
	rm -rf $(TRANSLATIONSPATH)

# Create release zip #
zip-file: _build
	zip -qr $(UUID).zip $(ZIPFILES)

# Build and install #
install: zip-file
	mkdir -p $(INSTALLPATH)/$(UUID)
	unzip -qo $(UUID).zip -d $(INSTALLPATH)/$(UUID)

_build: glib-schemas sync-translations

