/***************************************************************************
 *   Copyright (C) 2017, Paul Lutus                                        *
 * https://arachnoid.com/morse_code/index.html                             *
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program; if not, write to the                         *
 *   Free Software Foundation, Inc.,                                       *
 *   59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.             *
 ***************************************************************************/

var Morse = Morse || {}

Morse.id = function(ss) {
  return document.getElementById(ss);
}

Morse.mdict = {
  "!" : "---.",
  "\"" : ".-..-.",
  "$" : "...-..-",
  "'" : ".----.",
  "/" : "-..-.",
  "(" : "-.--.",
  ")" : "-.--.-",
  "[" : "-.--.",
  "]" : "-.--.-",
  "+" : ".-.-.",
  "," : "--..--",
  "-" : "-....-",
  "." : ".-.-.-",
  "_" : "..--.-",
  "/" : "-..-.",
  "0" : "-----",
  "1" : ".----",
  "2" : "..---",
  "3" : "...--",
  "4" : "....-",
  "5" : ".....",
  "6" : "-....",
  "7" : "--...",
  "8" : "---..",
  "9" : "----.",
  ":" : "---...",
  ";" : "-.-.-.",
  "=" : "-...-",
  "@" : ".--.-.",
  "?" : "..--..",
  "a" : ".-",
  "b" : "-...",
  "c" : "-.-.",
  "d" : "-..",
  "e" : ".",
  "f" : "..-.",
  "g" : "--.",
  "h" : "....",
  "i" : "..",
  "j" : ".---",
  "k" : "-.-",
  "l" : ".-..",
  "m" : "--",
  "n" : "-.",
  "o" : "---",
  "p" : ".--.",
  "q" : "--.-",
  "r" : ".-.",
  "s" : "...",
  "t" : "-",
  "u" : "..-",
  "v" : "...-",
  "w" : ".--",
  "x" : "-..-",
  "y" : "-.--",
  "z" : "--..",
}

