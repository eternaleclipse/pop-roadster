"use strict";

// Roadster cockpit: while driving, the canvas grows downward and a pixel-art car interior sits
// under the playfield. On the left, the windshield shows a first-person view down the corridor
// ahead (floor, gaps, walls, torches, gates, guards), with a yoke-style steering wheel in front
// that only turns when the car really turns (drifts and turnarounds). The center touchscreen is
// split like a modern EV display: a 3D visualization of the car's surroundings with the speed,
// and a nav map with turn-by-turn directions. Its top bar has the gear, stereo and battery.
PrinceJS.RoadsterDash = function (ui) {
  let D = PrinceJS.RoadsterDash;
  this.ui = ui;
  this.game = ui.game;
  D.setTall(this.game, true);

  this.bmd = this.game.make.bitmapData(PrinceJS.SCREEN_WIDTH, D.H);
  this.sprite = this.game.add.sprite(0, 0, this.bmd);
  this.sprite.fixedToCamera = true;
  this.sprite.cameraOffset.setTo(0, PrinceJS.SCREEN_HEIGHT * PrinceJS.SCALE_FACTOR);

  this.yokeBmd = this.game.make.bitmapData(D.YOKE_W, D.YOKE_H);
  this.drawYoke();
  this.yoke = this.game.add.sprite(0, 0, this.yokeBmd);
  this.yoke.anchor.setTo(0.5, 0.45);
  this.yoke.fixedToCamera = true;
  this.yoke.cameraOffset.setTo(
    D.YOKE_X * PrinceJS.SCALE_FACTOR,
    (PrinceJS.SCREEN_HEIGHT + D.YOKE_Y) * PrinceJS.SCALE_FACTOR
  );
  this.steer = 0;

  ui.mphText.visible = false;

  // A sprite rather than a group: camera-fixed groups ignore the world's 2x scale
  this.scoreGroup = this.game.add.sprite(0, 0);
  this.scoreGroup.fixedToCamera = true;
  this.scoreGroup.cameraOffset.setTo(3 * PrinceJS.SCALE_FACTOR, 3 * PrinceJS.SCALE_FACTOR);
  this.scoreText = this.game.make.bitmapText(0, 0, "font", "", 16);
  this.scoreText.tint = 0xfcfcfc;
  this.multText = this.game.make.bitmapText(0, 9, "font", "", 16);
  this.comboBmd = this.game.make.bitmapData(60, 2);
  this.comboBar = this.game.make.sprite(0, 19, this.comboBmd);
  this.scoreGroup.addChild(this.scoreText);
  this.scoreGroup.addChild(this.multText);
  this.scoreGroup.addChild(this.comboBar);
  this.shown = { score: -1, mult: -1 };

  this.tick = 0;
  this.battery = 100;
  this.draw(null);
};

PrinceJS.RoadsterDash.H = 72; // cockpit height in game pixels, below the 200px screen
PrinceJS.RoadsterDash.YOKE_W = 84;
PrinceJS.RoadsterDash.YOKE_H = 40;
PrinceJS.RoadsterDash.YOKE_X = 62;
PrinceJS.RoadsterDash.YOKE_Y = 60;
PrinceJS.RoadsterDash.SCREEN = { x: 125, y: 5, w: 192, h: 64 };
PrinceJS.RoadsterDash.VIEW = { x: 3, y: 4, w: 118, h: 56 }; // the windshield
PrinceJS.RoadsterDash.SLICE = 28; // world pixels per depth slice of the windshield view
PrinceJS.RoadsterDash.SLICES = 10;
PrinceJS.RoadsterDash.MAX_RPM = 20000;

// Billboards for the windshield view, 12 x 22 pixels, facing the driver
PrinceJS.RoadsterDash.GUARD = [
  "....TTTT....",
  "...TTTTTT...",
  "..TTTJTTTT..",
  "...TTTTTT...",
  "....SSSS....",
  "....ESSE....",
  "....SMMS....",
  ".....SS.....",
  "..CCCCCCCC.W",
  ".CCCCCCCCCCW",
  "SCCKCCCCKCCW",
  "S.CCCCCCCC.W",
  "S.CCCCCCCC.H",
  "..BBBBBBBB.S",
  "..CCCCCCCC..",
  "..CCCCCCCC..",
  "..PPP..PPP..",
  "..PPP..PPP..",
  "..PPP..PPP..",
  "..PP....PP..",
  "..PP....PP..",
  ".KKK....KKK."
];
PrinceJS.RoadsterDash.SKELETON = [
  "....BBBB....",
  "...BBBBBB...",
  "...BEBBEB...",
  "...BBBBBB...",
  "....BKKB...W",
  ".....BB....W",
  "..BBBBBBBB.W",
  ".B.B.BB.B.BW",
  "B..BBBBBB..H",
  "B..B.BB.B..B",
  "...BBBBBB...",
  "....BBBB....",
  ".....BB.....",
  "....BBBB....",
  "...BB..BB...",
  "...B....B...",
  "...B....B...",
  "...B....B...",
  "...B....B...",
  "...B....B...",
  "..BB....BB..",
  ".BBB....BBB."
];
PrinceJS.RoadsterDash.SKELETON_COLORS = {
  B: [232, 232, 216],
  E: [0, 0, 0],
  K: [40, 40, 40],
  W: [216, 216, 232],
  H: [168, 120, 40]
};
PrinceJS.RoadsterDash.GUARD_COLORS = {
  guard: {
    T: [168, 0, 168],
    J: [252, 216, 0],
    S: [252, 168, 104],
    E: [0, 0, 0],
    M: [40, 24, 16],
    C: [84, 84, 252],
    K: [252, 252, 252],
    B: [252, 216, 0],
    P: [40, 40, 120],
    W: [216, 216, 232],
    H: [168, 120, 40]
  },
  fatguard: {
    T: [252, 252, 252],
    J: [252, 84, 84],
    S: [252, 168, 104],
    E: [0, 0, 0],
    M: [40, 24, 16],
    C: [168, 0, 0],
    K: [252, 216, 0],
    B: [40, 40, 40],
    P: [120, 40, 40],
    W: [216, 216, 232],
    H: [168, 120, 40]
  },
  vizier: {
    T: [252, 252, 252],
    J: [168, 0, 168],
    S: [232, 176, 120],
    E: [0, 0, 0],
    M: [200, 200, 200],
    C: [168, 0, 168],
    K: [252, 216, 0],
    B: [252, 216, 0],
    P: [120, 0, 120],
    W: [216, 216, 232],
    H: [252, 216, 0]
  }
};

