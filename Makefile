# Basic Makefile

EXTNAME = cast-to-tv-desktop-addon
UUID = cast-to-tv-desktop-addon@rafostar.github.com
GETTEXT = cast-to-tv-desktop-addon
PACKAGE = "Cast to TV - Desktop Stream Addon"
TOLOCALIZE = widget.js desktop_prefs.js
#ZIPFILES = *.js *.json node_scripts schemas locale COPYING README.md
ZIPFILES = *.js *.json node_scripts schemas COPYING README.md
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
install:# sync-translations
ifeq ($(CUSTOMPATH),)
	glib-compile-schemas ./schemas/
	mkdir -p $(INSTALLPATH)/$(UUID)
	cp -r $(ZIPFILES) $(INSTALLPATH)/$(UUID)
else
	mkdir -p $(CUSTOMPATH)/$(UUID)
	cp -r $(filter-out schemas locale README.md COPYING, $(ZIPFILES)) $(CUSTOMPATH)/$(UUID)
	mkdir -p /usr/share/glib-2.0/schemas
	cp -r ./schemas/*.gschema.* /usr/share/glib-2.0/schemas/
	glib-compile-schemas /usr/share/glib-2.0/schemas 2>/dev/null
	mkdir -p /usr/share/locale
	cp -r ./locale/* /usr/share/locale/
	mkdir -p /usr/share/doc/$(EXTNAME)
	cp ./README.md /usr/share/doc/$(EXTNAME)/
	mkdir -p /usr/share/licenses/$(EXTNAME)
	cp ./COPYING /usr/share/licenses/$(EXTNAME)/
	mkdir -p $(CUSTOMPATH)/$(UUID)/node_modules
	chmod 777 $(CUSTOMPATH)/$(UUID)/node_modules
endif

_build: glib-schemas sync-translations

