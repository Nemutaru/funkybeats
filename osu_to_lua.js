var parser = module.require("osuparser");
var format = module.require('format');

module.export("osu_to_lua", function(osu_file_contents) {
	var rtv_lua = ""
	var append_to_output = function(str, newline) {
		if (newline === undefined || newline === true)
		{
			rtv_lua += (str + "\n")
		}
		else
		{
			rtv_lua += (str)
		}
	}

	var beatmap = parser.parseContent(osu_file_contents)

	function track_time_hash(track,time) {
		return track + "_" + time
	}

	function hitobj_x_to_track_number(hitobj_x) {
		var track_number = 1;
		if (hitobj_x < 100) {
			track_number = 1;
		} else if (hitobj_x < 200) {
			track_number = 2;
		} else if (hitobj_x < 360) {
			track_number = 3;
		} else {
			track_number = 4;
		}
		return track_number;
	}

	function msToTime(s) {
		var ms = s % 1000;
		s = (s - ms) / 1000;
		var secs = s % 60;
		s = (s - secs) / 60;
		var mins = s % 60;
		var hrs = (s - mins) / 60;
		return hrs + ':' + mins + ':' + secs + '.' + ms;
	}

	var _tracks_next_open = {
		1 : -1,
		2: -1,
		3: -1,
		4: -1
	}
	var _i_to_removes = {}

	for (var i = 0; i < beatmap.hitObjects.length; i++) {
		var itr = beatmap.hitObjects[i];
		var type = itr.objectName;
		var track = hitobj_x_to_track_number(itr.position[0]);
		var start_time = itr.startTime

		if (_tracks_next_open[track] >= start_time) {

			append_to_output(format("--ERROR: Note overlapping another. At time (%s), track(%d). (Note type(%s) number(%d))",
				msToTime(start_time),
				track,
				type,
				i
			))

			_i_to_removes[i] = true
			continue
		} else {
			_tracks_next_open[track] = start_time
		}

		if (type == "slider") {
			var end_time = start_time + itr.duration
			if (_tracks_next_open[track] >= end_time) {
				append_to_output(format("--ERROR: Note overlapping another. At time (%s), track(%d). (Note type(%s) number(%d))",
					msToTime(start_time),
					track,
					type,
					i
				))

				_i_to_removes[i] = true
				continue
			} else {
				_tracks_next_open[track] = end_time
			}

		}
	}

	beatmap.hitObjects = beatmap.hitObjects.filter(function(x,i){
		return !(_i_to_removes[i])
	})

	var bpm = Math.round(60000/beatmap.timingPoints[0]);
	var firstObject = beatmap.hitObjects[0];

	append_to_output("local FormatV2 = require(game.ServerStorage.BeatmapFormats.FormatV2)");
	append_to_output("local self = FormatV2()");
	append_to_output("");

	// self.metadata
	append_to_output("self.metadata = {");
	append_to_output(format("	%s = \"%s\",","Title", beatmap.Title));
	append_to_output(format("	%s = \"%s\",","Artist", beatmap.Artist));
	append_to_output(format("	%s = \"%s\",","BannerID","rbxassetid://"));
	append_to_output(format("	%s = \"%s\",","Description",""));
	append_to_output(format("	%s = %d;","CreatorUID", 0));
	append_to_output(format("	%s = \"%s\",","Source", beatmap.Source));
	append_to_output(format("	%s = \"%s\",","Tags", beatmap.Tags));
	append_to_output("};");

	// self.char_data
	append_to_output("self.char_data = {");
	append_to_output("	BF = 'boyfren';");
	append_to_output("	Dad = 'emptyr';");
	append_to_output("};");

	// self.settings 
	append_to_output("self.settings = {");
	append_to_output(format("	%s = %d;","TimeOffset", -75 + beatmap.timingPoints[0].offset));
	append_to_output(format("	%s = %d;","AudioVolume", 1));
	append_to_output(format("	%s = %d;","PrebufferTime", 1500));
	append_to_output(format("	%s = %d;","BPM", beatmap.timingPoints[0].bpm));
	append_to_output("};");

	// self.note_data 
	append_to_output("self.note_data = {");
	append_to_output(format("	['%d;%s'] = [[", 1.0, beatmap.Version));
	

	for (var i = 0; i < beatmap.hitObjects.length; i++) {
		var itr = beatmap.hitObjects[i];
		var type = itr.objectName;
		var track = hitobj_x_to_track_number(itr.position[0]);

		// old format
		/*if (type == "slider") {
			append_to_output(format("hold(%d,%d,%d) ", itr.startTime, track, itr.duration))
		} else {
			append_to_output(format("note(%d,%d) ",itr.startTime, track))
		}*/

		if (type == "slider") {
			append_to_output(format("{'Time': %d, 'Track': %d, 'Duration': %d},", itr.startTime, track, itr.duration))
		} else {
			append_to_output(format("{'Time': %d, 'Track': %d}", itr.startTime, track))
		}
	}

	append_to_output("]]");
	append_to_output("};");

	/* dont need these rn
	append_to_output("")
	append_to_output("rtv.TimingPoints = {")
	for (var i = 0; i < beatmap.timingPoints.length; i++) {
		var itr = beatmap.timingPoints[i];
		append_to_output(format("\t[%d] = { Time = %d; BeatLength = %d; };",i+1, itr.offset, itr.beatLength))
	}
	append_to_output("};")*/ 
	
	append_to_output("return self")

	return rtv_lua
})
