# Basic Makefile

UUID = cast-to-tv-desktop-addon@rafostar.github.com
ZIPFILES = *.js *.json node_scripts LICENSE README.md
INSTALLPATH = ~/.local/share/gnome-shell/extensions

# Create release zip #
zip-file:
	zip -qr $(UUID).zip $(ZIPFILES)

# Build and install #
install: zip-file
	mkdir -p $(INSTALLPATH)/$(UUID)
	unzip -qo $(UUID).zip -d $(INSTALLPATH)/$(UUID)