// Made-up street names for the nav footer, one per room
PrinceJS.RoadsterDash.STREETS = [
  "JAFFAR BLVD",
  "SULTAN AVE",
  "DUNGEON RD",
  "SPIKE ST",
  "CHOPPER LN",
  "VIZIER WAY",
  "PALACE HWY",
  "LOOSE TILE CT",
  "SKELETON ALY",
  "POTION PKWY"
];

// 5x7 digits for the big speed readout
PrinceJS.RoadsterDash.DIGITS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"]
};

// Grow the canvas down for the cockpit while driving, and back to normal elsewhere
PrinceJS.RoadsterDash.setTall = function (game, on) {
  let h = (PrinceJS.SCREEN_HEIGHT + (on ? PrinceJS.RoadsterDash.H : 0)) * PrinceJS.SCALE_FACTOR;
  if (game.height !== h) {
    game.scale.setGameSize(PrinceJS.SCREEN_WIDTH * PrinceJS.SCALE_FACTOR, h);
  }
  // Rooms are framed by hand, so the taller view must not clamp the camera to the level
  game.camera.bounds = on ? null : game.world.bounds;
};

// Shrink back whenever we leave the game (title, cutscenes, ending, credits)
PrinceJS.RoadsterDash.watch = function (game) {
  game.state.onStateChange.add((state) => {
    if (state !== "Game") {
      PrinceJS.RoadsterDash.setTall(game, false);
    }
  });
};

