"use strict";

// In-dash GPS for the Roadster: a pixel-art mini-map in the top right corner that shows the
// level around the car, the planned route to the exit, an ETA and turn-by-turn directions.
// Press G to hide or show it.
PrinceJS.RoadsterGPS = function (game, roadster) {
  this.game = game;
  this.car = roadster;
  this.bmd = game.make.bitmapData(PrinceJS.RoadsterGPS.W, PrinceJS.RoadsterGPS.H);
  this.sprite = game.add.sprite(0, 0, this.bmd);
  this.sprite.fixedToCamera = true;
  this.sprite.cameraOffset.setTo(
    (PrinceJS.SCREEN_WIDTH - PrinceJS.RoadsterGPS.W - 2) * PrinceJS.SCALE_FACTOR,
    2 * PrinceJS.SCALE_FACTOR
  );
  this.sprite.visible = false;
  this.tick = 0;
  this.bestDist = null;
  this.offRoute = 0;
  this.message = "";
  this.gKey = game.input.keyboard.addKey(Phaser.Keyboard.G);
  this.gKey.onDown.add(() => {
    PrinceJS.gpsHidden = !PrinceJS.gpsHidden;
  });
};

PrinceJS.RoadsterGPS.W = 74;
PrinceJS.RoadsterGPS.H = 53;
PrinceJS.RoadsterGPS.COLS = 33; // blocks across the map (2px each)
PrinceJS.RoadsterGPS.ROWS = 11; // blocks down the map (3px each)

PrinceJS.RoadsterGPS.COLORS = {
  bezel: "#2a2a34",
  rim: "#7c8494",
  screen: "#000818",
  wall: "#3c4c78",
  floor: "#a8a8a8",
  route: "#ff40ff",
  car: "#fcfcfc",
  exit: "#54fc54",
  text: "#54fcfc",
  warn: "#fcfc54"
};

// 3x5 pixel font: each glyph is 5 rows of 3 bits
PrinceJS.RoadsterGPS.FONT = {
  A: [2, 5, 7, 5, 5],
  B: [6, 5, 6, 5, 6],
  C: [3, 4, 4, 4, 3],
  D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3],
  H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7],
  J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5],
  L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5],
  N: [6, 5, 5, 5, 5],
  O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3],
  R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6],
  T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7],
  V: [5, 5, 5, 5, 2],
  W: [5, 5, 7, 7, 5],
  X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7],
  0: [7, 5, 5, 5, 7],
  1: [2, 6, 2, 2, 7],
  2: [6, 1, 2, 4, 7],
  3: [6, 1, 2, 1, 6],
  4: [5, 5, 7, 1, 1],
  5: [7, 4, 6, 1, 6],
  6: [3, 4, 7, 5, 7],
  7: [7, 1, 2, 2, 2],
  8: [7, 5, 7, 5, 7],
  9: [7, 5, 7, 1, 6],
  ".": [0, 0, 0, 0, 2],
  ":": [0, 2, 0, 2, 0],
  "!": [2, 2, 2, 0, 2],
  "-": [0, 0, 7, 0, 0],
  "<": [1, 2, 4, 2, 1],
  ">": [4, 2, 1, 2, 4],
  "^": [2, 5, 0, 0, 0],
  v: [0, 0, 0, 5, 2],
  "/": [1, 1, 2, 4, 4],
  " ": [0, 0, 0, 0, 0]
};

