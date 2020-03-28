# Cast to TV Desktop Stream Add-on
Desktop streaming support for GNOME Shell Extension Cast to TV.

### WORK IN PROGRESS. WORKS ONLY WITH LATEST CAST TO TV EXTENSION GIT MASTER!

## Comparison with Chrome desktop streaming
* Pros:
  * Streams with audio
  * Works on Wayland
  * Customizable video bitrate and fps
  * Option to show/hide mouse cursor
* Cons:
  * High delay
  * High cpu usage (no hardware acceleration yet)

## Requirements
* [Cast to TV](https://github.com/Rafostar/gnome-shell-extension-cast-to-tv) (latest git master)
* [GStreamer-1.0](https://gstreamer.freedesktop.org) plugins:
  * plugins-base
  * plugins-good
  * plugins-bad
  * plugins-ugly

Desktop streaming uses `PulseAudio` to capture sound and `pacmd` to alter its configuration, so your system must be using them (most Linux distros do by default).

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
After installing restart gnome-shell and **enable** the newly added extension using GNOME Tweaks.

**Before using this Add-on** you also **must** install some additional npm packages.<br>
Go to `Cast Settings -> Modules` and click `Install npm modules` button.<br>
This step will install additional packages and automatically restart Cast to TV server.

### Audio fix
In order to automatically switch audio output to the receiver, we need to alter PulseAudio default config a little.
Open `/etc/pulse/default.pa` in any text editor as root and find line with:
```
load-module module-stream-restore
```
Change it into below and save edited file:
```
load-module module-stream-restore restore_device=false
```

Finally for the changes to take effect restart PulseAudio with below command or reboot:
```
pulseaudio -k
```

## To do
- [X] Implement desktop recording using GNOME Shell.Recorder
- [X] Audio support
- [X] Video scaling
- [X] Add video bitrate and fps setting
- [X] Use HLS instead of piped stream
- [X] Auto switching of audio sink
- [ ] Hardware acceleration (vaapi/nvenc)
- [X] Wayland support