PrinceJS.RoadsterDash.prototype = {
  update: function (car) {
    this.tick++;
    // The wheel only turns when the car does: through a drift or a turnaround
    let target = 0;
    if (car.drift) {
      target = -car.F.x * 0.7 * Math.sin(Math.PI * Math.min(1, car.drift.t / car.drift.dur));
    } else if (car.yaw > 0 && car.F.y === 0) {
      target = car.F.x * 0.7 * Math.sin(Math.PI * car.yaw);
    }
    this.steer += (target - this.steer) * 0.25;
    let snap = Math.PI / 16;
    this.yoke.rotation = Math.round(this.steer / snap) * snap;
    if (car.boosting) {
      this.battery = Math.max(1, this.battery - 0.02);
    }
    if (this.tick % 2 === 0) {
      this.draw(car);
    }
    this.updateScore(car);
    this.game.world.bringToTop(this.sprite);
    this.game.world.bringToTop(this.yoke);
    this.game.world.bringToTop(this.scoreGroup);
  },

  px: function (x, y, w, h, c) {
    let ctx = this.bmd.ctx;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  },

  text: function (s, x, y, color) {
    let ctx = this.bmd.ctx;
    ctx.fillStyle = color;
    for (let n = 0; n < s.length; n++) {
      let glyph = PrinceJS.RoadsterGPS.FONT[s[n]] || PrinceJS.RoadsterGPS.FONT[" "];
      for (let row = 0; row < 5; row++) {
        for (let bit = 0; bit < 3; bit++) {
          if (glyph[row] & (4 >> bit)) {
            ctx.fillRect(x + n * 4 + bit, y + row, 1, 1);
          }
        }
      }
    }
  },

  bigText: function (s, x, y, color, scale) {
    let ctx = this.bmd.ctx;
    ctx.fillStyle = color;
    for (let n = 0; n < s.length; n++) {
      let g = PrinceJS.RoadsterDash.DIGITS[s[n]];
      for (let r = 0; g && r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r][c] === "1") {
            ctx.fillRect(x + n * 6 * scale + c * scale, y + r * scale, scale, scale);
          }
        }
      }
    }
  },

  draw: function (car) {
    let D = PrinceJS.RoadsterDash;
    let W = PrinceJS.SCREEN_WIDTH;
    let V = D.VIEW;
    this.bmd.ctx.clearRect(0, 0, W, D.H);

    // Dash top edge with an ambient light strip that pulses with the music
    this.px(0, 0, W, D.H, "#121218");
    this.px(0, 0, W, 2, "#2a2a34");
    let music = this.musicBins();
    let glow = music ? 0.35 + music.level * 0.65 : 0.5;
    let strip = car && car.boosting ? "64,192,255" : "84,84,252";
    this.px(0, 2, W, 1, `rgba(${strip},${glow})`);

    // Windshield: the first-person view, framed by the roof and the pillars
    if (car) {
      this.drawView(car);
    } else {
      this.px(V.x, V.y, V.w, V.h, "#000000");
    }
    this.px(V.x - 1, V.y - 1, V.w + 2, 1, "#2a2a34");
    for (let y = 0; y < V.h; y++) {
      let t = Math.max(0, 4 - Math.floor(y / 6));
      this.px(V.x, V.y + y, t, 1, "#0a0a0e");
      this.px(V.x + V.w - t, V.y + y, t, 1, "#0a0a0e");
    }
    // Dash top below the windshield, and the column behind the yoke
    this.px(0, V.y + V.h, 123, D.H - V.y - V.h, "#16161e");
    this.px(0, V.y + V.h, 123, 1, "#2a2a34");
    this.px(D.YOKE_X - 6, 58, 12, 14, "#0a0a0e");
    this.px(319, 4, 1, D.H - 4, "#2a2a34");

    if (car) {
      this.drawScreen(car, music);
    } else {
      this.px(D.SCREEN.x, D.SCREEN.y, D.SCREEN.w, D.SCREEN.h, "#05070f");
    }
    this.bmd.dirty = true;
  },

  // --- Windshield: a little first-person renderer -----------------------------------------
  // The level is sampled in slices along the direction the car is heading; each slice has a
  // floor (or a gap), a ceiling (or open space) and fake side walls, and the first solid
  // slice is the wall ahead. Slices are fixed in the world, so they stream past with speed.

  shade: function (rgb, z) {
    let k = Math.max(0.12, Math.min(1, 1.15 - z / 9));
    return "rgb(" + rgb.map((c) => Math.round(c * k)).join(",") + ")";
  },

  // The camera looks exactly where the car's nose points, with the roof as "up", so falls,
  // climbs, wall and ceiling rides and jumps all look like they do in the room view. Barrel
  // rolls spin the whole picture round.
  camera: function (car) {
    let R = PrinceJS.Roadster;
    let grounded = car.state !== R.STATE_AIRBORNE;
    let a = grounded ? car.dispAngle : car.theta;
    let m = car.mirror || 1;
    let H = { x: Math.cos(a), y: Math.sin(a) };
    let U = { x: m * Math.sin(a), y: -m * Math.cos(a) };
    if (grounded && car.D) {
      U = { x: -car.D.x, y: -car.D.y };
    }
    return { H, U, roll: car.roll || 0 };
  },

  drawView: function (car) {
    let D = PrinceJS.RoadsterDash;
    let V = D.VIEW;
    if (!this.viewBmd) {
      this.viewBmd = this.game.make.bitmapData(V.w, V.h);
    }
    let out = this.bmd.ctx;
    let ctx = this.viewBmd.ctx;
    let saved = this.bmd;
    // Render into the view buffer with the same helpers
    this.bmd = this.viewBmd;
    ctx.clearRect(0, 0, V.w, V.h);
    this.renderView(car, V.w, V.h);
    this.bmd = saved;
    // Blit, rotated for barrel rolls
    let step = Math.PI / 8;
    let roll = Math.round(this.camera(car).roll / step) * step;
    out.save();
    out.beginPath();
    out.rect(V.x, V.y, V.w, V.h);
    out.clip();
    out.fillStyle = "#000000";
    out.fillRect(V.x, V.y, V.w, V.h);
    out.imageSmoothingEnabled = false;
    out.translate(V.x + V.w / 2, V.y + V.h / 2);
    out.rotate(roll);
    let zoom = Math.abs(Math.sin(roll * 2)) > 0.01 || Math.abs(Math.sin(roll)) > 0.01 ? 1.45 : 1;
    out.drawImage(this.viewBmd.canvas, (-V.w / 2) * zoom, (-V.h / 2) * zoom, V.w * zoom, V.h * zoom);
    out.restore();
  },

  renderView: function (car, VW, VH) {
    let D = PrinceJS.RoadsterDash;
    let R = PrinceJS.Roadster;
    let cam = this.camera(car);
    let H = cam.H;
    let U = cam.U;
    let palace = car.level.type === PrinceJS.Level.TYPE_PALACE;
    let pal = palace
      ? {
          wall: [200, 152, 96],
          brick: [160, 112, 64],
          floor: [156, 100, 84],
          floor2: [136, 84, 72],
          ceil: [120, 84, 52]
        }
      : { wall: [72, 88, 124], brick: [52, 64, 96], floor: [104, 112, 144], floor2: [88, 96, 128], ceil: [40, 48, 72] };

    // Drifts and turnarounds pan the view sideways
    let pan = 0;
    if (car.drift) {
      pan = Math.sin(Math.PI * Math.min(1, car.drift.t / car.drift.dur)) * 60 * Math.sign(car.F.x || 1);
    } else if (car.yaw > 0) {
      pan = -Math.sin(Math.PI * car.yaw) * 60 * Math.sign(car.F.x || 1);
    }
    let view = { cx: VW / 2 + pan, hy: VH / 2 - 2, f: 46, XS: 1.4 };
    this.px(0, 0, VW, VH, "#000000");

    // Sample slices along the nose; at each one cast toward the floor (away from the roof)
    // and toward the ceiling to find how far they are
    let S = D.SLICE;
    let VS = 26; // world pixels per vertical unit
    let along = car.C.x * H.x + car.C.y * H.y;
    let first = Math.ceil(along / S) * S - along;
    let cast = (q, dir, max) => {
      for (let d = 2; d <= max; d += 3) {
        if (car.solid(q.x + dir.x * d, q.y + dir.y * d)) {
          return d;
        }
      }
      return Infinity;
    };
    let down = { x: -U.x, y: -U.y };
    let upright = Math.abs(H.y) < 0.4;
    let slices = [];
    let near = 0;
    for (let k = 0; k < D.SLICES; k++) {
      let far = first + k * S;
      let mid = (near + far) / 2;
      let q = { x: car.C.x + H.x * mid, y: car.C.y + H.y * mid };
      let fd = cast(q, down, 170);
      let cd = cast(q, U, 120);
      let sl = {
        zn: Math.max(0.3, near / S),
        zf: Math.max(0.35, far / S),
        index: Math.round((along + far) / S),
        wall: car.solid(q.x, q.y),
        yf: fd === Infinity ? null : fd / VS,
        yc: cd === Infinity ? null : -cd / VS,
        q
      };
      if (upright && fd !== Infinity) {
        let fp = { x: q.x + down.x * (fd - 8), y: q.y + down.y * (fd - 8) };
        let cell = car.cellAt(fp.x, fp.y);
        sl.tile = cell && cell.tile;
      }
      slices.push(sl);
      near = far;
      if (sl.wall) {
        break;
      }
    }

    for (let k = slices.length - 1; k >= 0; k--) {
      let sl = slices[k];
      let prev = slices[k - 1];
      if (sl.wall) {
        let yc = prev ? prev.yc : -2;
        let yf = prev ? prev.yf : 1;
        this.endWall(view, sl.zn, yc === null ? -4 : yc, yf === null ? 6 : yf, pal);
        continue;
      }
      let even = sl.index % 2 === 0;
      let yc = sl.yc === null ? -4 : sl.yc;
      let yf = sl.yf === null ? 6.5 : sl.yf;
      if (sl.yc !== null) {
        this.plane(view, sl.zn, sl.zf, sl.yc, this.shade(pal.ceil, sl.zn));
      }
      if (sl.yf !== null) {
        this.plane(view, sl.zn, sl.zf, sl.yf, this.shade(even ? pal.floor : pal.floor2, sl.zn));
      }
      [-1, 1].forEach((side) => this.sideWall(view, sl.zn, sl.zf, side, yc, yf, pal, sl.yc === null || sl.yf === null));
      // Risers where the next slice's floor or ceiling steps toward the eye
      let next = slices[k + 1];
      if (next && !next.wall) {
        if (sl.yf !== null && next.yf !== null && next.yf < sl.yf - 0.05) {
          this.face(view, sl.zf, next.yf, sl.yf, this.shade(pal.brick, sl.zf));
        } else if (sl.yf !== null && next.yf === null) {
          this.face(view, sl.zf, sl.yf, sl.yf + 0.15, this.shade(pal.floor2, sl.zf));
        }
        if (sl.yc !== null && next.yc !== null && next.yc > sl.yc + 0.05) {
          this.face(view, sl.zf, sl.yc, next.yc, this.shade(pal.brick, sl.zf));
        }
      }
      this.details(view, sl, yc, yf, pal);
    }
    this.guards(car, view, H, U, VS);

    // Speed streaks
    let mph = car.mph();
    if (mph > 120) {
      let n = Math.min(10, Math.floor(mph / 40));
      for (let i = 0; i < n; i++) {
        let side = i % 2 ? 1 : -1;
        let r = ((this.tick * 7 + i * 37) % 60) / 60;
        let x = view.cx + side * (12 + r * 50);
        let y = view.hy + ((i * 13) % 30) - 15;
        this.px(
          Math.round(x),
          Math.round(y),
          Math.round(3 + r * 10),
          1,
          car.boosting ? "#40c0ff" : "rgba(252,252,252,0.5)"
        );
      }
    }
    this.viewBmd.dirty = true;
  },

  // Floor or ceiling between two depths, a scanline at a time
  plane: function (v, zn, zf, Y, color) {
    if (Math.abs(Y) < 0.01) {
      return;
    }
    let y0 = v.hy + (Y * v.f) / zn;
    let y1 = v.hy + (Y * v.f) / zf;
    let top = Math.round(Math.min(y0, y1));
    let bottom = Math.round(Math.max(y0, y1));
    let ctx = this.bmd.ctx;
    ctx.fillStyle = color;
    for (let y = Math.max(-1, top); y <= Math.min(200, bottom); y++) {
      let hw = Math.abs(((y - v.hy) * v.XS) / Y);
      ctx.fillRect(Math.round(v.cx - hw), y, Math.round(hw * 2) + 1, 1);
    }
  },

  // A vertical face across the corridor at depth z, from Y0 to Y1
  face: function (v, z, y0, y1, color) {
    let s = v.f / z;
    let x = Math.round(v.cx - v.XS * s);
    this.px(x, Math.round(v.hy + y0 * s), Math.round(v.XS * s * 2), Math.max(1, Math.round((y1 - y0) * s)), color);
  },

  sideWall: function (v, zn, zf, side, yc, yf, pal, open) {
    let ctx = this.bmd.ctx;
    let xn = v.cx + (side * v.XS * v.f) / zn;
    let xf = v.cx + (side * v.XS * v.f) / zf;
    let a = Math.round(Math.min(xn, xf));
    let b = Math.round(Math.max(xn, xf));
    for (let x = a; x <= b; x++) {
      let d = Math.abs(x - v.cx) / v.XS;
      let z = v.f / Math.max(0.01, d);
      let top = v.hy + yc * d;
      let bottom = v.hy + yf * d;
      ctx.fillStyle = this.shade(open ? pal.brick : pal.wall, z + (open ? 2 : 0));
      ctx.fillRect(x, Math.round(top), 1, Math.round(bottom - top) + 1);
      ctx.fillStyle = this.shade(pal.brick, z);
      for (let m = Math.ceil(yc * 2); m < yf * 2; m++) {
        ctx.fillRect(x, Math.round(v.hy + (m / 2) * d), 1, 1);
      }
    }
    ctx.fillStyle = this.shade(pal.brick, zf);
    ctx.fillRect(Math.round(xf), Math.round(v.hy + (yc * v.f) / zf), 1, Math.round(((yf - yc) * v.f) / zf));
  },

  endWall: function (v, z, yc, yf, pal) {
    let s = v.f / z;
    let x0 = Math.round(v.cx - v.XS * s);
    let w = Math.round(v.XS * s * 2);
    let y0 = Math.round(v.hy + yc * s);
    let h = Math.round((yf - yc) * s);
    this.px(x0, y0, w, h, this.shade(pal.wall, z));
    let bh = Math.max(2, Math.round(s * 0.5));
    let bw = Math.max(3, Math.round(s * 0.9));
    for (let r = 0, y = y0; y < y0 + h; r++, y += bh) {
      this.px(x0, y, w, 1, this.shade(pal.brick, z));
      for (let x = x0 + (r % 2 ? bw / 2 : 0); x < x0 + w; x += bw) {
        this.px(Math.round(x), y, 1, bh, this.shade(pal.brick, z));
      }
    }
  },

  // Torches, gates, doors, spikes, choppers and potions in a slice
  details: function (v, sl, yc, yf, pal) {
    let tile = sl.tile;
    if (!tile) {
      return;
    }
    let L = PrinceJS.Level;
    let el = tile.element;
    let z = (sl.zn + sl.zf) / 2;
    let s = v.f / z;
    let flick = (this.tick + sl.index) % 4 < 2;
    let floorY = Math.round(v.hy + yf * s);
    let ceilY = Math.round(v.hy + yc * s);
    let left = Math.round(v.cx - v.XS * s);
    let width = Math.round(v.XS * s * 2);
    if (el === L.TILE_TORCH || el === L.TILE_TORCH_WITH_DEBRIS) {
      [-1, 1].forEach((side) => {
        let x = Math.round(v.cx + side * v.XS * s * 0.97);
        let y = Math.round(v.hy + (yf - 1.3) * s);
        let r = Math.max(1, Math.round(s * 0.07));
        this.px(x - r, y, r * 2, r * 4, "#545454");
        this.px(x - r * 2, y - r, r * 4, r, "#7c7c7c");
        this.px(x - r * 2, y - r * 4, r * 4, r * 3, flick ? "#fc5400" : "#fca800");
        this.px(x - r, y - r * 5, r * 2, r * 3, flick ? "#fcfc54" : "#fcd800");
        this.px(x - Math.max(1, r >> 1), y - r * 6, Math.max(1, r), r, "#fcfcfc");
      });
    } else if (el === L.TILE_GATE) {
      // Portcullis: bars hanging from the ceiling, lowered as far as the gate is
      let open = tile.posY !== undefined ? Math.max(0, Math.min(1, -tile.posY / 46)) : 0;
      let h = Math.round((floorY - ceilY) * (1 - open * 0.85));
      let gap = Math.max(2, Math.round(s / 5));
      for (let x = left + 1; x < left + width; x += gap) {
        this.px(x, ceilY, 1, h, this.shade([124, 124, 136], z));
        this.px(x, ceilY + h, 1, Math.max(1, Math.round(s / 10)), this.shade([200, 200, 210], z));
      }
      for (let y = ceilY + Math.round(h / 3); y < ceilY + h; y += Math.round(h / 3) || 1) {
        this.px(left, y, width, 1, this.shade([100, 100, 112], z));
      }
    } else if (el === L.TILE_EXIT_LEFT || el === L.TILE_EXIT_RIGHT) {
      this.door(v, sl, yf, tile, flick);
    } else if (el === L.TILE_SPIKES) {
      let h = Math.max(1, Math.round(s * 0.25));
      for (let i = 0; i < 7; i++) {
        let x = Math.round(left + ((i + 0.5) / 7) * width);
        this.px(x, floorY - h, 1, h, this.shade([216, 216, 216], z));
        this.px(x, floorY - h, 1, 1, "#fcfcfc");
      }
    } else if (el === L.TILE_CHOPPER) {
      let x = Math.round(v.cx + v.XS * s * (flick ? -0.3 : 0.3));
      this.px(x, ceilY, Math.max(1, Math.round(s / 12)), floorY - ceilY, this.shade([216, 216, 216], z));
      this.px(x, Math.round((ceilY + floorY) / 2), Math.max(1, Math.round(s / 12)), 2, "#fc0000");
    } else if (el === L.TILE_POTION) {
      let r = Math.max(1, Math.round(s * 0.06));
      this.px(Math.round(v.cx) - r, floorY - r * 4, r * 2, r * 3, flick ? "#fc5454" : "#fc54fc");
      this.px(Math.round(v.cx) - Math.max(1, r >> 1), floorY - r * 5, Math.max(1, r), r, "#d8d8d8");
    } else if (el === L.TILE_LOOSE_BOARD) {
      this.px(left + Math.round(width * 0.2), floorY - 1, Math.round(width * 0.6), 1, "#2c2c2c");
    }
  },

  // The level door, set into the left wall: a stone arch with steps behind it, lit when open
  door: function (v, sl, yf, tile, flick) {
    let ctx = this.bmd.ctx;
    let open = tile.open || tile.state === 0 || tile.state === 1;
    let xn = v.cx - (v.XS * v.f) / sl.zn;
    let xf = v.cx - (v.XS * v.f) / sl.zf;
    let a = Math.round(Math.min(xn, xf));
    let b = Math.round(Math.max(xn, xf));
    let span = Math.max(1, b - a);
    for (let x = a; x <= b; x++) {
      let d = Math.abs(x - v.cx) / v.XS;
      let z = v.f / Math.max(0.01, d);
      let k = (x - a) / span;
      let bottom = v.hy + yf * d;
      let top = v.hy + (yf - 2.1) * d;
      let arch = Math.sin(Math.min(1, Math.max(0, (k - 0.1) / 0.8)) * Math.PI) * 0.35 * d;
      let frame = k < 0.12 || k > 0.88;
      if (frame) {
        ctx.fillStyle = this.shade([200, 184, 152], z);
        ctx.fillRect(x, Math.round(top - arch - 2), 1, Math.round(bottom - top + arch + 2));
        continue;
      }
      ctx.fillStyle = this.shade([200, 184, 152], z);
      ctx.fillRect(x, Math.round(top - arch - 2), 1, 2);
      ctx.fillStyle = open
        ? this.shade(flick ? [252, 216, 120] : [252, 200, 96], z * 0.6)
        : this.shade([28, 24, 20], z);
      ctx.fillRect(x, Math.round(top - arch), 1, Math.round(bottom - top + arch));
      if (open) {
        // Stairs going up inside
        ctx.fillStyle = this.shade([168, 120, 64], z * 0.6);
        for (let st = 0; st < 4; st++) {
          let sy = bottom - ((st + 1) * (bottom - top)) / 5;
          if (k > 0.2 + st * 0.15) {
            ctx.fillRect(x, Math.round(sy), 1, Math.max(1, Math.round((bottom - top) / 10)));
          }
        }
      } else if ((x - a) % 3 === 0) {
        ctx.fillStyle = this.shade([100, 92, 80], z);
        ctx.fillRect(x, Math.round(top - arch), 1, Math.round(bottom - top + arch));
      }
    }
  },

  // Guards, the vizier and skeletons ahead, as detailed pixel billboards
  guards: function (car, v, H, U, VS) {
    let D = PrinceJS.RoadsterDash;
    (car.delegate.enemies || []).forEach((enemy) => {
      if (!enemy.alive || !enemy.visible || enemy.charName === "shadow") {
        return;
      }
      let room = car.level.rooms[enemy.room];
      if (!room) {
        return;
      }
      let ex = room.x * PrinceJS.ROOM_WIDTH + PrinceJS.Utils.convertX(enemy.charX);
      let feet = room.y * PrinceJS.ROOM_HEIGHT + 3 + enemy.charY;
      let rel = { x: ex - car.C.x, y: feet - car.C.y };
      let dist = rel.x * H.x + rel.y * H.y;
      let up = rel.x * U.x + rel.y * U.y;
      if (dist < 10 || dist > D.SLICE * D.SLICES) {
        return;
      }
      let head = { x: rel.x - U.x * 0, y: rel.y - 40 };
      let headUp = head.x * U.x + head.y * U.y;
      let z = dist / D.SLICE;
      let s = v.f / z;
      let yFeet = v.hy - (up / VS) * s;
      let yHead = v.hy - (headUp / VS) * s;
      let tall = yFeet - yHead;
      if (Math.abs(tall) < 2) {
        return;
      }
      this.figure(enemy, Math.round(v.cx), yHead, tall, z);
    });
  },

  figure: function (enemy, cx, yTop, tall, z) {
    let D = PrinceJS.RoadsterDash;
    let skel = enemy.charName === "skeleton";
    let rows = skel ? D.SKELETON : D.GUARD;
    let colors = skel ? D.SKELETON_COLORS : D.GUARD_COLORS[enemy.charName] || D.GUARD_COLORS.guard;
    let ps = tall / rows.length;
    let w = rows[0].length * Math.abs(ps);
    let x0 = cx - w / 2;
    let ctx = this.bmd.ctx;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        let col = colors[rows[r][c]];
        if (!col) {
          continue;
        }
        ctx.fillStyle = this.shade(col, z);
        let x = Math.round(x0 + c * Math.abs(ps));
        let y = Math.round(yTop + r * ps);
        let nx = Math.round(x0 + (c + 1) * Math.abs(ps));
        let ny = Math.round(yTop + (r + 1) * ps);
        ctx.fillRect(x, Math.min(y, ny), Math.max(1, nx - x), Math.max(1, Math.abs(ny - y)));
      }
    }
  },

  musicBins: function () {
    let radio = PrinceJS.RoadsterRadio;
    if (!radio.analyser || !radio.playing || radio.muted) {
      return null;
    }
    radio.analyser.getByteFrequencyData(radio.bins);
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      sum += radio.bins[i];
    }
    return { bins: radio.bins, level: sum / 16 / 255 };
  },

  drawScreen: function (car, music) {
    let S = PrinceJS.RoadsterDash.SCREEN;
    let blink = Math.floor(this.game.time.now / 250) % 2 === 0;

    // Bezel and glass
    this.px(S.x - 2, S.y - 2, S.w + 4, S.h + 4, "#545454");
    this.px(S.x - 1, S.y - 1, S.w + 2, S.h + 2, "#000000");
    this.px(S.x, S.y, S.w, S.h, "#05070f");

    // Status bar: gear, now playing, spectrum, battery
    let sy = S.y + 1;
    "PRND".split("").forEach((g, i) => this.text(g, S.x + 2 + i * 5, sy, g === "D" ? "#fcfcfc" : "#3c4c78"));
    let radio = PrinceJS.RoadsterRadio;
    let label = radio.playing && radio.song >= 0 ? radio.SONGS[radio.song].name : "RADIO OFF";
    if (label.length > 14) {
      let off = Math.floor(this.tick / 8) % (label.length + 3);
      label = (label + "   " + label).substr(off, 14);
    }
    this.px(S.x + 24, sy + 1, 1, 3, "#54fcfc");
    this.px(S.x + 25, sy + 2, 1, 1, "#54fcfc");
    this.text(label, S.x + 28, sy, "#54fcfc");
    for (let b = 0; b < 12; b++) {
      let lvl = 0;
      if (music) {
        let lo = Math.floor(Math.pow(100, b / 12));
        let hi = Math.max(lo + 1, Math.floor(Math.pow(100, (b + 1) / 12)));
        for (let i = lo; i < hi; i++) {
          lvl += music.bins[i];
        }
        lvl /= (hi - lo) * 255;
      }
      let h = Math.max(1, Math.round(lvl * 5));
      this.px(S.x + 88 + b * 2, sy + 5 - h, 1, h, h >= 5 ? "#fc5454" : h >= 4 ? "#fcfc54" : "#54fc54");
    }
    let bx = S.x + S.w - 30;
    this.px(bx, sy, 12, 5, "#545454");
    this.px(bx + 12, sy + 1, 1, 3, "#545454");
    this.px(bx + 1, sy + 1, 10, 3, "#000000");
    this.px(bx + 1, sy + 1, Math.ceil(this.battery / 10), 3, this.battery < 20 ? "#fc5454" : "#54fc54");
    this.text(Math.round(this.battery) + "%", bx + 15, sy, "#a8a8a8");
    this.px(S.x, S.y + 7, S.w, 1, "#10182c");

    this.drawSurroundings(car, S, blink);
    this.px(S.x + 98, S.y + 8, 1, S.h - 8, "#10182c");
    this.drawMap(car, S, blink);
  },

  // Surroundings, like a self-driving display: the level around the car as extruded grey 3D
  // blocks, guards as figures (orange when close), hazards, the route laid on the floor in blue,
  // and the car itself in the middle. Speed and gear float in the corner.
  drawSurroundings: function (car, S, blink) {
    let x0 = S.x;
    let y0 = S.y + 8;
    let w = 98;
    let h = S.h - 8;
    let ctx = this.bmd.ctx;
    for (let y = 0; y < h; y++) {
      let k = y / h;
      this.px(
        x0,
        y0 + y,
        w,
        1,
        `rgb(${Math.round(18 + k * 22)},${Math.round(20 + k * 22)},${Math.round(26 + k * 24)})`
      );
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();

    let sx = 7 / PrinceJS.BLOCK_WIDTH;
    let sy = 12 / PrinceJS.BLOCK_HEIGHT;
    let cx = x0 + w / 2 + 6;
    let cy = y0 + h / 2 + 8;
    let toX = (wx) => Math.round(cx + (wx - car.C.x) * sx);
    let toY = (wy) => Math.round(cy + (wy - car.C.y) * sy);
    let b = car.blockOf(car.C.x, car.C.y);
    let route = {};
    if (!PrinceJS.gpsHidden && car.gps) {
      car.gps.routeBlocks(30).forEach((r) => {
        route[r.i + "," + r.j] = true;
      });
    }
    let L = PrinceJS.Level;
    let dx = 3;
    let dy = -3;
    // Back rows first so nearer (lower) rows overlap them
    for (let j = b.j - 3; j <= b.j + 2; j++) {
      for (let i = b.i - 8; i <= b.i + 8; i++) {
        let c = car.blockCenter(i, j);
        let bx = toX(c.x - PrinceJS.BLOCK_WIDTH / 2);
        let by = toY(c.y - PrinceJS.BLOCK_HEIGHT / 2);
        let bw = toX(c.x + PrinceJS.BLOCK_WIDTH / 2) - bx;
        let bh = toY(c.y + PrinceJS.BLOCK_HEIGHT / 2) - by;
        let blk = car.blockAt(i, j);
        let cell = car.cellAt(c.x, c.y);
        let el = cell && cell.tile ? cell.tile.element : -1;
        if (!blk) {
          continue;
        }
        if (blk.wall) {
          let above = car.blockAt(i, j - 1);
          if (!above || !above.wall) {
            this.para(bx, by, bw, dx, dy, "#7a7e8c");
          }
          this.px(bx + bw, by + dy, dx, bh, "#4a4d58");
          this.px(bx, by, bw, bh, "#3a3d48");
          this.px(bx, by, bw, 1, "#5a5e6c");
        } else if (blk.floor) {
          let top = by + bh - 2;
          let road = route[i + "," + j] ? "#3e8cff" : el === L.TILE_LOOSE_BOARD ? "#a8945c" : "#8a8f9c";
          this.para(bx, top, bw, dx, dy, road);
          this.px(bx, top, bw, 2, "#4a4e5a");
          if (el === L.TILE_SPIKES) {
            for (let k = 1; k < bw; k += 2) {
              this.px(bx + k, top - 2, 1, 2, "#fc5454");
            }
          } else if (el === L.TILE_GATE) {
            for (let k = 0; k < 3; k++) {
              this.px(bx + 1 + k * 2, top - bh + 3, 1, bh - 3, "#7c8494");
            }
          } else if (el === L.TILE_EXIT_LEFT || el === L.TILE_EXIT_RIGHT) {
            this.px(bx + 1, top - 8, bw - 2, 8, blink ? "#54fc54" : "#2c8c2c");
          } else if (el === L.TILE_CHOPPER) {
            this.px(bx + 3, top - 9, 1, 9, "#fc5454");
          }
        }
      }
    }
    // Guards: grey figures, orange when the car is closing in
    (car.delegate.enemies || []).forEach((enemy) => {
      let room = enemy.alive && enemy.visible && car.level.rooms[enemy.room];
      if (!room) {
        return;
      }
      let ex = room.x * PrinceJS.ROOM_WIDTH + PrinceJS.Utils.convertX(enemy.charX);
      let ey = room.y * PrinceJS.ROOM_HEIGHT + 3 + enemy.charY - 18;
      let gx = toX(ex);
      let gy = toY(ey) + 3;
      let near = Math.abs(ex - car.C.x) < 80 && Math.abs(ey - car.C.y) < 30;
      let col = near ? (blink ? "#fca800" : "#fc5400") : "#c8c8d0";
      this.px(gx - 1, gy - 9, 2, 2, col);
      this.px(gx - 1, gy - 7, 3, 4, col);
      this.px(gx - 1, gy - 3, 1, 3, col);
      this.px(gx + 1, gy - 3, 1, 3, col);
    });
    // Destination marker, pinned to the edge when off screen
    if (car.target) {
      let tx = Math.max(x0 + 3, Math.min(x0 + w - 4, toX(car.target.x)));
      let ty = Math.max(y0 + 6, Math.min(y0 + h - 2, toY(car.target.y)));
      this.px(tx - 1, ty - 6, 3, 3, "#54fc54");
      this.px(tx, ty - 3, 1, 3, "#54fc54");
    }
    // The car, glossy white, in the middle
    this.drawCarIcon(car, cx, cy + 1);
    ctx.restore();

    // Speed, gear and power, top left like a real EV screen
    let mph = Math.min(999, car.mph());
    let str = String(mph);
    this.bigText(str, x0 + 2, y0 + 2, mph >= 250 ? "#40c0ff" : "#fcfcfc", 2);
    let tx = x0 + 3 + str.length * 12;
    this.text("MPH", tx, y0 + 2, "#a8a8a8");
    this.text("D", tx, y0 + 9, "#54fcfc");
    let rpm = Math.min(1, car.rpm / PrinceJS.RoadsterDash.MAX_RPM);
    this.px(x0 + 2, y0 + 17, 30, 1, "#2a2a34");
    this.px(x0 + 2, y0 + 17, Math.round(30 * rpm), 1, rpm > 0.85 ? (blink ? "#fc5454" : "#fcfc54") : "#40c0ff");
  },

  // Parallelogram top face of a block in the oblique projection
  para: function (x, y, w, dx, dy, color) {
    for (let k = 0; k < -dy; k++) {
      this.px(x + Math.round((dx * (k + 1)) / -dy), y - k - 1, w, 1, color);
    }
  },

  drawCarIcon: function (car, x, y) {
    let grounded = car.state === PrinceJS.Roadster.STATE_GROUNDED;
    let angle = grounded ? Math.atan2(car.F.y, car.F.x) : car.v.x < 0 ? Math.PI : 0;
    let flip = grounded ? car.mirror < 0 : false;
    let ca = Math.round(Math.cos(angle));
    let sa = Math.round(Math.sin(angle));
    // Side view, 13x5, nose at +u
    let rows = ["....GGGG.....", "..WWGGGGWWW..", "RWWWWWWWWWWWY", "WWWWWWWWWWWWW", "..BB.....BB.."];
    let col = { W: "#fcfcfc", G: "#1c2c4c", R: "#fc5454", Y: "#fcfc54", B: "#000000" };
    if (car.boosting && Math.floor(this.tick / 2) % 2) {
      this.px(x - ca * 9, y - sa * 9 - 1, 2, 2, "#40c0ff");
    }
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        let ch = rows[r][c];
        if (!col[ch]) {
          continue;
        }
        let u = c - 6;
        let v = (r - 4) * (flip ? -1 : 1);
        this.px(x + u * ca - v * sa, y + u * sa + v * ca, 1, 1, col[ch]);
      }
    }
  },

  // Turn arrow for the directions bar, 5x5
  arrow: function (x, y, dir, color) {
    let shapes = {
      up: ["00100", "01110", "10101", "00100", "00100"],
      down: ["00100", "00100", "10101", "01110", "00100"],
      left: ["00100", "01000", "11111", "01000", "00100"],
      right: ["00100", "00010", "11111", "00010", "00100"],
      flag: ["11110", "11110", "10000", "10000", "10000"]
    };
    let s = shapes[dir];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (s[r][c] === "1") {
          this.px(x + c, y + r, 1, 1, color);
        }
      }
    }
  },

  drawMap: function (car, S, blink) {
    let gps = car.gps;
    let mx = S.x + 100;
    let my = S.y + 9;
    let mw = S.w - 101;
    let mh = S.h - 9;
    let ctx = this.bmd.ctx;

    // Turn-by-turn bar
    let msg = (gps && gps.message) || "";
    let dir = /ARRIVED|EXIT/.test(msg)
      ? "flag"
      : /UP/.test(msg)
        ? "up"
        : /DROP/.test(msg)
          ? "down"
          : /</.test(msg) || car.routeH < 0
            ? "left"
            : "right";
    this.px(mx, my, mw, 7, "#0c1838");
    this.px(mx, my, 7, 7, "#40c0ff");
    this.arrow(mx + 1, my + 1, dir, "#05070f");
    let words = msg.replace(/[<>]/g, "").trim().slice(0, 21);
    this.text(words, mx + 9, my + 1, /RECALC|OFF/.test(msg) && blink ? "#fcfc54" : "#fcfcfc");

    // Dark-mode map of the level around the car
    let top = my + 8;
    let h = mh - 15;
    this.px(mx, top, mw, h, "#060a18");
    let cw = 4;
    let ch = 4;
    let cols = Math.floor(mw / cw);
    let rows = Math.floor(h / ch);
    let b = car.blockOf(car.C.x, car.C.y);
    let i0 = b.i - Math.floor(cols / 2);
    let j0 = b.j - Math.floor(rows / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let block = car.blockAt(i0 + c, j0 + r);
        let x = mx + c * cw;
        let y = top + r * ch;
        if (block && block.wall) {
          this.px(x, y, cw, ch, "#16224a");
        } else if (block && block.floor) {
          this.px(x, y + ch - 1, cw, 1, "#3c5c9c");
        } else if (!block) {
          this.px(x, y, cw, ch, "#020308");
        }
      }
    }
    // Route: a glowing cyan line with light pulses running toward the exit
    let pts = gps && !PrinceJS.gpsHidden ? gps.routeBlocks(60) : [];
    let center = (blk) => ({ x: mx + (blk.i - i0) * cw + 1, y: top + (blk.j - j0) * ch + 1 });
    let inside = (p) => p.x > mx && p.x < mx + mw - 2 && p.y > top && p.y < top + h - 2;
    [0, 1].forEach((pass) => {
      let k = 0;
      for (let n = 1; n < pts.length; n++) {
        let a = center(pts[n - 1]);
        let c = center(pts[n]);
        let steps = Math.max(Math.abs(c.x - a.x), Math.abs(c.y - a.y));
        for (let s = 0; s < steps; s++, k++) {
          let p = { x: a.x + Math.sign(c.x - a.x) * s, y: a.y + Math.sign(c.y - a.y) * s };
          if (!inside(p)) {
            continue;
          }
          if (pass === 0) {
            this.px(p.x - 1, p.y - 1, 4, 4, "#0c3058");
          } else {
            let pulse = (k - Math.floor(this.tick / 2)) % 10 === 0;
            this.px(p.x, p.y, 2, 2, pulse ? "#fcfcfc" : "#40e0ff");
          }
        }
      }
    });
    // Destination pin
    if (car.target) {
      let p = center(car.blockOf(car.target.x, car.target.y));
      p.x = Math.max(mx + 2, Math.min(mx + mw - 4, p.x));
      p.y = Math.max(top + 4, Math.min(top + h - 3, p.y));
      this.px(p.x - 1, p.y - 4, 4, 3, blink ? "#54fc54" : "#fcfc54");
      this.px(p.x, p.y - 1, 2, 2, "#54fc54");
    }
    // The car: a white chevron pointing the way it is heading
    let cp = center(b);
    let grounded = car.state === PrinceJS.Roadster.STATE_GROUNDED;
    let hx = (grounded ? car.F.x * (car.s < 0 ? -1 : 1) : car.v.x) < 0 ? -1 : 1;
    this.px(cp.x - hx * 2, cp.y - 2, 1, 6, "#fcfcfc");
    this.px(cp.x - hx, cp.y - 1, 1, 4, "#fcfcfc");
    this.px(cp.x, cp.y, 1, 2, "#fcfcfc");
    this.px(cp.x + hx, cp.y, 1, 2, "#fcfcfc");

    // Footer: ETA and the room's (made up) street name
    let fy = top + h + 2;
    let eta = gps && gps.eta !== undefined && gps.eta !== null ? gps.eta.toFixed(1) + "S" : "--";
    this.text("ETA " + eta, mx + 1, fy, "#54fcfc");
    let streets = PrinceJS.RoadsterDash.STREETS;
    let street = streets[(Math.abs(b.i * 3 + b.j * 7) + car.level.number) % streets.length];
    this.text(street, mx + mw - street.length * 4, fy, "#a8a8a8");
  },

  // A yoke wheel seen from the driver's seat: two tall grips flaring out at the top, a flat
  // bottom bar, a hub on two spokes with scroll wheels, and the prince's hands on the grips
  drawYoke: function () {
    let W = PrinceJS.RoadsterDash.YOKE_W;
    let ctx = this.yokeBmd.ctx;
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    // Mirror every left-half shape onto the right
    let both = (x, y, w, h, c) => {
      px(x, y, w, h, c);
      px(W - x - w, y, w, h, c);
    };
    let out = "#000000";
    let rim = "#24242c";
    let lit = "#4c4c5c";
    // Grips, flaring outward toward the top
    for (let y = 2; y < 34; y++) {
      let flare = y < 8 ? Math.round((8 - y) / 3) : 0;
      let x = 3 - flare;
      both(x, y, 11, 1, out);
      both(x + 1, y, 9, 1, rim);
      both(x + 2, y, 2, 1, lit);
    }
    both(2, 1, 9, 1, out);
    // Bottom bar with rounded corners
    px(6, 28, W - 12, 8, out);
    px(7, 29, W - 14, 6, rim);
    px(7, 29, W - 14, 1, lit);
    both(4, 34, 4, 1, out);
    // Spokes and hub with a silver trim ring
    both(13, 15, 16, 6, out);
    both(13, 16, 16, 4, rim);
    both(13, 16, 16, 1, lit);
    px(27, 8, W - 54, 22, out);
    px(28, 9, W - 56, 20, "#a8a8a8");
    px(29, 10, W - 58, 18, "#1c1c24");
    px(30, 11, W - 60, 16, "#101016");
    px(W / 2 - 4, 18, 8, 2, "#545454");
    px(W / 2 - 1, 15, 2, 8, "#545454");
    // Scroll wheels on the spokes
    both(18, 14, 4, 8, out);
    both(19, 15, 2, 6, "#7c8494");
    both(19, 16, 2, 1, "#a8a8a8");
    both(19, 18, 2, 1, "#a8a8a8");
    // Hands wrapped round the grips, thumbs on the inside, white sleeves running down
    both(0, 10, 15, 11, out);
    both(1, 11, 13, 9, "#c86c38");
    both(1, 11, 12, 7, "#fca868");
    both(2, 13, 10, 1, "#c86c38");
    both(2, 16, 10, 1, "#c86c38");
    both(12, 12, 4, 4, out);
    both(13, 12, 2, 3, "#fca868");
    both(0, 21, 12, 19, out);
    both(1, 21, 10, 19, "#fcfcfc");
    both(1, 21, 3, 19, "#a8a8a8");
    both(1, 21, 10, 1, "#a8a8a8");
    this.yokeBmd.dirty = true;
  },

  updateScore: function (car) {
    let score = Math.round(PrinceJS.roadsterScore || 0);
    if (score !== this.shown.score) {
      this.shown.score = score;
      this.scoreText.setText("SCORE " + ("000000" + score).slice(-7));
    }
    let mult = car.comboMult();
    let blink = Math.floor(this.game.time.now / 150) % 2 === 0;
    if (mult !== this.shown.mult) {
      this.shown.mult = mult;
      this.multText.setText(mult > 1 ? "X" + mult + " COMBO" : "");
    }
    this.multText.tint = mult >= 5 ? (blink ? 0xfc5454 : 0xfcfc54) : 0xfcfc54;
    // Combo timer drains left to right
    let ctx = this.comboBmd.ctx;
    ctx.clearRect(0, 0, 60, 2);
    let left = car.comboLeft();
    if (mult > 1 && left > 0) {
      ctx.fillStyle = "#545454";
      ctx.fillRect(0, 0, 60, 2);
      ctx.fillStyle = left < 0.3 && blink ? "#fc5454" : "#54fcfc";
      ctx.fillRect(0, 0, Math.round(60 * left), 2);
    }
    this.comboBmd.dirty = true;
  },

  setVisible: function (on) {
    this.sprite.visible = on;
    this.yoke.visible = on;
    this.scoreGroup.visible = on;
  }
};
