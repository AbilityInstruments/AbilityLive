/*
Ability Live Worship Pack Code
*/

var _pianovolume = 0;
var _efx2volume = 0;
var _initial_padvolume_mixer = [-1.0, 1.0, 0.1, 1.0, 0.5];
var _initial_padsolo_mixer = [0, 0, 0, 0, 0];
var _initial_padmute_mixer = [0, 0, 0, 0, 0];
var _initial_shinyvolume = [0.75, 0.0, 0.25];
var _initial_transpose = 0;
var _shinyfunction = ['pianovolume', 'playpad', 'efx2volume'];
var _eq_master = [0, 0, 0];
var _eq_pad = [0, 0, 0];

var _force_reduce_pads_volume = 1.0;
var _current_padsemitones = 0;
var _notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var _auto_chord_pad = false;

var _settings_file_path = "";
var _intervals = [];
var _settings = null;

var _last_midi_event = null;
var _midi_mapping = [
    { element: 'shiny_2', type: 'ControlChange', controller: 'Controller 15 Value', minvalue: 0, maxvalue: 127 },
    { element: 'shiny_3', type: 'ControlChange', controller: 'Controller BreathController Value', minvalue: 0, maxvalue: 127 }
];

async function init() {


    if (typeof abilitySample == 'undefined')
        _isMobile = true;


    //abilityDev.devMode(true);
    //abilityProduct.setDevLicense("");
    //alert(abilityCore.getTCPPort());  

    try {
        abilityCore.setZoom(-1.41);
    } catch (err) { }

    try {
        if (JSON.parse(abilitySample.getSettings()).audiodriver != "Asio") {
            $("#alert_msg_id").html("<strong>Warning!</strong> your latency may be high because you are not using an ASIO driver.");
            $('.alert').show();
        }
    } catch (err) { }

    abilitySample.init(function (data) {

        let dataObj = JSON.parse(data);
        console.log(dataObj);

        _last_midi_event = dataObj;
        $("#last_midi_event_id").html("Type: " + dataObj[0] + "<br>" + "Controller: " + dataObj[1] + "<br>" + "Value: " + dataObj[2] + "<br>" + "Value: " + dataObj[2]);

        let midiType = dataObj[0];
        let midiNote = dataObj[1];
        let midiVelOrFunc = dataObj[2];

        playKey(midiType, midiNote, midiVelOrFunc)

    });


    let extension = "aby";


    abilitySample.initMixing();
    abilitySample.setMaxBufferPrimary(64);
    //abilitySample.setMaxBufferSecondary(8);

    let wavs = abilitySample.getDirectoryFiles("", "*." + extension);
    console.log(wavs);
    wavs.forEach(function (wavFileName) {

        if (!wavFileName.startsWith("BG")) {
           
            abilitySample.addSample(wavFileName, wavFileName.replace("." + extension, ""), "key", "primary", -1);
          
        }

    });




    abilitySample.addSample("BG001." + extension, "pad001", "sound", "fixed", 5000);
    abilitySample.addSample("BG002." + extension, "pad002", "sound", "fixed", 5000);
    abilitySample.addSample("BG003." + extension, "pad003", "sound", "fixed", 5000);
    abilitySample.addSample("BG004." + extension, "pad004", "sound", "fixed", 5000);
    abilitySample.addSample("BG005." + extension, "pad005", "sound", "fixed", 5000);


    abilitySample.setCutoffParameters('*', -100.0, 1.2, -80.0)

    /*
    abilitySample.setSoundEqualizer("pad001", JSON.stringify(
                                                [
                                                   {Frequency:100,Gain:-20,Bandwidth:0.8},
                                                   {Frequency:200,Gain:-10,Bandwidth:0.8},
                                                   {Frequency:400,Gain:0,Bandwidth:0.8},
                                                   {Frequency:800,Gain:0,Bandwidth:0.8},
                                                   {Frequency:1200,Gain:0,Bandwidth:0.8},
                                                   {Frequency:2400,Gain:0,Bandwidth:0.8},
                                                   {Frequency:4800,Gain:0,Bandwidth:0.8},
                                                   {Frequency:9600,Gain:0,Bandwidth:0.8}
                                                ]));
    */


    setInterval(function () {
        $("#buffercount").html(abilitySample.getMixerBufferSize());
    }, 1000);


    abilitySample.initMidiDevice(0);

    setPadsTone(_current_padsemitones, true);
    setPadsToneByNote(_notes[_current_padsemitones], true);


    set_transpose(_initial_transpose);

    set_auto_pad(false);

    /*
    abilityCore.globalKeyListening(function(data){
        
        let keyObj = JSON.parse(data);
        if(keyObj.keyboardState == 256) //256 down | 257 up
            if(keyObj.virtualCode == 96 || keyObj.virtualCode == 48) //1 Alpha Numeric and Normal
               goToPadVolume('shinybar2','shinyknob2',1,  0, 300);
            else if(keyObj.virtualCode == 97 || keyObj.virtualCode == 49) //1 Alpha Numeric and Normal
               goToPadVolume('shinybar2','shinyknob2',1,  10, 300);
            else if(keyObj.virtualCode == 98 || keyObj.virtualCode == 50) //2 Alpha Numeric and Normal
               goToPadVolume('shinybar2','shinyknob2',1,  20, 200);
            else if(keyObj.virtualCode == 99 || keyObj.virtualCode == 51) //2 Alpha Numeric and Normal
               goToPadVolume('shinybar2','shinyknob2',1,  30, 200);

        console.log(data);
    });
    */



}