PrinceJS.RoadsterGPS.prototype = {
  update: function () {
    let car = this.car;
    let show =
      !PrinceJS.gpsHidden &&
      car.target &&
      [PrinceJS.Roadster.STATE_GROUNDED, PrinceJS.Roadster.STATE_AIRBORNE, PrinceJS.Roadster.STATE_DONE].includes(
        car.state
      );
    // The map itself is drawn on the cockpit's center screen (RoadsterDash); this corner
    // version only shows if there is no cockpit
    let dash = car.delegate.ui && car.delegate.ui.dash;
    this.sprite.visible = show && !dash;
    if (!show) {
      return;
    }
    this.tick++;
    if (this.tick % 2 === 0) {
      this.updateDirections();
      if (!dash) {
        this.game.world.bringToTop(this.sprite);
        this.draw();
      }
    }
  },

  // Walk the planned route from the car's block
  routeBlocks: function (max) {
    let car = this.car;
    let b = car.blockOf(car.C.x, car.C.y);
    let blocks = [b];
    for (let step = car.route; step && blocks.length < max; ) {
      b = { i: b.i + step.dx, j: b.j + step.dy, dx: step.dx, dy: step.dy };
      blocks.push(b);
      step = car.routeStep(b.i, b.j);
    }
    return blocks;
  },

  updateDirections: function () {
    let car = this.car;
    if (car.state === PrinceJS.Roadster.STATE_DONE) {
      this.message = "YOU HAVE ARRIVED";
      this.eta = 0;
      return;
    }
    let b = car.blockOf(car.C.x, car.C.y);
    let dist = car.dist && car.dist[b.i + "," + b.j];
    if (dist === undefined) {
      this.message = "OFF ROAD!";
      this.eta = null;
      return;
    }
    // Driving away from the route for a moment: recalculate, very dramatically
    if (this.bestDist === null || dist < this.bestDist) {
      this.bestDist = dist;
      this.offRoute = 0;
    } else if (dist > this.bestDist + 2) {
      this.offRoute++;
      if (this.offRoute > 20) {
        this.bestDist = dist;
        this.recalc = 40;
      }
    }
    let speed = Math.max(220, Math.abs(car.state === PrinceJS.Roadster.STATE_GROUNDED ? car.s : car.v.x));
    this.eta = (dist * PrinceJS.BLOCK_WIDTH) / speed;
    if (this.recalc > 0) {
      this.recalc--;
      this.message = "RECALCULATING...";
      return;
    }
    if (car.mph() >= 250 && Math.floor(this.tick / 60) % 4 === 3) {
      this.message = "SPEED CAMERA AHEAD";
      return;
    }

    let blocks = this.routeBlocks(24);
    let first = blocks[1];
    if (!first) {
      this.message = "EXIT AHEAD";
      return;
    }
    let maneuver = (step) => {
      let wall = step.dx && (car.blockAt(step.i, step.j) || {}).wall;
      if (wall) {
        return "SMASH WALL";
      }
      if (step.dy === -1) {
        return "GO UP";
      }
      if (step.dy === 1) {
        return "DROP DOWN";
      }
      return step.dx > 0 ? "KEEP RIGHT >" : "< KEEP LEFT";
    };
    let now = maneuver(first);
    if (now !== maneuver({ dx: first.dx, dy: 0, i: -1, j: -1 }) || first.dy !== 0) {
      this.message = now + " NOW!";
      return;
    }
    // Next change of direction along the route
    for (let n = 2; n < blocks.length; n++) {
      let m = maneuver(blocks[n]);
      if (m !== now) {
        this.message = "IN " + (n - 1) + " BLK " + m.replace(/[<>] ?| ?[<>]/g, "");
        return;
      }
    }
    this.message = now;
  },

  draw: function () {
    let G = PrinceJS.RoadsterGPS;
    let C = G.COLORS;
    let car = this.car;
    let ctx = this.bmd.ctx;
    let px = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    ctx.clearRect(0, 0, G.W, G.H);

    // Dashboard bezel
    px(0, 0, G.W, G.H, C.bezel);
    px(1, 1, G.W - 2, G.H - 2, C.rim);
    px(2, 2, G.W - 4, G.H - 4, C.bezel);
    let mx = 4;
    let my = 4;
    let mw = G.COLS * 2;
    let mh = G.ROWS * 3;
    px(mx, my, mw, mh, C.screen);

    // Level around the car
    let b = car.blockOf(car.C.x, car.C.y);
    let i0 = b.i - Math.floor(G.COLS / 2);
    let j0 = b.j - Math.floor(G.ROWS / 2);
    for (let r = 0; r < G.ROWS; r++) {
      for (let c = 0; c < G.COLS; c++) {
        let block = car.blockAt(i0 + c, j0 + r);
        let x = mx + c * 2;
        let y = my + r * 3;
        if (!block || block.wall) {
          px(x, y, 2, 3, block ? C.wall : "#10182c");
        } else if (block.floor) {
          px(x, y + 2, 2, 1, C.floor);
        }
      }
    }

    // Route
    let blink = Math.floor(this.game.time.now / 200) % 2 === 0;
    this.routeBlocks(80).forEach((rb, n) => {
      let c = rb.i - i0;
      let r = rb.j - j0;
      if (n > 0 && c >= 0 && c < G.COLS && r >= 0 && r < G.ROWS && (n + Math.floor(this.tick / 4)) % 3 !== 0) {
        px(mx + c * 2, my + r * 3 + 1, 2, 1, C.route);
      }
    });

    // Exit flag (or an arrow on the map edge pointing at it)
    let exit = car.target && car.blockOf(car.target.x, car.target.y);
    if (exit) {
      let c = exit.i - i0;
      let r = exit.j - j0;
      if (c >= 0 && c < G.COLS && r >= 0 && r < G.ROWS) {
        px(mx + c * 2, my + r * 3 - 2, 1, 4, C.floor);
        px(mx + c * 2 + 1, my + r * 3 - 2, 2, 2, blink ? C.exit : C.warn);
      } else {
        let cx = Math.max(0, Math.min(G.COLS - 1, c));
        let cy = Math.max(0, Math.min(G.ROWS - 1, r));
        if (blink) {
          px(mx + cx * 2, my + cy * 3, 2, 2, C.exit);
        }
      }
    }

    // The car: a blinking blip with a nose pointing where it is heading
    let cc = b.i - i0;
    let cr = b.j - j0;
    let heading =
      car.state === PrinceJS.Roadster.STATE_GROUNDED ? car.F.x * Math.sign(car.s || 1) : Math.sign(car.v.x || 1);
    px(mx + cc * 2 - 1, my + cr * 3, 4, 2, blink || this.tick % 3 ? C.car : C.route);
    px(mx + cc * 2 + (heading > 0 ? 3 : -2), my + cr * 3, 1, 1, C.warn);

    // ETA and directions
    let ty = my + mh + 2;
    let eta = this.eta === null || this.eta === undefined ? "--.-" : this.eta.toFixed(1);
    this.text("GPS", 4, ty, C.warn);
    this.text("ETA " + eta + "S", 70 - this.textWidth("ETA " + eta + "S"), ty, C.text);
    let msg = this.message;
    let urgent = /NOW|RECALC|SPEED|OFF/.test(msg);
    let color = urgent && !blink ? C.warn : C.text;
    let w = this.textWidth(msg);
    if (w <= mw) {
      this.text(msg, mx + Math.floor((mw - w) / 2), ty + 6, color);
    } else {
      // Scroll long messages like a real head unit
      let off = Math.floor(this.tick / 2) % (w + mw);
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, ty + 6, mw, 5);
      ctx.clip();
      this.text(msg, mx + mw - off, ty + 6, color);
      ctx.restore();
    }
    this.bmd.dirty = true;
  },

  textWidth: function (s) {
    return s.length * 4 - 1;
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

  destroy: function () {
    this.gKey.onDown.removeAll();
    this.game.input.keyboard.removeKey(Phaser.Keyboard.G);
    this.sprite.destroy();
    this.bmd.destroy();
  }
};
