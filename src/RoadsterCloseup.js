"use strict";

// Close-up panel for the Roadster cutscene: the prince behind the driver's window rolls it down,
// flashes his sunglasses and runs a hand through his hair. Everything is drawn as pixel art.
PrinceJS.RoadsterCloseup = function (game) {
  this.game = game;
  let W = PrinceJS.RoadsterCloseup.W;
  let H = PrinceJS.RoadsterCloseup.H;

  this.group = game.add.sprite(
    0,
    0,
    this.layer((c) => this.drawBase(c))
  );
  this.group.fixedToCamera = true;
  this.group.anchor.setTo(0.5, 0.5);
  this.group.cameraOffset.setTo(PrinceJS.SCREEN_WIDTH, 70 * PrinceJS.SCALE_FACTOR);
  this.group.scale.set(0);

  this.add((c) => this.drawPrince(c));
  this.arms = [0, 1, 2].map((i) => this.add((c) => this.drawArm(c, i)));
  this.arms.forEach((arm) => (arm.visible = false));
  this.glint = this.add((c) => this.drawGlint(c));
  this.glint.visible = false;

  this.paneBmd = game.make.bitmapData(W, H);
  this.pane = this.group.addChild(game.make.sprite(-W / 2, -H / 2, this.paneBmd));
  this.add((c) => this.drawFrame(c));

  this.setWindow(0);
  this.size = 0;
};

PrinceJS.RoadsterCloseup.W = 64;
PrinceJS.RoadsterCloseup.H = 40;
PrinceJS.RoadsterCloseup.WINDOW_TOP = 5;
PrinceJS.RoadsterCloseup.WINDOW_BOTTOM = 26;

PrinceJS.RoadsterCloseup.COLORS = {
  roof: "#08080c",
  roofEdge: "#545454",
  inside: "#101018",
  seat: "#282830",
  red: "#d4d8e0",
  redLight: "#fcfcfc",
  redDark: "#7c8494",
  black: "#000000",
  skin: "#fca870",
  skinDark: "#a86848",
  hair: "#fcbc40",
  hairDark: "#a87020",
  shirt: "#fcfcfc",
  shirtShade: "#a8a8a8",
  glass: "rgba(0, 0, 60, 0.82)",
  glassShine: "rgba(84, 84, 252, 0.9)",
  white: "#fcfcfc",
  yellow: "#fcfc54"
};