Morse.write_cookie = function() {
  var cvalue = Morse.create_cookie();
  var d = new Date();
  d.setTime(d.getTime() + (90*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = "Morse=" + cvalue + ";" + expires + ";path=/";
}

Morse.read_cookie = function() {
  var decoded_cookie = decodeURIComponent(document.cookie);
  var result = decoded_cookie.replace(/[\s\S]*?Morse=([^;]*)[\s\S]*/m,"$1");
  Morse.decode_cookie(result);
}

Morse.loadContext = function() {
  if (typeof Morse.audio !== 'undefined') {
    Morse.audio.close();
  }
  if (typeof AudioContext !== "undefined") {
    return new AudioContext();
    } else if (typeof webkitAudioContext !== "undefined") {
    return new webkitAudioContext();
    } else if (typeof mozAudioContext !== "undefined") {
    return new mozAudioContext();
  }
  else {
    alert("Sorry! This browser doesn't support the features this program requires.\n\nPlease update or replace your browser.");
    return null;
  }
}

Morse.reset_string = function() {
  if(Morse.target_div != null) {
    Morse.target_div.innerHTML = Morse.string;
    Morse.target_div = null;
  }
}

Morse.reset_all = function() {
  Morse.set_defaults();
  Morse.write_controls();
}

Morse.generate_code_char = function(i,key,output) {
  if(key == '') {
    result = '';
  }
  else {
    var value = Morse.mdict[key];
    skey = key.toUpperCase();
    var skey = skey.replace(/"/g,"&quot;");
    skey = skey.replace(/'/g,"&apos;");
    result = '<td><span class="tc" title="Click me to hear this character" onclick="Morse.send_single_char(' + i + ')">' + skey + ' : ' + value + '</span></td>\n';
  }
  output += '<td>' + result + '</td>';
  return output;
}

Morse.generate_code_list = function() {
  var output = '<style type="text/css">' +
  '.tc {' +
  'font-family:monospace;' +
  'cursor:hand;' +
  'cursor:pointer;' +
  '}</style>';
  output += '<table width="100%">\n';
  keys = Object.keys(Morse.mdict);
  var klen = keys.length;
  Morse.char_keys = [];
  var j = keys.indexOf('a');
  for (var i = 0;i < klen;i++) {
    var k = (i+j) % klen;
    Morse.char_keys.push(keys[k]);
  }
  var cols = 5
  var rows = 13;
  for (var y = 0; y < rows;y++) {
    output += '<tr>';
    for (var x = 0; x < cols;x++) {
      var k = x * rows + y;
      var key = '';
      if(k < klen) {
        key = Morse.char_keys[k];
      }
      output = Morse.generate_code_char(k,key,output);
    }
    output += '</tr>';
  }
  output += '</table>\n';
  Morse.id('code_list').innerHTML = output;
}

Morse.send_single_char = function(k) {
  if(!Morse.busy) {
    Morse.setup();
    Morse.setup_oscillator('sine');
    Morse.busy = true;
    var c = Morse.char_keys[k];
    Morse.send_char(c);
    Morse.busy = false;
  }
  else {
    Morse.stop_process();
  }
}

Morse.set_defaults = function() {

  // These values are derived from
  // https://en.wikipedia.org/wiki/Morse_code
  Morse.dot_constant = 1.2; // units seconds
  // NOTE: these timings are additive
  Morse.dot_time_between_dots_dashes = 1;
  Morse.dot_time_between_characters = 2;
  // The result value between characters
  // is the sum of the above values (2+1) = 3
  Morse.dot_time_between_words = 4;
  // It's the same here -- the result
  // is (4+2+1) = 7
  Morse.speed_wpm = 13;
  Morse.frequency = 750;
  Morse.volume = 1.0;
  Morse.slope_constant = .005;
}

Morse.init = function() {
  Morse.generate_code_list();
  Morse.control_strings = [
  'dot_constant',
  'dot_time_between_dots_dashes',
  'dot_time_between_characters',
  'dot_time_between_words',
  'speed_wpm',
  'frequency',
  'volume',
  'slope_constant'
  ];
  Morse.stop_process();
  // default values
  Morse.set_defaults();
  Morse.high_volume = 1;
  Morse.low_volume = 0;

  // this time constant suppresses keying clicks

  Morse.record_button = Morse.id('record');
  Morse.target_div = null;
  Morse.sanitize_default_text();
  Morse.setup_control_panel();
  Morse.read_cookie();
  Morse.setup();
}

Morse.read_controls = function() {
  var pn = Object.getOwnPropertyNames(Morse);
  for (var i in Morse.control_strings) {
    var tag = Morse.control_strings[i];
    var v = Morse.id(tag).value;
    v = parseFloat(v);
    v = (isNaN(v))?0:v;
    if(tag == 'slope_constant') {
      // this value cannot be zero
      v = Math.max(v,1e-10);
    }
    Morse[tag] = v;
  }
}

Morse.write_controls = function() {
  sum = 0;
  var pn = Object.getOwnPropertyNames(Morse);
  for (var i in Morse.control_strings) {
    var tag = Morse.control_strings[i];
    control = Morse.id(tag);
    control.value = Morse[tag];if(i >= 1 && i <= 3) {
      sum += parseFloat(control.value);
      expl = Morse.id('ex_' + tag);
      expl.innerHTML = '&nbsp; = ' + sum;
    }
  }
}

Morse.create_cookie = function() {
  Morse.read_controls();
  var pn = Object.getOwnPropertyNames(Morse);
  output = [];
  for (var i in Morse.control_strings) {
    var tag = Morse.control_strings[i];
    output[i] = Morse[tag];
  }
  return output;
}

Morse.decode_cookie = function(str) {
  values = str.split(",");
  // test: valid cookie?
  if(values.length == Morse.control_strings.length) {
    var pn = Object.getOwnPropertyNames(Morse);
    for (var i in Morse.control_strings) {
      var tag = Morse.control_strings[i];
      Morse[tag] = parseFloat(values[i]);
    }
    Morse.write_controls();
  }
}

Morse.make_control = function(id) {
  return '<li><span class="control_label">' + id + '</span><input class="control_input" type="text" id="' + id + '"/><span class="description_label" id="ex_' + id + '"></span></li>';
}

Morse.setup_control_panel = function() {
  output = '<ul>';
  for(var i in Morse.control_strings) {
    output += Morse.make_control(Morse.control_strings[i]);
  }
  output += '</ul>';
  Morse.id('controlpanel').innerHTML = output;
  for(var i in Morse.control_strings) {
    control = Morse.id(Morse.control_strings[i]);
    control.addEventListener("keydown", function(e) {
        if (!e) { var e = window.event; }
        if (e.keyCode == 13) { Morse.read_controls(); Morse.write_controls();}
      }, false);
  }
  Morse.write_controls();
}

Morse.setup = function() {
  Morse.times = [];
  Morse.busy = false;
  Morse.index = 0;
  Morse.reset_string();
}

Morse.setup_noise_oscillator = function() {
  var bufferSize = 4 * Morse.audio.sampleRate;
  Morse.noiseBuffer = Morse.audio.createBuffer(1, bufferSize, Morse.audio.sampleRate),
  output = Morse.noiseBuffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  Morse.carrier = Morse.audio.createBufferSource();
  Morse.carrier.buffer = Morse.noiseBuffer;
  Morse.carrier.loop = true;
}

Morse.setup_oscillator = function(osc_type) {
  Morse.audio = Morse.loadContext();
  if(!Morse.audio) {
    return;
  }
  Morse.record_button.disabled = true;
  Morse.read_controls();
  Morse.time = Morse.audio.currentTime;
  Morse.start_time = Morse.time;
  Morse.times.push(Morse.time);
  Morse.vol = Morse.audio.createGain();
  Morse.vol.gain.value = 0;
  if(osc_type == 'noise') {
    Morse.setup_noise_oscillator();
  }
  else {
    var real = new Float32Array(2);
    var imag = new Float32Array(2);
    // set up a cosine waveform
    real[0] = 0;
    imag[0] = 0;
    real[1] = 1;
    imag[1] = 0;
    Morse.carrier = Morse.audio.createOscillator();
    var wave = Morse.audio.createPeriodicWave(real, imag);
    Morse.carrier.setPeriodicWave(wave);
    Morse.carrier.detune.value = 0;
    Morse.carrier.frequency.value = Morse.frequency;
  }
  Morse.carrier.start(0);
  Morse.carrier.connect(Morse.vol);

  Morse.vol.connect(Morse.audio.destination);
  Morse.recording = Morse.record_button.checked;
  if(Morse.recording) {
    if(typeof Morse.audio.createMediaStreamDestination === 'undefined') {
      alert("Sorry! Your browser doesn't support this feature.");
      Morse.recording = false;
      Morse.record_button.checked = false;
    }
    else {
      var dest = Morse.audio.createMediaStreamDestination();
      // connect to the recording buffer in parallel with ordinary playing
      Morse.vol.connect(dest);
      // the data buffer
      Morse.chunks = [];
      Morse.mediaRecorder = new MediaRecorder(dest.stream);
      Morse.mediaRecorder.ondataavailable = function(evt) {
        Morse.chunks.push(evt.data);
      };
      Morse.mediaRecorder.onstop = function(evt) {
        var blob = new Blob(Morse.chunks, { 'type' : 'audio/ogg; codecs=opus' });
        document.querySelector("audio").src = URL.createObjectURL(blob);
      };
    }
  }
  Morse.dot_time = Morse.dot_constant / Morse.speed_wpm;
}

Morse.gen_bit = function(delay,s) {

  // durations are additive:
  // dot-time between dots/dashes : 1
  // added dot-times between characters : 2 , total 3
  // added dot-times between words : 4 , total 7

  if(s == null) {
    // volume for a silent pause
    var vs = 0
    // caller-provided delay
    var duration = delay;
  }
  else {
    // normal volume for dot or dash
    var vs = Morse.volume;
    // dot = 1, dash = 3
    var duration = (s == '-')?3:1;
  }
  var hv = (Morse.high_volume-Morse.low_volume) * vs + Morse.low_volume;
  Morse.vol.gain.setTargetAtTime(hv, Morse.time, Morse.slope_constant);
  Morse.time += duration * Morse.dot_time;
  Morse.vol.gain.setTargetAtTime(Morse.low_volume, Morse.time, Morse.slope_constant);
}

Morse.send_char = function(c) {
  var data = '';
  var chl = c.toLowerCase();
  if(chl == ' ') {
    // inter-word pause
    Morse.gen_bit(Morse.dot_time_between_words, null);
  }
  else if(chl in Morse.mdict) {
    var cs = Morse.mdict[chl];
    if(cs.length > 0) {
      for (var i in cs) {
        var tok = cs[i];
        // send a dot or dash
        Morse.gen_bit(Morse.dot_time_between_dots_dashes,tok);
        // send a dot-length pause
        Morse.gen_bit(Morse.dot_time_between_dots_dashes,null);
      }
      // send an inter-character pause
      Morse.gen_bit(Morse.dot_time_between_characters,null);
    }
  }

}

Morse.show_char = function() {
  if(Morse.target_div != null && Morse.busy) {
    var sa = Morse.string.substring(0,Morse.index);
    var sb = Morse.string.substring(Morse.index,Morse.index+1);
    var sc = Morse.string.substring(Morse.index+1,Morse.string.length);
    result = sa + '<span id="highlight" style="color:#008000;background-color:#ffff80;font-size:inherit;font-family:inherit;font-style:inherit;">' + sb + '</span>' + sc;
    Morse.target_div.innerHTML = result;
    if(Morse.scroll) {
      var hlp = Morse.id('highlight');
      hlp.parentNode.scrollTop = hlp.offsetTop - hlp.parentNode.offsetTop;
    }
    Morse.index += 1;
    if(Morse.index > Morse.string.length || ! Morse.busy) {
      Morse.stop_process();
    }
    else {
      var t = Morse.times[Morse.index];
      setTimeout(Morse.show_char,(t-Morse.start_time) * 1000);
      Morse.start_time = t;
    }
  }
  else {
    Morse.reset_string();
  }
}

Morse.send_string = function(s,osc_type) {
  if(osc_type == null) {
    osc_type = 'sine';
  }
  Morse.setup_oscillator(osc_type);
  if(Morse.recording) {
    Morse.mediaRecorder.start();
  }
  Morse.string = s;
  Morse.index = 0;
  for (var i in s) {
    if(!Morse.busy) {
      break;
    }
    var c = s[i];
    Morse.send_char(c);
    Morse.times.push(Morse.time);
    if(i == 0) {
      // only call this function once
      Morse.show_char();
    }
  }
  Morse.vol.gain.setTargetAtTime(0.0, Morse.time, Morse.slope_constant);
}

Morse.stop_process = function() {
  if(Morse.busy) {
    Morse.vol.gain.setTargetAtTime(0.0, Morse.time, Morse.slope_constant);
    Morse.busy = false;
    Morse.carrier.stop(0);
    if(Morse.recording) {
      Morse.mediaRecorder.stop();
    }
    Morse.reset_string();
    Morse.record_button.disabled = false;
    Morse.setup();
  }
}

Morse.sanitize_string = function(str) {
  str = str.trim();
  str = str.replace(/&nbsp;/g,' ');
str = str.replace(/<br.*?>/g,'\n');
  str = str.replace(/<\/p.*?>/g,'\n\n');
  str = str.replace(/<.*?>/g,'');
  str = str.replace(/\n[ \t]+/g,'\n');
  return str;
}

Morse.sanitize_default_text = function() {
  var div = Morse.id('practicearea');
  str = div.innerHTML;
  str = Morse.sanitize_string(str);
  div.innerHTML = str;
}

Morse.process_div = function(div,osc_type,hivol,lovol,scroll) {
  if(!Morse.busy) {
    Morse.setup();
    Morse.busy = true;
    Morse.target_div = div;
    var str = Morse.target_div.innerHTML.trim();
    str = Morse.sanitize_string(str);
    Morse.target_div.innerHTML = str;
    Morse.high_volume = (typeof lovol === 'undefined')?1:parseFloat(hivol);
    Morse.low_volume = (typeof lovol === 'undefined')?0:parseFloat(lovol);
    Morse.scroll = (typeof scroll === 'undefined')?false:scroll;
    Morse.osc_type = (typeof osc_type === 'undefined')?'sine':osc_type;
    Morse.send_string(str,osc_type);
  }
  else {
    Morse.stop_process();
  }
}

Morse.process_divname = function(divname,osc_type,hivol,lovol,scroll) {
  var div = Morse.id(divname);
  Morse.process_div(div,osc_type,hivol,lovol,scroll);
}

Morse.erase_default_text = function() {
  Morse.stop_process();
  Morse.id('practicearea').innerHTML = '';
}

window.addEventListener('load', function() {
  Morse.init();
});

window.addEventListener('unload', function() {
  Morse.write_cookie();
});