function playKey(midiType, midiNote, midiVelOrFunc, disableKeyRedraw) {

    console.log(midiType);
    //console.log("total buffer: " + abilitySample.getMixerBufferSize());

    let note = midiNote.slice(0, -1);
    let octave = parseInt(midiNote.slice(-1));

    if (_initial_transpose != 0 && (midiType == "NoteOn" || midiType == "NoteOff")) {
        if (_initial_transpose < 0)
            octave -= 1;
        //if(_initial_transpose > 0 && note == "B")
        //   octave += 1;

        let idx = _notes.indexOf(note);
        let newpos = idx + (_initial_transpose > 0 ? _initial_transpose : 12 + _initial_transpose);
        if (newpos > _notes.length - 1) {
            newpos = newpos - 12;
            octave += 1;
        }
        midiNote = _notes[newpos] + "" + octave;

    }


    if (midiType == "NoteOn") {


        if (octave >= 5)
            midiVelOrFunc *= 0.9; //improve sensibility for highest notes

        abilitySample.playKey(midiNote, midiVelOrFunc, _pianovolume, 0, 0, 0);
     

        abilityCore.sendMidiToVst(0, "NoteOn", midiNote, midiVelOrFunc);
        /*
        if(octave == 6)
            setPadsToneByNote(midiNote.slice(0, -1) );
        */

        //checkChord(midiNote);


        //console.log(midiVelOrFunc* (_efx2volume/100));

        abilitySample.playKey(midiNote + ".EFX2", midiVelOrFunc * (_efx2volume / 100), 100, 0, 0, 0);

        if (disableKeyRedraw === undefined)
            selectKey(midiNote);

        if (_auto_chord_pad)
            processChord();
        //setTimeout(processChord,50); //delayed 100ms to check if notes is pressed for more than 100 ms

    }
    else if (midiType == "NoteOff") {
        abilitySample.stopKey(midiNote, 100);

        abilityCore.sendMidiToVst(0, "NoteOff", midiNote, 0);
        abilityCore.sendMidiToVst(0, "NoteOff", midiNote, 0);

        unselectKey(midiNote);
    }
    else if (midiType == "ControlChange") {
        let func = midiNote;
        let value = midiVelOrFunc;

        if (func == "Controller Sustain Value") {
            if (value == 127)
                abilitySample.setSustain(1, 100, [], []);
            else {
                abilitySample.setSustain(0, 100, ['SYNTH'], []);
                abilitySample.setSustain(0, 800, [], ['SYNTH']);
            }
        }
        else if (func == "Controller Modulation Value") {

            if (get_shiny_volume_mixer(1) < 0.2)
                goToPadVolume('shinybar2', 'shinyknob2', 1, 25, 300);
            else if (get_shiny_volume_mixer(1) < 0.4)
                goToPadVolume('shinybar2', 'shinyknob2', 1, 50, 100);
            else if (get_shiny_volume_mixer(1) > 0.4 && get_shiny_volume_mixer(1) < 0.4)
                goToPadVolume('shinybar2', 'shinyknob2', 1, 25, 100);
            else
                goToPadVolume('shinybar2', 'shinyknob2', 1, 5, 200);

        }


    }
    else if (midiType == "PitchWheelChange") {
        let func = midiNote;
        let value = midiVelOrFunc;

        if (func == "Pitch") {
            if (value > 10000)
                set_auto_pad(true); ////8192
            else if (value < 6000)
                set_auto_pad(false);
        }

    }

    let midi_map = _midi_mapping.firstOrDefault({ type: midiType, controller: midiNote })
    if (midi_map != null) {

        if (midi_map.element == 'shiny_1') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            setShinyKnob(value0to1, 0, '#shinyknob1', '#shinybar1', _shinyfunction[0]);

        }
        else if (midi_map.element == 'shiny_2') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            setShinyKnob(value0to1, 1, '#shinyknob2', '#shinybar2', _shinyfunction[1]);

        }
        else if (midi_map.element == 'shiny_3') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            setShinyKnob(value0to1, 2, '#shinyknob3', '#shinybar3', _shinyfunction[2]);

        }
        else if (midi_map.element == 'pad_volume_1') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            set_pad_volume_mixer(0, value0to1);

        }
        else if (midi_map.element == 'pad_volume_2') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            set_pad_volume_mixer(1, value0to1);

        }
        else if (midi_map.element == 'pad_volume_3') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            set_pad_volume_mixer(2, value0to1);

        }
        else if (midi_map.element == 'pad_volume_4') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            set_pad_volume_mixer(3, value0to1);

        }
        else if (midi_map.element == 'pad_volume_5') {

            let value0to1 = scaleBetween(midiVelOrFunc, 0, 1, midi_map.minvalue, midi_map.maxvalue);
            set_pad_volume_mixer(4, value0to1);

        }

    }

}

