# Cast to TV Desktop Stream Add-on
Desktop streaming support for GNOME Shell Extension Cast to TV.

### WORK IN PROGRESS. NOT STABLE YET!

## Requirements
* [Cast to TV](https://github.com/Rafostar/gnome-shell-extension-cast-to-tv) (version 11 or later)
* [GStreamer-1.0](https://gstreamer.freedesktop.org) with its plugins:
  * plugins-base
  * plugins-good
  * plugins-bad
  * plugins-ugly

Currently works only on X11 session.

### Fedora
Having enabled rpm fusion repos run:
```
sudo dnf install gstreamer1 gstreamer1-plugins-{base,good,bad-free,ugly}
```

## Installation
```
cd /tmp
git clone https://github.com/Rafostar/cast-to-tv-desktop-addon.git
cd cast-to-tv-desktop-addon
make install
```
After installing restart gnome-shell and enable the newly added extension.

**Before using this Add-on** you also **must** install some additional npm packages.<br>
Go to `Cast Settings -> Modules` and click `Install npm modules` button.<br>
This step will install additional packages and automatically restart Cast to TV server.
