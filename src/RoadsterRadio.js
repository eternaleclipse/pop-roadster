"use strict";

// Roadster stereo: synthesized high-energy instrumentals (no vocals, no samples). It switches
// itself on when the car drives off, shuffles to a new song every few bars, and runs through
// a 5-band EQ that follows the car: more bass the faster you go, everything maxed on BOOST.
// It lives in the bottom HUD as a pixel spectrum. Keys: M mute, N next song.
PrinceJS.RoadsterRadio = {
  BARS_PER_SONG: 16,

  SONGS: [
    {
      name: "LUDICROUS DRIVE",
      bpm: 128,
      chords: [
        [57, "m"],
        [53, "M"],
        [60, "M"],
        [55, "M"]
      ],
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "xxxxxxxxxxxxxxxx",
      bass: "xxxxxxxxxxxxxxxx",
      arp: "xxxxxxxxxxxxxxxx",
      arpShape: [0, 1, 2, 3, 2, 1, 0, 1],
      lead: "square"
    },
    {
      name: "WALL RIDE",
      bpm: 150,
      chords: [
        [52, "m"],
        [48, "M"],
        [50, "M"],
        [47, "M"]
      ],
      kick: "x.........x.....",
      snare: "....x.......x...",
      hat: "xxxxxxxxxxxxxxxx",
      bass: "x.xx..x.x.xx..x.",
      arp: "x.x.xx.x.x.xx.x.",
      arpShape: [0, 2, 1, 3, 4, 2],
      lead: "sawtooth"
    },
    {
      name: "SUNSET OVERDRIVE",
      bpm: 132,
      chords: [
        [60, "M"],
        [55, "M"],
        [57, "m"],
        [53, "M"]
      ],
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "..x...x...x...x.",
      bass: "..x...x...x...x.",
      arp: "xxxxxxxxxxxxxxxx",
      arpShape: [0, 1, 2, 4, 2, 1],
      lead: "sawtooth"
    },
    {
      name: "HIJAZ HIGHWAY",
      bpm: 140,
      chords: [
        [52, "M"],
        [53, "M"],
        [52, "M"],
        [50, "m"]
      ],
      kick: "x..x..x.x...x...",
      snare: "....x..x....x.x.",
      hat: "xxxxxxxxxxxxxxxx",
      bass: "x..x..x.x..x..x.",
      arp: "xxxxxxxxxxxxxxxx",
      // Hijaz scale steps from the root: 1, b2, 3, 4, 5, b6, b7
      scale: [0, 1, 4, 5, 7, 8, 10],
      arpShape: [0, 1, 2, 3, 4, 3, 2, 1],
      lead: "square"
    },
    {
      name: "ZERO TO SIXTY",
      bpm: 145,
      chords: [
        [50, "m"],
        [46, "M"],
        [48, "M"],
        [45, "M"]
      ],
      kick: "x...x...x...x.x.",
      snare: "....x.......x...",
      hat: "x.xxx.xxx.xxx.xx",
      bass: "x.x.x.x.x.x.x.x.",
      arp: "xxxxxxxxxxxxxxxx",
      arpShape: [0, 3, 2, 4, 1, 3],
      lead: "square"
    }
  ],

  // EQ bands; the curves are blended by speed and boost
  BANDS: [
    { f: 60, type: "lowshelf" },
    { f: 250, type: "peaking" },
    { f: 1000, type: "peaking" },
    { f: 4000, type: "peaking" },
    { f: 12000, type: "highshelf" }
  ],
  EQ_CRUISE: [2, 1, 0, 1, 2],
  EQ_FAST: [10, 6, -2, 1, 4],
  EQ_LUDICROUS: [12, 12, 12, 12, 12],

  init: function (game) {
    if (this.game) {
      return;
    }
    this.game = game;
    this.song = -1;
    this.playing = false;
    this.muted = false;
    this.lastDrive = 0;
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") {
        this.muted = !this.muted;
        if (this.out) {
          this.out.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.05);
        }
        this.announce(this.muted ? "RADIO OFF" : "RADIO ON");
      } else if (e.code === "KeyN" && this.playing) {
        this.nextSong();
      }
    });
    let tick = () => {
      // Fade out when the car is not being driven (cutscenes, title screens)
      if (this.playing && performance.now() - this.lastDrive > 600) {
        this.pause();
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  },

  // Called every frame by the car while it is being driven
  drive: function (mph, boosting) {
    this.lastDrive = performance.now();
    if (!this.playing && !this.start()) {
      return;
    }
    let speed = Math.min(1, mph / 250);
    let target = this.BANDS.map((b, n) =>
      boosting ? this.EQ_LUDICROUS[n] : this.EQ_CRUISE[n] + (this.EQ_FAST[n] - this.EQ_CRUISE[n]) * speed
    );
    this.filters.forEach((f, n) => f.gain.setTargetAtTime(target[n], this.ctx.currentTime, boosting ? 0.05 : 0.3));
  },

  // --- Audio graph ---------------------------------------------------------------------------

  initAudio: function () {
    if (this.ctx) {
      return true;
    }
    let sound = this.game.sound;
    let ctx = sound && sound.context;
    if (!ctx || !sound.usingWebAudio) {
      return false;
    }
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.5;
    let node = this.bus;
    this.filters = this.BANDS.map((band, n) => {
      let f = ctx.createBiquadFilter();
      f.type = band.type;
      f.frequency.value = band.f;
      f.Q.value = 1.1;
      f.gain.value = this.EQ_CRUISE[n];
      node.connect(f);
      node = f;
      return f;
    });
    // Keeps the LUDICROUS curve loud but not distorted
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.ratio.value = 12;
    node.connect(this.limiter);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    this.limiter.connect(this.analyser);
    this.fader = ctx.createGain();
    this.fader.gain.value = 0;
    this.analyser.connect(this.fader);
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : 0.6;
    this.fader.connect(this.out);
    this.out.connect(sound.masterGain || ctx.destination);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);

    let noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    let data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noise = noise;
    return true;
  },

  start: function () {
    if (!this.initAudio() || this.ctx.state !== "running") {
      return false;
    }
    this.playing = true;
    this.fader.gain.setTargetAtTime(1, this.ctx.currentTime, 0.15);
    if (this.song < 0) {
      this.nextSong();
    } else {
      this.announce("NOW PLAYING " + this.SONGS[this.song].name);
    }
    this.nextTime = this.ctx.currentTime + 0.05;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    return true;
  },

  pause: function () {
    this.playing = false;
    clearInterval(this.timer);
    if (this.fader) {
      this.fader.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  },

  // Shuffle: any song but the current one
  nextSong: function () {
    let pick = Math.floor(Math.random() * (this.SONGS.length - 1));
    this.song = this.song >= 0 && pick >= this.song ? pick + 1 : pick;
    this.step = 0;
    this.announce("NOW PLAYING " + this.SONGS[this.song].name);
  },

  announce: function (text) {
    let ui = PrinceJS.InterfaceCurrent;
    if (ui && ui.roadster && this.game.state.current === "Game") {
      ui.showText(text, "trick");
      ui.hideTextTimer = 30;
    }
  },

  // --- Sequencer ---------------------------------------------------------------------------

  schedule: function () {
    if (!this.playing) {
      return;
    }
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      let song = this.SONGS[this.song];
      let stepLen = 60 / song.bpm / 4;
      this.playStep(song, this.step, this.nextTime, stepLen);
      this.nextTime += stepLen;
      this.step++;
      if (this.step >= this.BARS_PER_SONG * 16) {
        this.nextSong();
      }
    }
  },

  playStep: function (song, step, t, len) {
    let s = step % 16;
    let barNo = Math.floor(step / 16);
    let bar = barNo % song.chords.length;
    let [root, quality] = song.chords[bar];
    let chord = quality === "m" ? [0, 3, 7, 12, 15] : [0, 4, 7, 12, 16];
    let fill = barNo % 4 === 3 && s >= 12;
    if (s === 0 && barNo % 4 === 0) {
      this.crash(t);
    }
    if (song.kick[s] === "x") {
      this.kick(t);
    }
    if (song.snare[s] === "x" || fill) {
      this.snare(t, fill ? 0.2 + (s - 12) * 0.05 : 0.35);
    }
    if (song.hat[s] === "x") {
      this.hat(t, s % 4 === 2 ? 0.09 : 0.05);
    }
    if (song.bass[s] === "x") {
      let octave = song.bass === "xxxxxxxxxxxxxxxx" && s % 2 ? 12 : 0;
      this.bass(t, root - 24 + octave, len * 0.9);
    }
    if (song.arp[s] === "x") {
      let idx = song.arpShape[step % song.arpShape.length];
      let note = song.scale
        ? root + song.scale[(idx + bar * 2) % song.scale.length] + 12
        : root + chord[idx % chord.length] + 12;
      this.lead(t, note, len * 0.9, song.lead);
    }
  },

  freq: function (midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  env: function (t, peak, attack, decay) {
    let g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.bus);
    return g;
  },

  osc: function (type, f, t, dur, dest) {
    let o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  },

  noiseHit: function (t, dur, filterType, f, peak) {
    let src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    let filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = f;
    src.connect(filter);
    filter.connect(this.env(t, peak, 0.002, dur));
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  },

  kick: function (t) {
    let o = this.osc("sine", 160, t, 0.35, this.env(t, 0.95, 0.003, 0.3));
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
  },

  snare: function (t, peak) {
    this.noiseHit(t, 0.16, "highpass", 1500, peak);
    this.osc("triangle", 190, t, 0.1, this.env(t, peak * 0.7, 0.002, 0.07));
  },

  hat: function (t, peak) {
    this.noiseHit(t, 0.04, "highpass", 8000, peak);
  },

  crash: function (t) {
    this.noiseHit(t, 1.2, "highpass", 5000, 0.12);
  },

  bass: function (t, midi, dur) {
    let lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + dur);
    lp.connect(this.env(t, 0.35, 0.005, dur));
    this.osc("sawtooth", this.freq(midi), t, dur, lp);
    this.osc("square", this.freq(midi - 12), t, dur, lp);
  },

  lead: function (t, midi, dur, type) {
    let g = this.env(t, 0.07, 0.005, dur);
    this.osc(type, this.freq(midi), t, dur, g);
    this.osc(type, this.freq(midi) * 1.005, t, dur, g);
  },

  // --- Bottom HUD spectrum -------------------------------------------------------------------

  HUD_BARS: 12,

  // Pixel spectrum on the right of the bottom bar, in the game's EGA colors
  attachHud: function (ui) {
    let w = this.HUD_BARS * 3 + 6;
    let bmd = ui.game.make.bitmapData(w, PrinceJS.UI_HEIGHT);
    let sprite = ui.game.make.sprite(PrinceJS.SCREEN_WIDTH - w - 1, 0, bmd);
    ui.layer.addChild(sprite);
    return { bmd, sprite, w };
  },

  drawHud: function (hud, hidden) {
    hud.sprite.visible = !hidden;
    if (hidden) {
      return;
    }
    let ctx = hud.bmd.ctx;
    let h = PrinceJS.UI_HEIGHT;
    ctx.clearRect(0, 0, hud.w, h);
    let live = this.analyser && this.playing && !this.muted;
    if (live) {
      this.analyser.getByteFrequencyData(this.bins);
    }
    // Music note
    ctx.fillStyle = live ? "#fcfc54" : "#545454";
    ctx.fillRect(2, 1, 1, 5);
    ctx.fillRect(3, 1, 2, 1);
    ctx.fillRect(4, 2, 1, 1);
    ctx.fillRect(0, 5, 2, 2);
    ctx.fillRect(1, 4, 1, 1);
    let n = this.HUD_BARS;
    for (let b = 0; b < n; b++) {
      let level = 0;
      if (live) {
        // Log-spaced bands so the bass does not hog the display
        let len = this.bins.length;
        let lo = Math.floor(Math.pow(len, b / n));
        let hi = Math.max(lo + 1, Math.floor(Math.pow(len, (b + 1) / n)));
        for (let i = lo; i < hi; i++) {
          level += this.bins[i];
        }
        level /= (hi - lo) * 255;
      }
      let lit = Math.round(level * (h - 1));
      for (let r = 0; r < h - 1; r++) {
        ctx.fillStyle = r < lit ? (r >= h - 2 ? "#fc5454" : r >= h - 4 ? "#fcfc54" : "#54fc54") : "#1c1c1c";
        ctx.fillRect(6 + b * 3, h - 1 - r - 1, 2, 1);
      }
    }
    hud.bmd.dirty = true;
  }
};