function processChord() {


    let notesListSorted = [];
    abilitySample.soundsPlaying().filter(function (str) { return str.indexOf('EFX') === -1 && str.indexOf('pad') === -1; }).forEach(function (midiNote) {
        let note = midiNote.slice(0, -1);
        let octave = midiNote.slice(-1);
        notesListSorted.push({ oct: octave, note: _notes.indexOf(note) }); //consider ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    });

    notesListSorted.sort(function (a, b) {
        return a.oct - b.oct || a.note - b.note;
    })

    if (notesListSorted.length > 0) {

        if (notesListSorted[0].note == 0 && $.grep(notesListSorted, function (e) { return e.note == 7; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("C");
        } else if (notesListSorted[0].note == 1 && $.grep(notesListSorted, function (e) { return e.note == 8; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("C#");
        } else if (notesListSorted[0].note == 2 && $.grep(notesListSorted, function (e) { return e.note == 9; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("D");
        } else if (notesListSorted[0].note == 3 && $.grep(notesListSorted, function (e) { return e.note == 10; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("D#");
        } else if (notesListSorted[0].note == 4 && $.grep(notesListSorted, function (e) { return e.note == 11; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("E");
        } else if (notesListSorted[0].note == 5 && $.grep(notesListSorted, function (e) { return e.note == 0; }).length > 0) {
            _force_reduce_pads_volume = 1.0;
            setPadsToneByNote("F");
        } else if (notesListSorted[0].note == 6 && $.grep(notesListSorted, function (e) { return e.note == 1; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("F#", true);
            setPadsTone(6);
        } else if (notesListSorted[0].note == 7 && $.grep(notesListSorted, function (e) { return e.note == 2; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("G", true);
            setPadsTone(7);
        } else if (notesListSorted[0].note == 8 && $.grep(notesListSorted, function (e) { return e.note == 3; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("G#", true);
            setPadsTone(8);
        } else if (notesListSorted[0].note == 9 && $.grep(notesListSorted, function (e) { return e.note == 4; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("A", true);
            setPadsTone(9);
        } else if (notesListSorted[0].note == 10 && $.grep(notesListSorted, function (e) { return e.note == 5; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("A#", true);
            setPadsTone(10);
        } else if (notesListSorted[0].note == 11 && $.grep(notesListSorted, function (e) { return e.note == 6; }).length > 0) {
            _force_reduce_pads_volume = 0.6;
            setPadsVolume();
            setPadsToneByNote("B0", true);
            setPadsTone(11);
        }

        /*
                }else if( notesListSorted[0].note == 2  && ( $.grep(notesListSorted, function(e){ return e.note == 6; }).length > 0 || ($.grep(notesListSorted, function(e){ return e.note == 7; }).length > 0 && !$.grep(notesListSorted, function(e){ return e.note == 5; }).length > 0) )  ){
                    _force_reduce_pads_volume = 1.0;
                    setPadsToneByNote("D");
                }else if( notesListSorted[0].note == 9 &&  ( $.grep(notesListSorted, function(e){ return e.note == 1; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 2; }).length > 0)  ){
                    _force_reduce_pads_volume = 0.6;
                    setPadsVolume();
                    setPadsToneByNote("A",true);
                    setPadsTone(9);
                }else if( notesListSorted[0].note == 7 &&  ( $.grep(notesListSorted, function(e){ return e.note == 10; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 10; }).length > 0)  ){
                    _force_reduce_pads_volume = 0.6;
                    setPadsVolume();
                    setPadsToneByNote("G",true);
                    setPadsTone(7);
                }else if( notesListSorted[0].note == 6  && ( $.grep(notesListSorted, function(e){ return e.note == 10; }).length > 0 || ($.grep(notesListSorted, function(e){ return e.note == 11; }).length > 0 && !$.grep(notesListSorted, function(e){ return e.note == 5; }).length > 0) )  ){
                    _force_reduce_pads_volume = 0.6;
                    setPadsVolume();
                    setPadsToneByNote("F#",true);
                    setPadsTone(6);
                }else if( notesListSorted[0].note == 6 &&  ( $.grep(notesListSorted, function(e){ return e.note == 6; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 1; }).length > 0)  ){
                    _force_reduce_pads_volume = 0.6;
                    setPadsVolume();
                    setPadsToneByNote("A",true);
                    setPadsTone(9);
                }else if( notesListSorted[0].note == 1 &&  ( $.grep(notesListSorted, function(e){ return e.note == 6; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 1; }).length > 0)  ){
                    _force_reduce_pads_volume = 0.6;
                    setPadsVolume();
                    setPadsToneByNote("A",true);
                    setPadsTone(9);
                }else if( notesListSorted[0].note == 8 &&  ( $.grep(notesListSorted, function(e){ return e.note == 4; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 11; }).length > 0)  ){
                    setPadsToneByNote("E");
                }else if( notesListSorted[0].note == 4 &&  ( $.grep(notesListSorted, function(e){ return e.note == 9; }).length > 0 || $.grep(notesListSorted, function(e){ return e.note == 11; }).length > 0)  ){
                    _force_reduce_pads_volume = 1.0;
                    setPadsToneByNote("E");
                }else
                  
        */



        console.log(notesListSorted);
    }

}

function set_pad_volume_mixer(pos, value) {

    SharedVariable.Write("mixer_pos_" + pos, value.toString());
    _initial_padvolume_mixer[pos] = value;
}

function get_pad_volume_mixer(pos) {

    let val = SharedVariable.Read("mixer_pos_" + pos);
    return parseFloat(val);
}

function set_pad_mute_mixer(pos, value) {

    SharedVariable.Write("mixer_mute_pos_" + pos, value.toString());
    _initial_padmute_mixer[pos] = value;
}

function get_pad_mute_mixer(pos) {

    let val = SharedVariable.Read("mixer_mute_pos_" + pos);
    return val;
}

function set_pad_solo_mixer(pos, value) {

    SharedVariable.Write("mixer_solo_pos_" + pos, value.toString());
    _initial_padsolo_mixer[pos] = value;

}

function get_pad_solo_mixer(pos) {

    let val = SharedVariable.Read("mixer_solo_pos_" + pos);
    return val;
}

function set_shiny_volume_mixer(pos, value) {

    SharedVariable.Write("shiny_pos_" + pos, value.toString());
    _initial_shinyvolume[pos] = value;

}

function get_shiny_volume_mixer(pos) {

    let val = SharedVariable.Read("shiny_pos_" + pos);
    return parseFloat(parseFloat(val).toFixed(2));
}

function set_auto_pad(enabled) {

    _auto_chord_pad = enabled;
    if (enabled) {
        $("#pad_auto").css('background', 'linear-gradient(180deg,rgb(0, 215, 230), rgb(1, 160, 172))');
        $("#pad_manual").css('background', 'linear-gradient(160deg,rgb(95, 95, 95),rgb(53, 53, 53)) ');
    }
    else {
        $("#pad_manual").css('background', 'linear-gradient(180deg,rgb(0, 215, 230), rgb(1, 160, 172))');
        $("#pad_auto").css('background', 'linear-gradient(160deg,rgb(95, 95, 95),rgb(53, 53, 53)) ');
    }

}


function set_transpose(value) {



    let transp = 0;
    if (value == 999)
        transp = _initial_transpose + 1;
    else if (value == -999)
        transp = _initial_transpose - 1;
    else if (value == 9999)
        transp = _initial_transpose + 12;
    else if (value == -9999)
        transp = _initial_transpose - 12;
    else
        transp = value;

    if (transp < -12 || transp > 12)
        return;

    SharedVariable.Write("transpose", transp.toString());
    _initial_transpose = transp;

    let newpos = (transp >= 0 ? transp : 12 + transp);
    if (newpos > _notes.length - 1)
        newpos = 12 - newpos;

    $("#transpose_id").val(_notes[newpos] + " (" + transp + ")");

}

function get_transpose() {

    let val = SharedVariable.Read("shiny_pos_" + pos);
    return parseInt(val);
}

//

function midi_mapping(control) {

    $("#midimappingmodallabel").html('Set Midi Controller: ' + control);

    let midi_map = _midi_mapping.firstOrDefault({ element: control });


    $("#midi_mapping_condition").html(`

               <span>
                <a onclick="reset_midi_mapping('` + control + `')" class="button"> RESET </a><br>
                <a onclick="set_midi_mapping('` + control + `','type')" class="button"> SET </a> Type: ` + (midi_map == null ? `` : midi_map.type) + `<br>
                <a onclick="set_midi_mapping('` + control + `','controller')" class="button"> SET </a> Controller: ` + (midi_map == null ? `` : midi_map.controller) + `<br>
                <a onclick="set_midi_mapping('` + control + `','minvalue')" class="button"> SET </a> Min Value: ` + (midi_map == null ? `` : midi_map.minvalue) + `<br>
                <a onclick="set_midi_mapping('` + control + `','maxvalue')" class="button"> SET </a> Max Value: ` + (midi_map == null ? `` : midi_map.maxvalue) + `<br>
              </span>

        `);

}

function reset_midi_mapping(control) {

    _midi_mapping = _midi_mapping.filter(function (item) {
        return item.element !== control
    })

    midi_mapping(control);
}

function set_midi_mapping(control, parameter) {

    let midi_map = _midi_mapping.firstOrDefault({ element: control });

    if (midi_map == null) {
        _midi_mapping.push({ element: control, type: '', controller: '', minvalue: 0, maxvalue: 127 })
        midi_map = _midi_mapping.firstOrDefault({ element: control });
    }


    if (parameter == 'type') {
        midi_map.type = _last_midi_event[0];
    }
    else if (parameter == 'controller') {
        midi_map.controller = _last_midi_event[1];
    }
    else if (parameter == 'minvalue') {
        midi_map.minvalue = _last_midi_event[2];
    }
    else if (parameter == 'maxvalue') {
        midi_map.maxvalue = _last_midi_event[2];
    }

    midi_mapping(control);
}


function goToPadVolume(shinyBarId, shinyKnobId, shinyPos, volume, interval) {

    let vol = get_shiny_volume_mixer(shinyPos);
    let incdec = '';
    if (vol > (volume / 100))
        incdec = 'dec';
    else
        incdec = 'inc';

    clearInterval(_intervals["interval_" + shinyBarId]);

    $('#' + shinyKnobId).attr('isupdating', 'yes');
    _intervals["interval_" + shinyBarId] = setInterval(function () {
        setShinyKnob(vol, shinyPos, '#' + shinyKnobId, '#' + shinyBarId, _shinyfunction[shinyPos]);

        if (incdec == 'inc') {
            vol = vol + 0.01;
            if ((volume / 100) <= vol) {
                $('#' + shinyKnobId).attr('isupdating', 'no');
                clearInterval(_intervals["interval_" + shinyBarId]);
            }
        }
        else {
            vol = vol - 0.01;
            if ((volume / 100) >= vol) {
                $('#' + shinyKnobId).attr('isupdating', 'no');
                clearInterval(_intervals["interval_" + shinyBarId]);
            }
        }


    }, (interval !== undefined ? interval : 50));

}

function setPadsTone(padSemitones, force) {

    if (_current_padsemitones == padSemitones && force === undefined)
        return;

    _current_padsemitones = padSemitones;



    for (let i = 0; i < 5; i++)
        abilitySample.setSoundPitch("pad00" + (i + 1), padSemitones);


}

function setPadsToneByNote(notestr, onlysetpadbutton) {


    $(".pad").each(function () {
        $(this).removeClass('padselected');
    });
    $("#pad_" + notestr.replace("#", "s")).addClass('padselected');

    if (onlysetpadbutton !== undefined)
        return;

    notes = ["F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F"];
    setPadsTone(notes.indexOf(notestr) - 6);

}



function isNumeric(value) {
    return /^-?\d+$/.test(value);
}

function modal_alert(modallabel, modalbody) {
    $("#alertmodallabel").html(modallabel);
    $("#alertmodalbody").html(modalbody);
}

function saveSettings() {

    let current_settings = {
        initial_padvolume_mixer: _initial_padvolume_mixer,
        initial_padsolo_mixer: _initial_padsolo_mixer,
        initial_padmute_mixer: _initial_padmute_mixer,
        initial_shinyvolume: _initial_shinyvolume,
        midi_mapping: _midi_mapping,
        eq_master: _eq_master,
        eq_pad: _eq_pad,
        initial_transpose: _initial_transpose,
        current_padsemitones: _current_padsemitones,
        vst_scenario: abilityCore.getVstScenario()
    };



    let cur_music = $(".music_select_class").val();
    let cur_sound = $(".sound_select_class").val();



    if (cur_music == null) {
        _settings = [];
    }
    else {
        let music_obj = _settings.firstOrDefault({ music: cur_music });

        let new_sound = { sound: cur_sound, settings: current_settings };

        if (music_obj == null) {
            _settings.push({ music: cur_music, sounds: [new_sound] });
        }
        else {

            let sound_obj = music_obj.sounds.firstOrDefault({ sound: cur_sound });
            if (sound_obj === null) {
                new_sound.selected = true;
                music_obj.sounds.push(new_sound);
            }
            else {
                sound_obj.selected = true;
                sound_obj.settings = current_settings;
            }

        }

    }

    abilityCore.setTextFile(_settings_file_path, JSON.stringify(_settings));

}

function loadSettings() {

    let music_select = '.music_select_class';
    let sound_select = '.sound_select_class';

    //if (typeof abilityCore != 'undefined')
    //    abilityCore.setLoading(false);

    if (typeof abilityCore == 'undefined')
        return;


    
   abilityCore.loadVstDlls(JSON.stringify(
           [
              {path:"@InstrumentFolder@\\TAL-Reverb-2-64.dll",name:"TAL-Reverb-2",fpxbase64:""}
           ]));
   

    _settings_file_path = abilitySample.getIntrumentsDir() + "\\" + abilitySample.getCurrentInstrumentDir() + "\\settings.abs";

    if (abilityCore.fileExists(_settings_file_path) == 0)
        return;

    _settings = JSON.parse(abilityCore.getTextFile(_settings_file_path));

    fill_bank_items();
    fill_sound_items();



    let cur_music = $(music_select).val();
    let cur_sound = $(sound_select).val();

    let music_obj = _settings.firstOrDefault({ music: cur_music });
    if (music_obj !== null) {

        let sound_obj = music_obj.sounds.firstOrDefault({ sound: cur_sound });
        if (sound_obj !== null) {

            _initial_padvolume_mixer = sound_obj.settings.initial_padvolume_mixer;
            _initial_padsolo_mixer = sound_obj.settings.initial_padsolo_mixer;
            _initial_padmute_mixer = sound_obj.settings.initial_padmute_mixer;
            _initial_shinyvolume = sound_obj.settings.initial_shinyvolume;
            _midi_mapping = sound_obj.settings.midi_mapping;
            _eq_master = sound_obj.settings.eq_master;
            _eq_pad = sound_obj.settings.eq_pad;
            _initial_transpose = sound_obj.settings.initial_transpose;
            _current_padsemitones = sound_obj.settings.current_padsemitones;


            if (abilityCore.reloadFromCore() == "no")
                abilityCore.setVstScenario(sound_obj.settings.vst_scenario, "");
            else
                abilityCore.setVstScenario(sound_obj.settings.vst_scenario, "yes"); //when reload only, without set vst list

        }
    }
    else {
        abilityCore.setVstScenario([], "yes"); //when reload only
    }

    abilityCore.loadVstVisual();

}

function fill_bank_items() {

    let music_select = '.music_select_class';
    let sound_select = '.sound_select_class';

    $(music_select)
        .find('option')
        .remove()
        .end();

    $(sound_select)
        .find('option')
        .remove()
        .end();


    _settings.forEach(function (musicObj) {

        $(music_select).append($('<option>', {
            value: musicObj.music,
            text: musicObj.music
        }));

        musicObj.sounds.forEach(function (soundObj) {
            if (soundObj.selected !== undefined)
                if (soundObj.selected == true) {
                    $(music_select).val(musicObj.music);
                }
        });

    });

}

function fill_sound_items() {

    let music_select = '.music_select_class';
    let sound_select = '.sound_select_class';

    $(sound_select)
        .find('option')
        .remove()
        .end();

    let cur_music = $(music_select).val();

    let music_obj = _settings.firstOrDefault({ music: cur_music });
    if (music_obj === null)
        return;

    music_obj.sounds.forEach(function (soundObj) {

        if (soundObj.sound === null)
            return;

        $(sound_select).append($('<option>', {
            value: soundObj.sound,
            text: soundObj.sound
        }));

        if (soundObj.selected !== undefined)
            if (soundObj.selected == true) {
                $(sound_select).val(soundObj.sound);
                soundObj.selected = false;
                sound_click($("#sound_select_id_modal"));
            }
    });

}

function create_new_bank(existsNumber) {

    let newBankName = 'New Bank' + (existsNumber !== undefined ? ' ' + existsNumber : "");
    let music_obj = _settings.firstOrDefault({ music: newBankName });
    if (music_obj !== null) {
        if (existsNumber !== undefined)
            existsNumber++;
        else
            existsNumber = 2;
        create_new_bank(existsNumber);
        return;
    }

    _settings.push({
        music: newBankName,
        sounds: []
    })

    fill_bank_items();


}

function create_new_sound(existsNumber) {

    let music_select = '.music_select_class';

    let newSoundName = 'New Sound' + (existsNumber !== undefined ? ' ' + existsNumber : "");

    let cur_music = $(music_select).val();
    let music_obj = _settings.firstOrDefault({ music: cur_music });
    if (music_obj === null)
        return;

    let sound_obj = music_obj.sounds.firstOrDefault({ sound: newSoundName });
    if (sound_obj !== null) {
        if (existsNumber !== undefined)
            existsNumber++;
        else
            existsNumber = 2;
        create_new_sound(existsNumber);
        return;
    }


    $('.sound_select_class').append($('<option>', {
        value: newSoundName,
        text: newSoundName,
    }));

    $('.sound_select_class').val(newSoundName);

    saveSettings();

}

function bank_sound_type_change() {

    let curtype = $('#sel_bank_sound_name').attr('curtype');
    let curname = $('#sel_bank_sound_name').attr('curname');
    let valnew = $('#sel_bank_sound_name').val();
    $('#sel_bank_sound_name').attr('curname', valnew);

    if (curtype == "Bank") {
        let music_obj = _settings.firstOrDefault({ music: curname });
        music_obj.music = valnew;
        fill_bank_items();
        saveSettings();

    }
    else if (curtype == "Sound") {
        let music_select = '#music_select_id_modal';
        let cur_music = $(music_select).val();
        let music_obj = _settings.firstOrDefault({ music: cur_music });

        if (music_obj === null)
            return;

        let sound_obj = music_obj.sounds.firstOrDefault({ sound: curname });
        sound_obj.sound = valnew;
        fill_sound_items();
        saveSettings();
    }
}

function bank_click(el) {

    $('#sel_bank_sound_type').val("Bank");
    $('#sel_bank_sound_name').val($(el).val());

    $('#sel_bank_sound_name').attr('curtype', 'Bank');
    $('#sel_bank_sound_name').attr('curname', $(el).val());

}

function sound_click(el) {

    $('#sel_bank_sound_type').val("Sound");
    $('#sel_bank_sound_name').val($(el).val());

    $('#sel_bank_sound_name').attr('curtype', 'Sound');
    $('#sel_bank_sound_name').attr('curname', $(el).val());
}

function bank_changed(el) {

    $('.music_select_class').val($(el).val());
    fill_sound_items();

}

function sound_changed(el, ignorereload) {


    if (ignorereload !== undefined)
        return;

    $('.sound_select_class').val($(el).val());

    let music_select = '.music_select_class';

    let cur_music = $(music_select).val();


    let music_obj = _settings.firstOrDefault({ music: cur_music });
    if (music_obj === null)
        return;

    let sound_obj = music_obj.sounds.firstOrDefault({ sound: $(el).val() });
    if (sound_obj === null)
        return;

    sound_obj.selected = true;
    abilityCore.setTextFile(_settings_file_path, JSON.stringify(_settings));


    abilityCore.reload(0);

}

function delete_bank() {

    let music_select = '.music_select_class';

    let cur_music = $(music_select).val();

    _settings = _settings.filter(function (obj) {
        return obj.music != cur_music && obj.music != null;
    });


    fill_bank_items();
    saveSettings();

}

function delete_sound() {

    let music_select = '.music_select_class';
    let sound_select = '.sound_select_class';

    let cur_music = $(music_select).val();
    let cur_sound = $(sound_select).val();

    let music_obj = _settings.firstOrDefault({ music: cur_music });
    if (music_obj === null)
        return;

    music_obj.sounds = $.grep(music_obj.sounds, function (e) {
        return e.sound != cur_sound;
    });

    fill_sound_items();
    saveSettings();

}


function openScripts() {
    abilitySample.openInstrumentFolder();
}





function playPad(value, ramp, lastpadpos) {

    if (typeof abilitySample == 'undefined')
        return;

    if (value > 0.01) {

        for (let i = 0; i < (lastpadpos !== undefined ? lastpadpos : 5); i++)
            if (!abilitySample.isSoundPlaying("pad00" + (i + 1))) {
                abilitySample.playSound("pad00" + (i + 1), Math.floor(value * 100 / 128), (ramp !== undefined ? ramp : 250), 15000, 0);

            }
            else {
                set_shiny_volume_mixer(1, value); //0 - 1
                setPadsVolume();

            }

    }
    else {
        for (let i = 0; i < (lastpadpos !== undefined ? lastpadpos : 5); i++)
            abilitySample.stopSound("pad00" + (i + 1), (ramp !== undefined ? ramp : 2000));
    }



}

function setPadsVolume(padnumber) {

    let hasSolo = false;
    for (let i = 0; i < 5; i++)
        if (mixer_fader_solo("fader" + (i + 1)))
            hasSolo = true;

    for (let i = 0; i < 5; i++)
        if (padnumber === undefined || i == padnumber || hasSolo)
            if (!mixer_fader_mute("fader" + (i + 1)) && (!hasSolo || mixer_fader_solo("fader" + (i + 1)))) {
                if (typeof abilitySample != "undefined")
                    abilitySample.setSoundVolume("pad00" + (i + 1), 100 * get_shiny_volume_mixer(1) * get_pad_volume_mixer(i) * _force_reduce_pads_volume);
            }
            else
                if (typeof abilitySample != "undefined")
                    abilitySample.setSoundVolume("pad00" + (i + 1), 0);


}




function scaleBetween(unscaledNum, minAllowed, maxAllowed, min, max) {
    return (maxAllowed - minAllowed) * (unscaledNum - min) / (max - min) + minAllowed;
}

function selectKey(keyName) {

    let elem = document.getElementById(keyName);
    elem.classList.add('whiteactive');

}

function unselectKey(keyName) {

    let elem = document.getElementById(keyName);
    elem.classList.remove('whiteactive');

}

function drawKeys() {

    var qtyOcts = 8;

    var piano = document.getElementById("piano_keys");
    piano.onmouseup = function () {
        for (let i = 1; i <= qtyOcts; i++) {
            _notes.forEach(function (note) {
                playKey("NoteOff", note + i, 0);
            });
        }
    };

    for (let i = 1; i <= qtyOcts; i++) {

        _notes.forEach(function (note) {
            var li = document.createElement("li");
            li.id = note + i; //C3
            li.className = (note.includes("#") ? "black" : "white") + " " + note;
            li.onmousedown = function () {
                playKey("NoteOn", this.id, 80, true);
            };
            piano.appendChild(li);
        });

    }

}


function loadRotary() {

    var rotarySwitch3a = $('.rotarySwitch3a').rotaryswitch({
        beginDeg: 270,
        lengthDeg: 180,
        minimum: -30,
        maximum: 30,
        step: 1.0,
        showMarks: true,
        val: 0
    });

    $("#eq_high_master").val(_eq_master[2]).change();
    $("#eq_high_master_ind").html(_eq_master[2] + " db");
    $("#eq_mid_master").val(_eq_master[1]).change();
    $("#eq_mid_master_ind").html(_eq_master[1] + " db");
    $("#eq_low_master").val(_eq_master[0]).change();
    $("#eq_low_master_ind").html(_eq_master[0] + " db");

    $("#eq_high_pad").val(_eq_pad[2]).change();
    $("#eq_high_pad_ind").html(_eq_pad[2] + " db");
    $("#eq_mid_pad").val(_eq_pad[1]).change();
    $("#eq_mid_pad_ind").html(_eq_pad[1] + " db");
    $("#eq_low_pad").val(_eq_pad[0]).change();
    $("#eq_low_pad_ind").html(_eq_pad[0] + " db");

    rotarySwitch3a.on('change', function () {
        //console.log('rotarySwitch3a', $(this).attr('id') );
        //rotarySwitch3b.val(rotarySwitch3a.val()).change();

        $("#" + $(this).attr('id') + "_ind").html($(this).val() + " db");

        if ($(this).attr('id') === 'eq_high_master') {
            _eq_master[2] = $(this).val();
            setMasterEq();
        }
        else if ($(this).attr('id') === 'eq_mid_master') {
            _eq_master[1] = $(this).val();
            setMasterEq();
        }
        else if ($(this).attr('id') === 'eq_low_master') {
            _eq_master[0] = $(this).val();
            setMasterEq();
        }


        if ($(this).attr('id') === 'eq_high_pad') {
            _eq_pad[2] = $(this).val();
            setPadEq();
        }
        else if ($(this).attr('id') === 'eq_mid_pad') {
            _eq_pad[1] = $(this).val();
            setPadEq();
        }
        else if ($(this).attr('id') === 'eq_low_pad') {
            _eq_pad[0] = $(this).val();
            setPadEq();
        }


    });

}

function setMasterEq() {

    abilitySample.setMasterEqualizer(JSON.stringify(
        [
            { Frequency: 100, Gain: _eq_master[0], Bandwidth: 0.8 },
            { Frequency: 200, Gain: 0, Bandwidth: 0.8 },
            { Frequency: 400, Gain: 0, Bandwidth: 0.8 },
            { Frequency: 800, Gain: _eq_master[1], Bandwidth: 0.8 },
            { Frequency: 1200, Gain: _eq_master[1], Bandwidth: 0.8 },
            { Frequency: 2400, Gain: _eq_master[1], Bandwidth: 0.8 },
            { Frequency: 4800, Gain: _eq_master[2], Bandwidth: 0.8 },
            { Frequency: 9600, Gain: _eq_master[2], Bandwidth: 0.8 }
        ]));

}

function setPadEq() {


    for (let i = 0; i < 5; i++)
        abilitySample.setSoundEqualizer("pad00" + (i + 1), JSON.stringify(
            [
                { Frequency: 100, Gain: _eq_pad[0], Bandwidth: 0.8 },
                { Frequency: 200, Gain: _eq_pad[0], Bandwidth: 0.8 },
                { Frequency: 400, Gain: 0, Bandwidth: 0.8 },
                { Frequency: 800, Gain: _eq_pad[1], Bandwidth: 0.8 },
                { Frequency: 1200, Gain: _eq_pad[1], Bandwidth: 0.8 },
                { Frequency: 2400, Gain: _eq_pad[1], Bandwidth: 0.8 },
                { Frequency: 4800, Gain: _eq_pad[2], Bandwidth: 0.8 },
                { Frequency: 9600, Gain: _eq_pad[2], Bandwidth: 0.8 }
            ]));


}


function mixer_fader_mute(id, active) {

    if (active === undefined)
        return $("#" + id).find(".mute").hasClass("muteactive");

    try {

        let selmute = $("#" + id).find(".mute");
        let faderNumber = parseInt(id.substr(id.length - 1));


        if (active == 1)
            selmute.addClass('muteactive');
        else if (active == 0)
            selmute.removeClass('muteactive');
        else if (active == -1) //toggle
            selmute.toggleClass('muteactive');

        if ($("#" + id).find(".mute").hasClass("muteactive"))
            set_pad_mute_mixer(faderNumber - 1, '1');
        else
            set_pad_mute_mixer(faderNumber - 1, '0');

        setPadsVolume(faderNumber - 1);

    } catch (err) { }
}

function mixer_fader_solo(id, active) {

    if (active === undefined)
        return $("#" + id).find(".solo").hasClass("soloactive");

    try {

        let selmute = $("#" + id).find(".solo");
        let faderNumber = parseInt(id.substr(id.length - 1));

        if (active == 1)
            selmute.addClass('soloactive');
        else if (active == 0)
            selmute.removeClass('soloactive');
        else if (active == -1) //toggle
            selmute.toggleClass('soloactive');



        if ($("#" + id).find(".solo").hasClass("soloactive"))
            set_pad_solo_mixer(faderNumber - 1, '1');
        else
            set_pad_solo_mixer(faderNumber - 1, '0');

        setPadsVolume();

    } catch (err) { }
}



async function loadMixer() {


    if (typeof _isMobile == "undefined")
        for (let i = 0; i < 5; i++) {
            set_pad_volume_mixer(i, _initial_padvolume_mixer[i]);
            mixer_fader_solo("fader" + (i + 1), _initial_padsolo_mixer[i]);
            mixer_fader_mute("fader" + (i + 1), _initial_padmute_mixer[i]);
        }



    var el = {},

        setEls = function () {
            el.faders = $('.fader');
        },

        events = function () {
            $('.fader').on('input', function (e) { //change //input is when is the value changing
                setDBDisplays($(this));
            });

            $('.fader').on('mousedown', function (e) { //change //input is when is the value changing
                $(this).attr('isupdating', 'yes');
            });

            $('.fader').on('mouseup', function (e) { //change //input is when is the value changing
                $(this).attr('isupdating', 'no');
            });

            $('.upper-controls button').on('click', function () {
                if ($(this).hasClass('solo')) {
                    //SharedVariable.Write("variavel1","OK");
                    mixer_fader_solo($(this).parent().parent().attr('id'), -1);
                }
                else if ($(this).hasClass('mute')) {
                    //SharedVariable.Write("variavel1","NOT");
                    mixer_fader_mute($(this).parent().parent().attr('id'), -1);
                }
            });


        },

        setDBDisplays = function ($this) {
            var lvl = $this.val(),
                display = $this.siblings($('.lvl-display'));

            let mult = (parseFloat($this.val()) + 80.0) / 100; //0.0 to 1.0

            switch ($this.attr('id')) {
                case "track1":
                    set_pad_volume_mixer(0, mult);
                    setPadsVolume(0);
                    break;
                case "track2":
                    set_pad_volume_mixer(1, mult);
                    setPadsVolume(1);
                    break;
                case "track3":
                    set_pad_volume_mixer(2, mult);
                    setPadsVolume(2);
                    break;
                case "track4":
                    set_pad_volume_mixer(3, mult);
                    setPadsVolume(3);
                    break;
                case "track5":
                    set_pad_volume_mixer(4, mult);
                    setPadsVolume(4);
                    break;


            }

            if ($this.val() < -75) {
                display.val('-∞ dB').text();
            } else {
                if (lvl < 0) {
                    lvl = lvl + ' dB';
                } else if (lvl > 0) {
                    lvl = '+' + lvl + ' db';
                } else {
                    lvl = lvl + ' db';
                }
                display.val(lvl);
            }

        },

        init = async function () {


            setEls();
            events();

            let interval = 250;
            if (typeof _isMobile != "undefined")
                interval = 250;


            setInterval(async function () {

                for (let i = 0; i < 5; i++) {

                    if ($("#track" + (i + 1)).attr("isupdating") != "yes") {

                        $("#track" + (i + 1)).val((get_pad_volume_mixer(i) * 100) - 80);
                        setDBDisplays($("#track" + (i + 1)));

                    }

                    if (get_pad_solo_mixer(i) == '1')
                        mixer_fader_solo("fader" + (i + 1), 1);
                    else
                        mixer_fader_solo("fader" + (i + 1), 0);

                    if (get_pad_mute_mixer(i) == '1')
                        mixer_fader_mute("fader" + (i + 1), 1);
                    else
                        mixer_fader_mute("fader" + (i + 1), 0);


                }

                for (let i = 0; i < 3; i++) {

                    if ($("#shinyknob" + (i + 1)).attr("isupdating") != "yes") {

                        let shiny_from_shared = get_shiny_volume_mixer(i);
                        if (_initial_shinyvolume[i] != shiny_from_shared) {

                            _initial_shinyvolume[i] = shiny_from_shared;
                            setShinyKnob(_initial_shinyvolume[i], i, '#shinyknob' + (i + 1), '#shinybar' + (i + 1), _shinyfunction[i]);
                        }


                    }

                }

            }, interval);


        };



    init();






    // tell the embed parent frame the height of the content
    if (window.parent && window.parent.parent) {
        window.parent.parent.postMessage(["resultsFrame", {
            height: document.body.getBoundingClientRect().height,
            slug: "z4jZM"
        }], "*")
    }

    // always overwrite window.name, in case users try to set it manually
    window.name = "result"

    let allLines = []

    window.addEventListener("message", (message) => {
        if (message.data.console) {
            let insert = document.querySelector("#insert")
            allLines.push(message.data.console.payload)
            insert.innerHTML = allLines.join(";\r")

            let result = eval.call(null, message.data.console.payload)
            if (result !== undefined) {
                console.log(result)
            }
        }
    })



}

function loadShiny() {

    var colors = [
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)",
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)",
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)",
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)",
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)",
        "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)", "rgba(73,177,202,1.0)"
    ];

    $('.shinyknobcontrol').on('mousedown', function (e) { //change //input is when is the value changing
        $(this).attr('isupdating', 'yes');
    });

    $('.shinyknobcontrol').on('mouseup', function (e) { //change //input is when is the value changing
        $(this).attr('isupdating', 'no');
    });


    var rad2deg = 180 / Math.PI;
    var deg = 0;

    var bars1 = $('#shinybar1');
    var bars2 = $('#shinybar2');
    var bars3 = $('#shinybar3');
    for (var i = 0; i < colors.length; i++) {

        deg = i * 12;

        // Create the colorbars

        $('<div class="colorBar">').css({
            backgroundColor: colors[i],
            'box-shadow': '-2px -2px 10px rgba(73,177,250,1.0)',
            transform: 'rotate(' + deg + 'deg)',
            top: -Math.sin(deg / rad2deg) * 60 + 105,
            left: Math.cos((180 - deg) / rad2deg) * 60 + 105,
        }).appendTo(bars1);

        $('<div class="colorBar">').css({
            backgroundColor: colors[i],
            'box-shadow': '-2px -2px 10px rgba(73,177,250,1.0)',
            transform: 'rotate(' + deg + 'deg)',
            top: -Math.sin(deg / rad2deg) * 60 + 105,
            left: Math.cos((180 - deg) / rad2deg) * 60 + 105,
        }).appendTo(bars2);

        $('<div class="colorBar">').css({
            backgroundColor: colors[i],
            'box-shadow': '-2px -2px 10px rgba(73,177,250,1.0)',
            transform: 'rotate(' + deg + 'deg)',
            top: -Math.sin(deg / rad2deg) * 60 + 105,
            left: Math.cos((180 - deg) / rad2deg) * 60 + 105,
        }).appendTo(bars3);
    }


    for (let i = 0; i < 3; i++) {
        if (typeof _isMobile == "undefined") {
            set_shiny_volume_mixer(i, _initial_shinyvolume[i]);
        }
        setShinyKnob(_initial_shinyvolume[i], i, '#shinyknob' + (i + 1), '#shinybar' + (i + 1), _shinyfunction[i]);
    }



}

function setShinyKnob(volume, shinyvolumepos, knobid, barid, command) {

    let colorBars3 = $(barid).find('.colorBar');
    let lastNum3;
    let numBars3;



    $(knobid).knobKnob({
        snap: 10,
        value: Math.min(359, volume * 360),
        turn: function (ratio) {
            numBars3 = Math.round(colorBars3.length * ratio);

            // Update the dom only when the number of active bars
            // changes, instead of on every move

            if (numBars3 == lastNum3) {
                return false;
            }
            lastNum3 = numBars3;

            set_shiny_volume_mixer(shinyvolumepos, ratio);

            if (command == 'playpad')
                playPad(get_shiny_volume_mixer(shinyvolumepos));

            if (command == 'efx2volume')
                _efx2volume = Math.floor(get_shiny_volume_mixer(shinyvolumepos) * 100);

            if (command == 'pianovolume')
                _pianovolume = Math.floor(get_shiny_volume_mixer(shinyvolumepos) * 100);

            ////console.log(ratio);

            colorBars3.removeClass('active').slice(0, numBars3).addClass('active');
        }
    });

}




Array.prototype.where = function (filter) {

    var collection = this;

    switch (typeof filter) {

        case 'function':
            return $.grep(collection, filter);

        case 'object':
            for (var property in filter) {
                if (!filter.hasOwnProperty(property))
                    continue; // ignore inherited properties

                collection = $.grep(collection, function (item) {
                    return item[property] === filter[property];
                });
            }
            return collection.slice(0); // copy the array 
        // (in case of empty object filter)

        default:
            throw new TypeError('func must be either a' +
                'function or an object of properties and values to filter by');
    }
};


Array.prototype.firstOrDefault = function (func) {
    return this.where(func)[0] || null;
};
