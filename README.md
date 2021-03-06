# Cast to TV Desktop Stream Add-on
Desktop streaming support for GNOME Shell Extension Cast to TV v14+.

## Comparison with Chrome desktop streaming
* Pros:
  * Streams with audio
  * Works on Wayland
  * Customizable video bitrate and fps
  * Hardware acceleration
  * Option to show/hide mouse cursor
* Cons:
  * Higher delay

## Requirements
* [Cast to TV](https://github.com/Rafostar/gnome-shell-extension-cast-to-tv) (v14+)
* [GStreamer-1.0](https://gstreamer.freedesktop.org) plugins:
  * plugins-base
  * plugins-good
  * plugins-bad
  * plugins-ugly

Desktop streaming uses `PulseAudio` to capture sound and `pacmd` to alter its configuration, so your system must be using them (most Linux distros do by default).

If you want to use `VAAPI` hardware acceleration, you have to additionally install `gstreamer1-vaapi` plugins. Nvidia hardware acceleration is included as part of `plugins-bad` package.

Remember to select correct AAC plugin in extension preferences. Support varies by Linux distro. You can check which one you have from terminal using `gst-inspect-1.0`:
```
gst-inspect-1.0 fdkaac
gst-inspect-1.0 faac
gst-inspect-1.0 avenc_aac
gst-inspect-1.0 voaacenc
```

### Fedora
Having enabled rpm fusion repos run:
```
sudo dnf install gstreamer1-plugins-{base,good,bad-free,ugly}
```

## Download

[<img src="https://github.com/Rafostar/gnome-shell-extension-cast-to-tv/wiki/images/Gnome-Extensions.png" width="30%" height="30%">](https://extensions.gnome.org/extension/2977/cast-to-tv-desktop-stream-add-on)

### Installation from source code
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

## Audio fix
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

## Hardware acceleration
The add-on allows using either VAAPI (Intel/AMD) or NVENC (Nvidia) hardware accelerated recording (disabled by default).

Unfortunately GStreamer implementation of both is kind of experimental state right now. Using it might crash your `gnome-shell` session. Please be warned. If you wish to try it anyway, you might need to enable it by adding `LIBVA_DRIVER_NAME=` with correct driver name and `GST_VAAPI_ALL_DRIVERS=1` to your `/etc/environment` (Intel/AMD), if you are on Nvidia check if your gstreamer build was compiled with `nvenc` support.

## GStreamer pipeline
<p align="center">
<img src="https://raw.githubusercontent.com/Rafostar/cast-to-tv-desktop-addon/master/test/pipeline.png">
</p>

Above graph shows currently used GStreamer pipeline during streaming.

Please note that GNOME Shell does not let you see or edit video capture part (besides only few options), so the beggining of video stream shown here was replaced with `VideoTestSrc + CapsFilter`.

`VideoRate` element is required, because GNOME Recorder uses variable framerate for screen capture which Chromecast does not like.

`MultiQueue` element for all branches is recommended for h264 encoding according to [GStreamer docs](https://gstreamer.freedesktop.org/documentation/x264/index.html).

## To do
- [X] Implement desktop recording using GNOME Shell.Recorder
- [X] Audio support
- [X] Video scaling
- [X] Add video bitrate and fps setting
- [X] Support HLS and TCP stream
- [X] Auto switching of audio sink
- [X] Hardware acceleration (vaapi/nvenc)
- [X] Wayland support
- [ ] Native audio sink selection in GJS