PrinceJS.RoadsterCloseup.prototype = {
  layer: function (draw) {
    let bmd = this.game.make.bitmapData(PrinceJS.RoadsterCloseup.W, PrinceJS.RoadsterCloseup.H);
    draw(bmd.ctx);
    bmd.dirty = true;
    return bmd;
  },

  add: function (draw) {
    let W = PrinceJS.RoadsterCloseup.W;
    let H = PrinceJS.RoadsterCloseup.H;
    return this.group.addChild(this.game.make.sprite(-W / 2, -H / 2, this.layer(draw)));
  },

  rect: function (c, color, x, y, w, h) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  },

  // Window opening: slanted rear edge on the left, A-pillar slanting on the right
  windowSpan: function (y) {
    let top = PrinceJS.RoadsterCloseup.WINDOW_TOP;
    return { x0: 10 - Math.floor((y - top) / 3), x1: 50 + Math.floor((y - top) / 2) };
  },

  drawBase: function (c) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    let W = PrinceJS.RoadsterCloseup.W;
    let top = PrinceJS.RoadsterCloseup.WINDOW_TOP;
    let bottom = PrinceJS.RoadsterCloseup.WINDOW_BOTTOM;
    // Glass roof and body
    this.rect(c, C.roof, 0, 0, W, top);
    this.rect(c, C.roofEdge, 0, 0, W, 1);
    this.rect(c, C.red, 0, top, W, bottom - top);
    for (let y = top; y < bottom; y++) {
      let s = this.windowSpan(y);
      this.rect(c, C.inside, s.x0, y, s.x1 - s.x0, 1);
    }
    // Headrest behind the prince
    this.rect(c, C.seat, 20, 9, 8, 17);
    this.rect(c, C.seat, 18, 12, 2, 14);
    // Door
    this.rect(c, C.black, 0, bottom, W, 1);
    this.rect(c, C.redLight, 0, bottom + 1, W, 2);
    this.rect(c, C.red, 0, bottom + 3, W, 8);
    this.rect(c, C.redDark, 0, bottom + 11, W, 3);
    this.rect(c, C.black, 8, bottom + 5, 8, 1);
    this.rect(c, C.redLight, 8, bottom + 4, 8, 1);
    // Side mirror
    this.rect(c, C.black, 55, 19, 8, 6);
    this.rect(c, C.red, 56, 20, 7, 4);
    this.rect(c, C.redLight, 56, 20, 7, 1);
  },

  drawPrince: function (c) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    // Shoulders and shirt
    this.rect(c, C.shirt, 24, 22, 22, 4);
    this.rect(c, C.shirtShade, 24, 25, 22, 1);
    this.rect(c, C.skin, 32, 20, 6, 3);
    this.rect(c, C.skinDark, 32, 20, 6, 1);
    // Long hair falling behind the head
    this.rect(c, C.hair, 26, 8, 18, 12);
    this.rect(c, C.hairDark, 26, 14, 2, 8);
    this.rect(c, C.hairDark, 42, 14, 2, 8);
    // Face
    this.rect(c, C.skin, 28, 9, 14, 12);
    this.rect(c, C.skin, 29, 21, 12, 1);
    this.rect(c, C.skinDark, 28, 18, 1, 3);
    this.rect(c, C.skinDark, 41, 18, 1, 3);
    // Hair top and fringe
    this.rect(c, C.hair, 27, 5, 16, 4);
    this.rect(c, C.hair, 28, 9, 6, 2);
    this.rect(c, C.hair, 37, 9, 5, 1);
    this.rect(c, C.hairDark, 29, 5, 3, 1);
    this.rect(c, C.hairDark, 36, 6, 4, 1);
    // Sunglasses
    this.rect(c, C.black, 28, 12, 14, 1);
    this.rect(c, C.black, 29, 13, 5, 3);
    this.rect(c, C.black, 36, 13, 5, 3);
    this.rect(c, C.black, 34, 13, 2, 1);
    this.rect(c, C.glassShine, 30, 13, 1, 1);
    this.rect(c, C.glassShine, 37, 13, 1, 1);
    // Nose and grin
    this.rect(c, C.skinDark, 35, 16, 1, 2);
    this.rect(c, C.black, 32, 19, 6, 1);
    this.rect(c, C.white, 33, 19, 4, 1);
    this.rect(c, C.skinDark, 31, 18, 1, 1);
    this.rect(c, C.skinDark, 38, 18, 1, 1);
  },

  // Three poses of the hand going through the hair
  drawArm: function (c, pose) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    let arm = (points) => {
      points.forEach(([x, y, w, h, color]) => this.rect(c, color || C.skin, x, y, w, h));
    };
    if (pose === 0) {
      // Hand coming up beside the face
      arm([
        [44, 18, 4, 8, C.shirt],
        [44, 13, 4, 5],
        [43, 10, 5, 4],
        [42, 9, 2, 2]
      ]);
    } else if (pose === 1) {
      // Fingers in the fringe
      arm([
        [44, 19, 4, 7, C.shirt],
        [43, 14, 4, 5],
        [41, 10, 4, 4],
        [36, 5, 7, 5],
        [35, 4, 3, 1],
        [37, 6, 1, 1, C.skinDark],
        [39, 6, 1, 1, C.skinDark]
      ]);
    } else {
      // Swept back over the top, hair flicked up behind
      arm([
        [44, 19, 4, 7, C.shirt],
        [42, 13, 4, 6],
        [38, 8, 5, 5],
        [30, 4, 9, 4],
        [28, 4, 2, 2],
        [27, 3, 2, 1],
        [31, 5, 5, 1, C.skinDark],
        [20, 4, 6, 2, C.hair],
        [18, 2, 4, 2, C.hair],
        [24, 6, 4, 3, C.hair],
        [19, 3, 1, 1, C.hairDark]
      ]);
    }
  },

  drawGlint: function (c) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    // Lens flash with a four-point star
    this.rect(c, C.white, 36, 13, 5, 3);
    this.rect(c, C.white, 39, 9, 1, 11);
    this.rect(c, C.white, 34, 14, 11, 1);
    this.rect(c, C.yellow, 38, 12, 3, 5);
    this.rect(c, C.white, 39, 14, 1, 1);
    this.rect(c, C.white, 30, 13, 2, 2);
  },

  drawFrame: function (c) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    let W = PrinceJS.RoadsterCloseup.W;
    let H = PrinceJS.RoadsterCloseup.H;
    this.rect(c, C.white, 0, 0, W, 1);
    this.rect(c, C.white, 0, H - 1, W, 1);
    this.rect(c, C.white, 0, 0, 1, H);
    this.rect(c, C.white, W - 1, 0, 1, H);
  },

  // 0 = window closed, 1 = fully rolled down into the door
  setWindow: function (amount) {
    let C = PrinceJS.RoadsterCloseup.COLORS;
    let top = PrinceJS.RoadsterCloseup.WINDOW_TOP;
    let bottom = PrinceJS.RoadsterCloseup.WINDOW_BOTTOM;
    let c = this.paneBmd.ctx;
    c.clearRect(0, 0, PrinceJS.RoadsterCloseup.W, PrinceJS.RoadsterCloseup.H);
    let edge = top + Math.round((bottom - top) * amount);
    for (let y = edge; y < bottom; y++) {
      let s = this.windowSpan(y);
      this.rect(c, C.glass, s.x0, y, s.x1 - s.x0, 1);
      // Diagonal reflections that travel down with the glass
      let k = y - edge;
      this.rect(c, C.glassShine, s.x0 + 14 + k, y, 2, 1);
      this.rect(c, C.glassShine, s.x0 + 22 + k, y, 1, 1);
    }
    if (edge < bottom) {
      this.rect(c, C.roofEdge, this.windowSpan(edge).x0, edge, this.windowSpan(edge).x1 - this.windowSpan(edge).x0, 1);
    }
    this.paneBmd.dirty = true;
  },

  // Pop the panel in and out in chunky steps
  setSize: function (amount) {
    let steps = Math.round(Math.max(0, Math.min(1, amount)) * 4) / 4;
    if (steps !== this.size) {
      this.size = steps;
      this.group.scale.set(steps * 2);
    }
  },

  setArm: function (pose) {
    this.arms.forEach((arm, i) => (arm.visible = i === pose));
  },

  destroy: function () {
    this.group.destroy();
  }
};
