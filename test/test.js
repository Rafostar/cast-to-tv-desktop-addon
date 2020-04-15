const { Gio, GLib } = imports.gi;

const SOUND_SRC = (ARGV[0]) ? ARGV[0] : null;
const CWD = GLib.get_current_dir();
const LOCAL_PATH = CWD.substring(CWD, CWD.lastIndexOf('/'));
imports.searchPath.unshift(LOCAL_PATH);

const Pipe = imports.pipe;

let opts = {
	threads: 2,
	framerate: 30,
	bitrate: 2000,
	enableAudio: true,
	soundSrc: SOUND_SRC,
	audioEnc: ARGV[1] || 'fdkaacenc',
	videoEnc: 'none',
	hlsStream: false,
	hlsDir: '/tmp/hls_test',
	port: 4007
};
let loop = GLib.MainLoop.new(null, false);

function createTestDir()
{
	let dirExists = GLib.file_test(opts.hlsDir, GLib.FileTest.EXISTS);

	if(!dirExists)
		GLib.mkdir_with_parents(opts.hlsDir, 493);
}

function performTest()
{
	if(!SOUND_SRC)
		return log('Missing sound source ARGV (use `pacmd list-sources | grep name:`)');

	let videoSrc = [
		'videotestsrc',
		'!',
		'video/x-raw,format=I420,width=320,height=240,framerate=15/1',
		'!'
	];

	let pipe = videoSrc.concat(Pipe.getPipe(opts));

	log('CURRENT GSTREAMER PIPE: ' + pipe.join(' '));
	pipe.unshift(GLib.find_program_in_path('gst-launch-1.0'));

	log('PERFORMING RECORDING TEST...');
	GLib.setenv('GST_DEBUG_DUMP_DOT_DIR', opts.hlsDir, true);
	let proc = Gio.Subprocess.new(pipe, Gio.SubprocessFlags.NONE);
	proc.wait_async(null, () => loop.quit());

	loop.run();
}

createTestDir();
performTest();
