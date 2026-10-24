"use strict";

// Roadster mod: a car that sticks to floors, walls and ceilings, does air flips,
// smashes through walls and gates, runs over guards and blasts through every level.
PrinceJS.Roadster = function (game, delegate) {
  this.game = game;
  this.delegate = delegate;
  this.level = delegate.level;
  this.kid = delegate.kid;

  this.roomGrid = {};
  Object.keys(this.level.rooms).forEach((id) => {
    let room = this.level.rooms[id];
    if (room) {
      this.roomGrid[room.x + "," + room.y] = parseInt(id);
    }
  });

  this.state = PrinceJS.Roadster.STATE_PARKED;
  this.C = { x: 0, y: 0 }; // car center (world units)
  this.P = { x: 0, y: 0 }; // contact point on surface (grounded)
  this.F = { x: 1, y: 0 }; // forward along surface
  this.D = { x: 0, y: 1 }; // "down" into surface
  this.v = { x: 0, y: 0 }; // velocity (airborne)
  this.s = 0; // speed along F (grounded)
  this.theta = 0;
  this.omega = 0;
  this.mirror = 1;
  this.dispAngle = 0;
  this.gasKey = 1;
  this.boosting = false;
  this.airSpin = 0;
  this.airTime = 0;
  this.surfacesVisited = {};
  this.prevUp = false;
  this.bumpCooldown = 0;
  this.ludicrousShown = false;
  this.zeroToSixty = -1;
  this.finished = false;
  this.lastPushed = null;

  this.views = {
    side: PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR),
    top: PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR_TOP),
    under: PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR_UNDER),
    rear: PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR_REAR),
    front: PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR_FRONT)
  };
  this.view = "side";
  this.roll = 0; // barrel roll around the car's long axis (visual 3D flips)
  this.yaw = 0; // turn-around progress around the vertical axis (visual 3D drifts)
  this.yawDur = 0.28;
  this.sprite = this.game.add.sprite(0, 0, this.views.side);
  this.sprite.anchor.setTo(0.5, 0.5);
  this.beam = this.game.make.sprite(30, 0, PrinceJS.Roadster.beamTexture(game));
  this.beam.anchor.setTo(0, 0.5);
  this.beam.visible = false;
  this.sprite.addChild(this.beam);
  this.bounce = 0;

  this.particles = [];
  let dot = this.game.make.bitmapData(1, 1);
  dot.fill(255, 255, 255);
  for (let i = 0; i < 160; i++) {
    let p = this.game.add.sprite(0, 0, dot);
    p.anchor.setTo(0.5, 0.5);
    p.visible = false;
    p.life = 0;
    this.particles.push(p);
  }

  this.arrow = this.game.add.sprite(0, 0, PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.ARROW));
  this.arrow.anchor.setTo(0.5, 0.5);
  this.arrow.visible = false;

  this.spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  this.hovering = false;
  this.hoverShown = false;

  this.findTarget();
  this.initAudio();
  this.combo = 0;
  this.comboAt = -99;
  this.rpm = 0;
  if (PrinceJS.roadsterScore === undefined || PrinceJS.currentLevel === 1) {
    PrinceJS.roadsterScore = 0;
  }
  this.gps = new PrinceJS.RoadsterGPS(game, this);

  if (this.delegate.ui) {
    this.game.world.bringToTop(this.delegate.ui.layer);
  }
};

PrinceJS.Roadster.STATE_PARKED = 0;
PrinceJS.Roadster.STATE_GROUNDED = 1;
PrinceJS.Roadster.STATE_AIRBORNE = 2;
PrinceJS.Roadster.STATE_DONE = 3;
PrinceJS.Roadster.STATE_CUTSCENE = 4;

// Collision grid offsets (world units) so that tiles line up with the drawn level
PrinceJS.Roadster.XOFF = 0;
PrinceJS.Roadster.YOFF = 1;

PrinceJS.Roadster.SCALE = 1.5; // the pixel art is drawn 1.5x so the car looms over the prince
PrinceJS.Roadster.H = 12; // half height of the car body
PrinceJS.Roadster.LOOK = 39; // front bumper look-ahead
PrinceJS.Roadster.ACCEL = 420;
PrinceJS.Roadster.BOOST_ACCEL = 1000;
PrinceJS.Roadster.TOP = 720;
PrinceJS.Roadster.BOOST_TOP = 1240;
PrinceJS.Roadster.COAST = 140;
PrinceJS.Roadster.BRAKE = 1400;
PrinceJS.Roadster.GRAVITY = 1000;
PrinceJS.Roadster.WALL_GRAVITY = 0.15; // magnetic tires: walls barely slow the car down
PrinceJS.Roadster.JUMP = 420;
PrinceJS.Roadster.SPIN = 11;
PrinceJS.Roadster.SMASH = 560;
PrinceJS.Roadster.MPH = 0.25;
PrinceJS.Roadster.COMBO_TIME = 3; // seconds to land the next stunt and keep the multiplier

// Pixel art in the DOS palette, one texel per game pixel
PrinceJS.Roadster.PALETTE = {
  k: "#000000",
  // Pearl white paint: bright highlight, cool grey body shading
  R: "#fcfcfc",
  r: "#d4d8e0",
  d: "#7c8494",
  g: "#08080c",
  G: "#6878a0",
  t: "#ff2020",
  y: "#fcfc54",
  s: "#545454",
  S: "#a8a8a8",
  w: "#a8e8fc"
};

// Electric roadster: glass roof, fastback, turbine wheels, side scoop
PrinceJS.Roadster.CAR = [
  ".....................ssssssssssssss...........................",
  "...............ssssssgggggGGGGgggggss.........................",
  ".........RRRRRRgggggggggggggggggggggGss.......................",
  "....RRRRRRRRrrrgggggggggggggggggggggggGsR.....................",
  ".ttRrrrrrrrrRRRRRRRRRRRRRRRRRRRRRRRRRRRRrRRR..................",
  ".ttrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrdrrrRRRRRRRRR.............",
  ".ttrrrrrrrrkkrrrrrrrrrrrrrrrrrrrrrrrdrrrrrrrrrrrkkRRRRRR......",
  ".rrrrrrrrkkkkkkrrrrrrrrrrrrrrrrrrrrrdrrrrrrrrrkkkkkkrrrwwww...",
  ".rrrrrrrkkksskkkrkkkkkkrrrrrrrrrrrrrdrrrrrrrrkkksskkkrrrrrrw..",
  ".rrrrrrkksSssSskkrrrdddkkkkrrrrrrrrrdrrrrrrrkksSssSskkrrrrrrR.",
  ".ddddddkksSssSskkdddddddddddddddddddddddddddkksSssSskkddddddd.",
  ".dddddkksSsSSsSskkdddddddddddddddddddddddddkksSsSSsSskkdddddd.",
  "....kkkksSsSSsSskkkkkkkkkkkkkkkkkkkkkkkkkkkkksSsSSsSskkkkk....",
  "........ksSssSsk.............................ksSssSsk.........",
  "........ksSssSsk.............................ksSssSsk.........",
  ".........kksskk...............................kksskk.........."
];

// Extra views for 3D barrel rolls and drifts: seen from above, below, the back and the front
PrinceJS.Roadster.CAR_TOP = [
  "........kkkkkkkk.............................kkkkkkkk.........",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....",
  "kkRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRk....",
  "kttRRRRRRRRRRRRRRRRRgggggggggggggggggggggggRRRRRRRRRRRRRRRkw..",
  "kttRRRRRRRRRRRRRRRRRGGGGGGGGGGGGGGGGgggggggggRRRRRRRRRRRRRRw..",
  "krrrrrrrrrrrrrrrrrrrgggggggggggggggggggggggggggrrrrrrrrrrrrrk.",
  "krrrrrrrrrrrrrrrrrrrgggggggggggggggggggggggggggrrrrrrrrrrrrrrk",
  "krrrrrrrrrrrrrrrrrrrgggggggggggggggggggggggggggrrrrrrrrrrrrrrk",
  "krrrrrrrrrrrrrrrrrrrgggggggggggggggggggggggggggrrrrrrrrrrrrrk.",
  "kttdddddddddddddddddgggggggggggggggggggggggggddddddddddddddw..",
  "kttdddddddddddddddddgggggggggggggggggggggggdddddddddddddddkw..",
  "kkdddddddddddddddddddddddddddddddddddddddddddddddddddddddk....",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....",
  "........kkkkkkkk.............................kkkkkkkk........."
];
PrinceJS.Roadster.CAR_UNDER = [
  "........kkkkkkkk.............................kkkkkkkk.........",
  "..kkkkkkkSSSSSSkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkSSSSSSkkkkk.....",
  "kksssssskSSSSSSkssssssssssssssssssssssssssssskSSSSSSkssssk....",
  "ksssssssssssssssssssssssssssssssssssssssssssssssssssssssssk...",
  "kssssssssssssssssSSSGSSSGSSSGSSSGSSSGSSSGSSSGssssssssssssssk..",
  "kssssssssssssssssSSGSSSGSSSGSSSGSSSGSSSGSSSGSsssssssssssssssk.",
  "ksssdddddddddddddSGSSSGSSSGSSSGSSSGSSSGSSSGSSdddddddddddddsssk",
  "kssssssssssssssssGSSSGSSSGSSSGSSSGSSSGSSSGSSSssssssssssssssssk",
  "kssssssssssssssssSSSGSSSGSSSGSSSGSSSGSSSGSSSGsssssssssssssssk.",
  "kssssssssssssssssSSGSSSGSSSGSSSGSSSGSSSGSSSGSssssssssssssssk..",
  "ksssssssssssssssssssssssssssssssssssssssssssssssssssssssssk...",
  "kksssssskSSSSSSkssssssssssssssssssssssssssssskSSSSSSkssssk....",
  "..kkkkkkkSSSSSSkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkSSSSSSkkkkk.....",
  "........kkkkkkkk.............................kkkkkkkk........."
];
PrinceJS.Roadster.CAR_REAR = [
  ".........ssssssss.........",
  "........gGGGGGGGGg........",
  ".......gggggggggggg.......",
  "......gggggggggggggg......",
  ".kRRRRRRRRRRRRRRRRRRRRRRk.",
  ".kRRRRRRRRRRRRRRRRRRRRRRk.",
  ".krrrrrrrrrrrrrrrrrrrrrrk.",
  ".krttttttttttttttttttttrk.",
  ".krrrrrrrrrrrrrrrrrrrrrrk.",
  ".kddddddddkkkkkkddddddddk.",
  ".kddddddddddddddddddddddk.",
  ".dddddddddddddddddddddddd.",
  ".kkkkkkkkkkkkkkkkkkkkkkkk.",
  ".kkkkk..............kkkkk.",
  ".kkkkk..............kkkkk.",
  "..kkk................kkk.."
];
PrinceJS.Roadster.CAR_FRONT = [
  ".........ssssssss.........",
  "........gGGGGGGGGg........",
  ".......gggggggggggg.......",
  "......gggggggggggggg......",
  ".kRRRRRRRRRRRRRRRRRRRRRRk.",
  ".kRRRRRRRRRRRRRRRRRRRRRRk.",
  ".krwwwrrrrrrrrrrrrrrwwwrk.",
  ".krrrrrrrrrrrrrrrrrrrrrrk.",
  ".krrrrrrrrrrrrrrrrrrrrrrk.",
  ".kdddddddkkkkkkkkdddddddk.",
  ".kddddddddddddddddddddddk.",
  ".dddddddddddddddddddddddd.",
  ".kkkkkkkkkkkkkkkkkkkkkkkk.",
  ".kkkkk..............kkkkk.",
  ".kkkkk..............kkkkk.",
  "..kkk................kkk.."
];

PrinceJS.Roadster.ARROW = [
  "kk......",
  "kyk.....",
  "kyyk....",
  "kyyyk...",
  "kyyyyk..",
  "kyyyk...",
  "kyyk....",
  "kyk.....",
  "kk......"
];

PrinceJS.Roadster.pixelArt = function (game, rows) {
  let bmd = game.make.bitmapData(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let color = PrinceJS.Roadster.PALETTE[row[x]];
      if (color) {
        bmd.ctx.fillStyle = color;
        bmd.ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  bmd.dirty = true;
  return bmd;
};

PrinceJS.Roadster.beamTexture = function (game) {
  // Headlight beam: dithered yellow cone
  let bmd = game.make.bitmapData(16, 5);
  bmd.ctx.fillStyle = PrinceJS.Roadster.PALETTE.y;
  for (let x = 0; x < 16; x++) {
    let spread = Math.floor(x / 6);
    for (let y = 2 - spread; y <= 2 + spread; y++) {
      if ((x + y) % 2 === 0 || x < 4) {
        bmd.ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  bmd.dirty = true;
  return bmd;
};

PrinceJS.Roadster.prototype = {
  // --- World queries ---------------------------------------------------------------

  roomAt: function (gx, gy) {
    let id = this.roomGrid[gx + "," + gy];
    return id && this.level.rooms[id] ? id : 0;
  },

  cellAt: function (x, y) {
    let lx = x - PrinceJS.Roadster.XOFF;
    let ly = y + PrinceJS.Roadster.YOFF;
    let gx = Math.floor(lx / PrinceJS.ROOM_WIDTH);
    let gy = Math.floor(ly / PrinceJS.ROOM_HEIGHT);
    let room = this.roomAt(gx, gy);
    if (!room) {
      return null;
    }
    lx -= gx * PrinceJS.ROOM_WIDTH;
    ly -= gy * PrinceJS.ROOM_HEIGHT;
    let c = Math.min(9, Math.floor(lx / PrinceJS.BLOCK_WIDTH));
    let r = Math.min(2, Math.floor(ly / PrinceJS.BLOCK_HEIGHT));
    return {
      room,
      c,
      r,
      cy: ly - r * PrinceJS.BLOCK_HEIGHT,
      tile: this.level.rooms[room].tiles[r * 10 + c]
    };
  },

  solid: function (x, y) {
    let cell = this.cellAt(x, y);
    if (!cell || !cell.tile) {
      return true;
    }
    let tile = cell.tile;
    if (tile.element === PrinceJS.Level.TILE_WALL) {
      return true;
    }
    if (cell.r === 0 && cell.cy < 5 && !(this.level.rooms[cell.room].links.up > 0)) {
      // Keep the car inside the visible part of the top rooms
      return true;
    }
    if (tile.element === PrinceJS.Level.TILE_SPACE || tile.isSpace()) {
      return false;
    }
    return cell.cy >= 57;
  },

  solidP: function (p, dx, dy) {
    return this.solid(p.x + dx, p.y + dy);
  },

  // --- Route planning (GPS) ------------------------------------------------------------
  // Every block of the level knows its distance to the exit, so at any moment the car knows
  // whether the route continues left, right, up or down from where it is.

  blockAt: function (i, j) {
    let gx = Math.floor(i / 10);
    let gy = Math.floor(j / 3);
    let room = this.roomAt(gx, gy);
    let tile = room && this.level.rooms[room].tiles[(j - gy * 3) * 10 + (i - gx * 10)];
    if (!tile) {
      return null;
    }
    return {
      wall: tile.element === PrinceJS.Level.TILE_WALL,
      floor: !(tile.element === PrinceJS.Level.TILE_SPACE || tile.isSpace()),
      plain: tile.element === PrinceJS.Level.TILE_FLOOR
    };
  },

  blockOf: function (x, y) {
    return {
      i: Math.floor((x - PrinceJS.Roadster.XOFF) / PrinceJS.BLOCK_WIDTH),
      j: Math.floor((y + PrinceJS.Roadster.YOFF) / PrinceJS.BLOCK_HEIGHT)
    };
  },

  blockCenter: function (i, j) {
    return {
      x: i * PrinceJS.BLOCK_WIDTH + PrinceJS.BLOCK_WIDTH / 2 + PrinceJS.Roadster.XOFF,
      y: j * PrinceJS.BLOCK_HEIGHT + PrinceJS.BLOCK_HEIGHT / 2 - PrinceJS.Roadster.YOFF
    };
  },

  // Moves out of block (i, j): sideways, down through a missing floor, or up through a gap
  // in the floor above. Walls can be entered (smashed) at a high cost.
  blockMoves: function (i, j) {
    let here = this.blockAt(i, j);
    if (!here) {
      return [];
    }
    let moves = [];
    [-1, 1].forEach((dx) => {
      let b = this.blockAt(i + dx, j);
      if (b) {
        moves.push({ dx, dy: 0, cost: b.wall ? 2 : 1 });
      }
    });
    if (here.wall) {
      return moves;
    }
    let below = this.blockAt(i, j + 1);
    if (below && !below.wall && (!here.floor || here.plain)) {
      // Through a gap, or straight through a plain floor tile (the car breaks it)
      moves.push({ dx: 0, dy: 1, cost: here.floor ? 4 : 1 });
    }
    let above = this.blockAt(i, j - 1);
    if (above && !above.wall && !above.floor) {
      moves.push({ dx: 0, dy: -1, cost: 3 });
    }
    return moves;
  },

  planRoute: function () {
    this.routeAt = this.game.time.now;
    this.dist = {};
    let t = this.target;
    if (!t) {
      return;
    }
    // Dijkstra from the exit over reversed moves (small integer costs: bucket queue)
    let goal = this.blockOf(t.x, t.y);
    let preds = {};
    Object.keys(this.roomGrid).forEach((key) => {
      let [gx, gy] = key.split(",").map(Number);
      for (let j = gy * 3; j < gy * 3 + 3; j++) {
        for (let i = gx * 10; i < gx * 10 + 10; i++) {
          this.blockMoves(i, j).forEach((m) => {
            let to = i + m.dx + "," + (j + m.dy);
            (preds[to] = preds[to] || []).push({ key: i + "," + j, cost: m.cost });
          });
        }
      }
    });
    let buckets = [[goal.i + "," + goal.j]];
    this.dist[buckets[0][0]] = 0;
    for (let d = 0; d < buckets.length; d++) {
      (buckets[d] || []).forEach((key) => {
        if (this.dist[key] !== d) {
          return;
        }
        (preds[key] || []).forEach((p) => {
          let nd = d + p.cost;
          if (this.dist[p.key] === undefined || nd < this.dist[p.key]) {
            this.dist[p.key] = nd;
            (buckets[nd] = buckets[nd] || []).push(p.key);
          }
        });
      });
    }
  },

  // Next move along the route from block (i, j), or null when off the map / unreachable
  routeStep: function (i, j) {
    let here = this.dist[i + "," + j];
    if (here === undefined || here === 0) {
      return null;
    }
    let best = null;
    this.blockMoves(i, j).forEach((m) => {
      let d = this.dist[i + m.dx + "," + (j + m.dy)];
      if (d !== undefined && d + m.cost === here && (!best || (m.dx && m.dx === this.F.x))) {
        best = { dx: m.dx, dy: m.dy, i, j };
      }
    });
    return best;
  },

  // The route goes straight through the wall ahead: smash it at any decent speed
  routeSmash: function (dx) {
    let r = this.route;
    if (!r || r.dx !== dx || !this.input || !this.input.follow) {
      return false;
    }
    let b = this.blockAt(r.i + r.dx, r.j);
    return !!(b && b.wall);
  },

  updateRoute: function () {
    if (!this.dist || this.game.time.now - this.routeAt > 500) {
      // Floors crumble and walls get smashed, so re-plan now and then
      this.planRoute();
    }
    let b = this.blockOf(this.C.x, this.C.y);
    this.route = this.routeStep(b.i, b.j);
    if (!this.route && this.dist[b.i + "," + b.j] !== 0) {
      // The long car straddles blocks: route from the best block it is touching
      let best = null;
      [-40, -20, 20, 40].forEach((dx) =>
        [-14, 0, 14].forEach((dy) => {
          let n = this.blockOf(this.C.x + dx, this.C.y + dy);
          let d = this.dist[n.i + "," + n.j];
          if (d !== undefined && d > 0 && (!best || d < best.d)) {
            best = { d, n };
          }
        })
      );
      if (best) {
        let step = this.routeStep(best.n.i, best.n.j);
        // Head for that block first if it is beside the car, then follow its route
        let toward = Math.sign(best.n.i - b.i);
        this.route = toward && step && step.dx !== -toward ? { dx: toward, dy: 0, i: b.i, j: b.j } : step;
      }
    }
    // Which way the route heads overall (the next sideways step), to tell whether the
    // player is following it or deliberately driving somewhere else
    this.routeH = 0;
    for (let n = 0, step = this.route; step && n < 8; n++) {
      if (step.dx) {
        this.routeH = step.dx;
        break;
      }
      step = this.routeStep(step.i + step.dx, step.j + step.dy);
    }
  },

  // --- Setup -------------------------------------------------------------------------

  findTarget: function () {
    this.target = null;
    let special = { 6: { room: 1, bottom: true }, 12: { room: 23 }, 14: { room: 5 } }[this.level.number];
    if (special && this.level.rooms[special.room]) {
      let room = this.level.rooms[special.room];
      this.target = {
        x: room.x * PrinceJS.ROOM_WIDTH + PrinceJS.ROOM_WIDTH / 2,
        y: room.y * PrinceJS.ROOM_HEIGHT + (special.bottom ? PrinceJS.ROOM_HEIGHT - 20 : PrinceJS.ROOM_HEIGHT / 2),
        room: special.room,
        special: true
      };
      return;
    }
    Object.keys(this.level.rooms).forEach((id) => {
      let room = this.level.rooms[id];
      if (!room || parseInt(id) === this.delegate.startRoom) {
        return;
      }
      room.tiles.forEach((tile) => {
        if (tile instanceof PrinceJS.Tile.ExitDoor) {
          this.target = {
            x: tile.x + 29,
            y: tile.y + 46,
            room: parseInt(id),
            door: tile
          };
        }
      });
    });
  },

  // Park the long car where it fits on clean floor (no pillars, gates or doors poking
  // through it) and clear of the prince: his own floor if there is room, else the nearest
  // ledge or room with a long enough stretch
  park: function () {
    let kid = this.kid;
    let L = PrinceJS.Level;
    let clean = [L.TILE_FLOOR, L.TILE_DEBRIS, L.TILE_TORCH, L.TILE_TORCH_WITH_DEBRIS, L.TILE_DEBRIS_ONLY];
    let pos = this.kidWorldPos();
    let kidX = pos ? pos.x : 0;
    let half = 48;
    let spot = null;
    let seen = { [kid.room]: true };
    let queue = [kid.room];
    while (queue.length && !spot) {
      let id = queue.shift();
      let room = this.level.rooms[id];
      let rows = id === kid.room ? [kid.charBlockY, 0, 1, 2] : [2, 1, 0];
      rows.some((row) => {
        let run = 0;
        for (let c = 0; c <= 10 && !spot; c++) {
          let tile = c < 10 && room.tiles[row * 10 + c];
          if (tile && clean.includes(tile.element)) {
            run++;
            continue;
          }
          if (run >= 4) {
            let x0 = room.x * PrinceJS.ROOM_WIDTH + (c - run) * PrinceJS.BLOCK_WIDTH + half + 4;
            let x1 = room.x * PrinceJS.ROOM_WIDTH + c * PrinceJS.BLOCK_WIDTH - half - 4;
            let mine = id === kid.room && row === kid.charBlockY;
            // On the prince's own floor, leave him a gap; elsewhere sit in the middle
            let target = mine ? kidX + kid.charFace * (half + 30) : (x0 + x1) / 2;
            let x = Math.max(x0, Math.min(x1, target));
            if (!mine || Math.abs(x - kidX) >= half + 24) {
              spot = { x, y: room.y * PrinceJS.ROOM_HEIGHT + row * PrinceJS.BLOCK_HEIGHT + 30 };
            }
          }
          run = 0;
        }
        return spot;
      });
      ["left", "right", "up", "down"].forEach((dir) => {
        let next = room.links[dir];
        if (next > 0 && !seen[next] && this.level.rooms[next]) {
          seen[next] = true;
          queue.push(next);
        }
      });
    }
    if (!spot) {
      let room = this.level.rooms[kid.room];
      let c = Math.max(1, Math.min(8, kid.charBlockX + 3 * kid.charFace));
      spot = {
        x: room.x * PrinceJS.ROOM_WIDTH + c * PrinceJS.BLOCK_WIDTH + PrinceJS.BLOCK_WIDTH / 2,
        y: room.y * PrinceJS.ROOM_HEIGHT + kid.charBlockY * PrinceJS.BLOCK_HEIGHT + 30
      };
    }
    this.placeOnFloor(spot.x, spot.y, spot.x >= kidX ? 1 : -1);
    this.state = PrinceJS.Roadster.STATE_PARKED;
    this.placed = true;
    this.sprite.visible = true;
    this.render(0);
  },

  placeOnFloor: function (x, y, face) {
    let i = 0;
    while (!this.solid(x, y + 1) && i++ < 400) {
      y++;
    }
    while (this.solid(x, y) && i++ < 800) {
      y--;
    }
    this.P = { x, y };
    this.D = { x: 0, y: 1 };
    this.F = { x: face, y: 0 };
    this.C = { x, y: y - PrinceJS.Roadster.H };
    this.s = 0;
    this.gasKey = face;
    this.mirror = this.cross(this.F, this.D);
    this.dispAngle = Math.atan2(this.F.y, this.F.x);
  },

  spawnDriving: function (face) {
    let kid = this.kid;
    let room = this.level.rooms[kid.room];
    let x = room.x * PrinceJS.ROOM_WIDTH + PrinceJS.Utils.convertX(kid.charX) + 8;
    let y = room.y * PrinceJS.ROOM_HEIGHT + 3 + kid.charY - 10;
    this.placeOnFloor(x, y, face);
    this.placed = true;
    this.enter(true);
  },

  enter: function (silent) {
    this.state = PrinceJS.Roadster.STATE_GROUNDED;
    this.startTime = this.game.time.now;
    this.kid.inRoadster = true;
    this.kid.visible = false;
    this.kid.sword.visible = false;
    PrinceJS.roadster = true;
    if (this.delegate.ui) {
      this.delegate.ui.setRoadster(true);
    }
    if (!silent) {
      PrinceJS.Utils.delayed(() => {
        if (this.delegate.roadster === this && !this.finished) {
          this.say("UP: JUMP/FLIP  SHIFT: LUDICROUS", 45);
        }
      }, 1200);
      this.zeroToSixty = 0;
    }
  },

  // --- Helpers -------------------------------------------------------------------------

  cross: function (a, b) {
    return a.x * b.y - a.y * b.x >= 0 ? 1 : -1;
  },

  say: function (text, ticks) {
    if (this.delegate.ui) {
      this.delegate.ui.showText(text, "trick");
      this.delegate.ui.hideTextTimer = ticks || 18;
    }
  },

  elapsed: function () {
    return (this.game.time.now - (this.startTime || this.game.time.now)) / 1000;
  },

  mph: function () {
    let speed = this.state === PrinceJS.Roadster.STATE_AIRBORNE ? Math.hypot(this.v.x, this.v.y) : Math.abs(this.s);
    return Math.round(speed * PrinceJS.Roadster.MPH);
  },

  shake: function (intensity, duration) {
    if (this.game.camera.shake) {
      this.game.camera.shake(intensity, duration);
    }
  },

  burst: function (x, y, count, color, speed, life, gravity) {
    for (let i = 0; i < this.particles.length && count > 0; i++) {
      let p = this.particles[i];
      if (p.life > 0) {
        continue;
      }
      let a = Math.random() * Math.PI * 2;
      let sp = speed * (0.3 + Math.random() * 0.7);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = life * (0.5 + Math.random() * 0.5);
      p.gravity = gravity;
      p.tint = Array.isArray(color) ? color[i % color.length] : color;
      p.scale.set(Math.random() < 0.35 ? 2 : 1);
      p.visible = true;
      p.alpha = 1;
      count--;
    }
  },

  trail: function (x, y, vx, vy, color, life, size = 1) {
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      if (p.life > 0) {
        continue;
      }
      p.x = x;
      p.y = y;
      p.vx = vx + (Math.random() - 0.5) * 40;
      p.vy = vy + (Math.random() - 0.5) * 40;
      p.life = life;
      p.gravity = false;
      p.scale.set(size);
      p.tint = color;
      p.visible = true;
      p.alpha = 1;
      return;
    }
  },

  updateParticles: function (dt) {
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      if (p.life <= 0) {
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.visible = false;
        continue;
      }
      if (p.gravity) {
        p.vy += 600 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.min(1, p.life * 3);
    }
  },

  // --- Input ---------------------------------------------------------------------------

  readInput: function () {
    let kid = this.kid;
    let up = kid.keyU();
    let input = {
      left: kid.keyL(),
      right: kid.keyR(),
      up,
      upPressed: up && !this.prevUp,
      down: kid.keyD(),
      boost: kid.keyS(),
      hover: this.spaceKey.isDown || PrinceJS.Touch.space
    };
    this.prevUp = up;
    input.h = input.right && !input.left ? 1 : input.left && !input.right ? -1 : 0;
    // Route assists only kick in while driving and not steering against the route
    let r = this.route;
    input.follow =
      (input.h !== 0 || input.boost) && !(r && input.h && input.h === -(r.dx || this.routeH)) && !this.hovering;
    return input;
  },

  // --- Main loop -----------------------------------------------------------------------

  update: function () {
    let dt = Math.min(this.game.time.elapsedMS, 50) / 1000;
    if (dt <= 0) {
      return;
    }
    this.updateParticles(dt);
    if (this.gps) {
      this.gps.update();
    }

    if (this.state === PrinceJS.Roadster.STATE_PARKED) {
      if (!this.placed) {
        // Wait for the kid's first frame so his block position is known
        this.sprite.visible = false;
        this.parkWait = (this.parkWait || 0) + 1;
        if (!this.delegate.firstUpdate && (this.kid.action === "stand" || this.parkWait > 240)) {
          this.park();
        }
        return;
      }
      this.checkDiscover();
      this.render(dt);
      return;
    }
    if (this.state === PrinceJS.Roadster.STATE_CUTSCENE) {
      this.updateCutscene(dt);
      this.render(dt);
      return;
    }
    if (this.state === PrinceJS.Roadster.STATE_DONE) {
      this.render(dt);
      this.updateAudio(0, false);
      return;
    }

    this.updateRoute();
    let input = this.readInput();
    this.input = input;
    this.boosting = input.boost;
    if (this.bumpCooldown > 0) {
      this.bumpCooldown -= dt;
    }

    if (this.state === PrinceJS.Roadster.STATE_GROUNDED) {
      this.updateGrounded(dt, input);
    } else {
      this.updateAirborne(dt, input);
    }

    this.unstick();
    this.checkEnemies();
    this.checkTiles();
    this.syncKid();
    this.updateCamera();
    this.checkTarget();
    this.render(dt);

    let mph = this.mph();
    if (this.delegate.ui) {
      this.delegate.ui.setMph(mph);
    }
    PrinceJS.RoadsterRadio.drive(mph, input.boost);
    // Motor RPM: tied to the wheels on the ground, free-revving to the limiter in the air
    let gasOn = input.left || input.right || input.boost;
    let rpmTarget =
      this.state === PrinceJS.Roadster.STATE_GROUNDED
        ? mph * 64 + (gasOn ? 900 : 0)
        : this.hovering
          ? 12000
          : gasOn
            ? 19500
            : mph * 40;
    this.rpm += (rpmTarget - this.rpm) * Math.min(1, dt * 7);
    if (this.delegate.ui && this.delegate.ui.dash) {
      this.delegate.ui.dash.update(this);
    }
    if (this.zeroToSixty >= 0) {
      this.zeroToSixty += dt;
      if (mph >= 60) {
        this.say("0-60 MPH IN " + this.zeroToSixty.toFixed(1) + "S", 25);
        this.zeroToSixty = -1;
      } else if (mph === 0 && !input.left && !input.right) {
        this.zeroToSixty = 0;
      }
    }
    if (mph >= 250 && !this.ludicrousShown) {
      this.ludicrousShown = true;
      this.trick("LUDICROUS SPEED", 1000);
      PrinceJS.Utils.flashScreen(this.game, 1, PrinceJS.Level.FLASH_WHITE, 40);
    }
    this.updateAudio(mph, input.left || input.right || input.boost || this.hovering);
  },

  kidWorldPos: function () {
    let kid = this.kid;
    let room = this.level.rooms[kid.room];
    if (!room) {
      return null;
    }
    return {
      x: room.x * PrinceJS.ROOM_WIDTH + PrinceJS.Utils.convertX(kid.charX + kid.charFdx * kid.charFace),
      y: room.y * PrinceJS.ROOM_HEIGHT + 3 + kid.charY
    };
  },

  checkDiscover: function () {
    let kid = this.kid;
    let pos = this.kidWorldPos();
    if (!kid.alive || !pos) {
      return;
    }
    let dx = Math.abs(pos.x - this.C.x);
    let sameFloor = Math.abs(pos.y - this.P.y) < 20;
    if (
      sameFloor &&
      dx < 120 &&
      ["stand", "running", "startrun", "turn", "step1"].some((a) => kid.action.startsWith(a))
    ) {
      this.startCutscene();
    } else if (Math.random() < 0.04) {
      this.trail(this.C.x + (Math.random() - 0.5) * 56, this.C.y - 4 + (Math.random() - 0.5) * 8, 0, -8, 0xfcfcfc, 0.3);
    }
  },

  // The prince discovers the car: letterbox, headlights blink, he walks over and gets in
  startCutscene: function () {
    this.state = PrinceJS.Roadster.STATE_CUTSCENE;
    this.cut = { t: 0, phase: "intro", enterAt: -1 };
    this.kid.inCutscene = true;
    this.kid.cutsceneKeys = {};

    let bmd = this.game.make.bitmapData(PrinceJS.SCREEN_WIDTH, 22);
    bmd.fill(0, 0, 0);
    this.bars = [this.game.add.sprite(0, 0, bmd), this.game.add.sprite(0, 0, bmd)];
    this.bars.forEach((bar) => {
      bar.fixedToCamera = true;
    });
    this.setBars(0);
    // The prince walks up on the near side of the car, so draw him in front of it
    this.game.world.bringToTop(this.kid);
    this.game.world.bringToTop(this.kid.sword);
    this.bars.forEach((bar) => this.game.world.bringToTop(bar));
    if (this.delegate.ui) {
      this.game.world.bringToTop(this.delegate.ui.layer);
    }
    this.sfx("sting");
  },

  setBars: function (amount) {
    let h = 22 * PrinceJS.SCALE_FACTOR;
    let bottom = (PrinceJS.SCREEN_HEIGHT - PrinceJS.UI_HEIGHT) * PrinceJS.SCALE_FACTOR;
    this.bars[0].cameraOffset.setTo(0, Math.round(-h + h * amount));
    this.bars[1].cameraOffset.setTo(0, Math.round(bottom - h * amount));
  },

  updateCutscene: function (dt) {
    let cut = this.cut;
    let kid = this.kid;
    cut.t += dt;
    let t = cut.t;

    if (cut.phase !== "outro") {
      this.setBars(Math.min(1, t / 0.4));
    }

    if (cut.phase === "intro") {
      // Headlights blink twice with an unlock chirp
      let blink = (t > 0.6 && t < 0.75) || (t > 0.9 && t < 1.05);
      this.beam.visible = blink;
      if (t > 0.6 && !cut.chirped) {
        cut.chirped = true;
        this.sfx("chirp");
      }
      if (t > 1.2 && !cut.said) {
        cut.said = true;
        this.say("WHAT SORCERY IS THIS?", 22);
      }
      if (t > 2.6) {
        cut.phase = "walk";
        cut.walkStart = t;
      }
    } else if (cut.phase === "walk") {
      // Run over, then take careful steps up to the driver's door
      let pos = this.kidWorldPos();
      let dx = pos ? this.C.x - pos.x : 0;
      let dir = dx > 0 ? "right" : "left";
      let facing = dx > 0 === kid.faceR();
      let timeout = t - cut.walkStart > 6;
      if (!pos || timeout || (Math.abs(dx) <= 14 && kid.action === "stand")) {
        kid.cutsceneKeys = {};
        cut.phase = "enter";
        cut.enterAt = t;
        kid.visible = false;
        kid.sword.visible = false;
        this.sfx("clunk");
        this.bounce = 1;
      } else if (Math.abs(dx) > 56) {
        kid.cutsceneKeys = { [dir]: true };
      } else if (kid.action !== "stand") {
        kid.cutsceneKeys = {};
      } else if (!facing) {
        kid.cutsceneKeys = { [dir]: true };
      } else {
        kid.cutsceneKeys = { [dir]: true, shift: true };
      }
    } else if (cut.phase === "enter") {
      this.updateEnterScene(t - cut.enterAt);
    } else if (cut.phase === "outro") {
      let o = (t - cut.outroAt) / 0.4;
      this.setBars(Math.max(0, 1 - o));
      if (o >= 1) {
        this.bars.forEach((bar) => bar.destroy());
        this.bars = null;
        this.beam.visible = false;
        this.engineOn = false;
        kid.inCutscene = false;
        kid.cutsceneKeys = {};
        this.enter(false);
      }
    }
  },

  // Inside the car: engine start, then a close-up of the window rolling down,
  // the sunglasses flashing and a hand through the hair. The motor keeps vooming.
  updateEnterScene: function (e) {
    let cut = this.cut;
    let once = (key, at, fn) => {
      if (e >= at && !cut[key]) {
        cut[key] = true;
        fn();
      }
    };
    once("started", 0.7, () => {
      this.beam.visible = true;
      this.engineOn = true;
      if (this.delegate.ui) {
        this.delegate.ui.setRoadster(true);
      }
      this.sfx("voom");
      this.burst(this.C.x - this.F.x * 48, this.P.y - 2, 25, [0xa8a8a8, 0x545454], 70, 0.8, false);
      this.say("ROADSTER ACQUIRED!", 22);
    });
    if (cut.started) {
      // Idle revs in the background
      cut.nextRev = cut.nextRev || e + 2.2;
      if (e >= cut.nextRev && e < 7.4) {
        cut.nextRev = e + 1.2 + Math.random() * 0.5;
        this.sfx("rev");
        this.bounce = 0.4;
        this.burst(this.C.x - this.F.x * 48, this.P.y - 2, 6, [0xa8a8a8, 0x545454], 50, 0.5, false);
      }
      this.updateAudio(8, false);
    }
    once("closeup", 1.9, () => {
      let room = this.level.rooms[this.delegate.currentCameraRoom];
      let localX = room ? this.C.x - room.x * PrinceJS.ROOM_WIDTH : 0;
      this.closeup = new PrinceJS.RoadsterCloseup(this.game);
      this.closeup.group.cameraOffset.x = (localX < PrinceJS.ROOM_WIDTH / 2 ? 230 : 90) * PrinceJS.SCALE_FACTOR;
      if (this.delegate.ui) {
        this.game.world.bringToTop(this.delegate.ui.layer);
      }
    });
    let cu = this.closeup;
    if (!cu) {
      return;
    }
    cu.setSize(e < 6.9 ? (e - 1.9) / 0.3 : 1 - (e - 6.9) / 0.3);
    once("whirr", 2.4, () => this.sfx("whirr"));
    if (e >= 2.4 && e <= 3.5) {
      cu.setWindow((e - 2.4) / 1.0);
    }
    once("shine1", 3.7, () => this.sfx("shine"));
    once("shine2", 4.05, () => this.sfx("shine"));
    cu.glint.visible = (e > 3.7 && e < 3.85) || (e > 4.05 && e < 4.3);
    once("dude", 4.7, () => this.say("DUDE, THIS IS SICK!", 40));
    let pose = -1;
    if (e > 4.6 && e < 4.85) {
      pose = 0;
    } else if (e > 4.85 && e < 5.15) {
      pose = 1;
    } else if (e > 5.15 && e < 5.65) {
      pose = 2;
    } else if (e > 5.65 && e < 5.85) {
      pose = 0;
    }
    cu.setArm(pose);
    if (e > 7.3) {
      cu.destroy();
      this.closeup = null;
      cut.phase = "outro";
      cut.outroAt = this.cut.t;
    }
  },

  updateGrounded: function (dt, input) {
    let R = PrinceJS.Roadster;
    let F = this.F;
    let D = this.D;
    let onFloor = D.y === 1;

    if (D.y !== 0) {
      // On floors and ceilings the arrows are absolute: right always means go right
      if (this.s < 0) {
        this.F = F = { x: -F.x, y: 0 };
        this.s = -this.s;
        this.mirror = this.cross(F, D);
      }
      this.gasKey = F.x;
      if (D.y === -1 && input.h === -F.x) {
        // Steering against the ceiling ride: let go and fly that way (without grabbing
        // the wall again on the way down, or the car would loop around the corner)
        this.s = 0;
        this.launch(input.h * 150, 60);
        this.noWallGrab = true;
        // Loop breaker: letting go of the ceiling twice in the same spot means the car is
        // going round in circles, so stop climbing the walls there for a while
        let now = this.now();
        this.letGos = (this.letGos || []).filter((g) => now - g.t < 8);
        if (this.letGos.some((g) => Math.abs(g.x - this.C.x) < 100)) {
          this.noClimb = { x: this.C.x, until: now + 6 };
        }
        this.letGos.push({ x: this.C.x, t: now });
        return;
      }
    }
    if (this.assistGrounded(dt, input)) {
      return;
    }
    let gas = this.gasKey === 1 ? input.right : input.left;
    let reverse = this.gasKey === 1 ? input.left : input.right;

    if (this.drift) {
      if (!onFloor) {
        this.drift = null;
      } else if (this.updateDrift(dt)) {
        return;
      } else {
        F = this.F;
        gas = true;
        reverse = false;
      }
    } else if (onFloor && reverse && !gas && this.s > 200) {
      // Opposite arrow at speed: throw it into a drift
      let dur = Math.min(0.75, 0.35 + this.s / 2400);
      this.drift = { t: 0, dur, s0: this.s };
      this.sfx("screech", dur);
      return;
    }
    if (onFloor && reverse && !gas && Math.abs(this.s) < 30) {
      // Turn around
      this.F = F = { x: -F.x, y: 0 };
      this.s = -this.s;
      this.gasKey = F.x;
      this.mirror = this.cross(F, D);
      gas = true;
      reverse = false;
    }

    let top = this.boosting ? R.BOOST_TOP : R.TOP;
    if (gas) {
      this.s += (this.s < 0 ? R.BRAKE : this.boosting ? R.BOOST_ACCEL : R.ACCEL) * dt;
    } else if (reverse || input.down) {
      if (this.s > 0) {
        this.s = Math.max(0, this.s - R.BRAKE * dt);
        if (this.s > 200 && onFloor) {
          this.trail(this.P.x - F.x * 27, this.P.y - 1, -F.x * 30, -20, 0x999999, 0.3);
        }
      } else if (reverse) {
        this.s = Math.max(-220, this.s - R.ACCEL * 0.6 * dt);
      }
    } else {
      let c = R.COAST * dt;
      this.s = Math.abs(this.s) <= c ? 0 : this.s - Math.sign(this.s) * c;
    }
    this.s += R.GRAVITY * F.y * R.WALL_GRAVITY * dt;
    if (this.s > top) {
      this.s = Math.max(top, this.s - 600 * dt);
    }

    if (input.hover) {
      this.launch(-D.x * 160, -D.y * 160);
      this.hovering = true;
      this.sfx("whoosh");
      if (!this.hoverShown) {
        this.hoverShown = true;
        this.say("HOVER MODE!", 18);
      }
      return;
    }

    if (input.upPressed) {
      this.launch(-D.x * R.JUMP, -D.y * R.JUMP);
      this.sfx("whoosh");
      let room = D.y === 1 ? this.clearance(-1, 88) : null;
      if (room !== null) {
        // Hop onto the ceiling: spin round so the wheels meet it (a 540 when there is time)
        let t = (R.JUMP - Math.sqrt(Math.max(0, R.JUMP * R.JUMP - 2 * R.GRAVITY * room))) / R.GRAVITY;
        this.startSpin(t > 0.2 ? Math.PI * 3 : Math.PI, t * 0.95, -this.mirror);
      }
      return;
    }

    // Move along the surface pixel by pixel
    let dist = Math.abs(this.s) * dt;
    let dir = Math.sign(this.s);
    while (dist > 0 && this.state === R.STATE_GROUNDED) {
      let step = Math.min(1, dist);
      dist -= step;
      F = this.F;
      D = this.D;
      let M = { x: F.x * dir, y: F.y * dir };

      // Something in front of the bumper?
      if (this.solidP(this.P, M.x * R.LOOK - D.x * 2, M.y * R.LOOK - D.y * 2)) {
        let k = 1;
        while (k < R.LOOK && !this.solidP(this.P, M.x * k - D.x * 2, M.y * k - D.y * 2)) {
          k++;
        }
        // A wall with nowhere to climb never blocks the car: it goes straight through
        let dead = dir !== 0 && D.y === 1 && this.deadEnd(M, k);
        if (
          dir > 0 &&
          ((this.boosting && this.s >= R.SMASH) || dead || this.routeSmash(M.x)) &&
          this.trySmash(this.P.x + M.x * k - D.x * 2, this.P.y + M.y * k - D.y * 2)
        ) {
          this.s = Math.max(this.s * 0.85, 200);
          continue;
        }
        if (dir !== 0 && !dead) {
          // Concave corner: the tires stick to the new surface, whatever the speed
          let K = { x: this.P.x + M.x * (k - 1), y: this.P.y + M.y * (k - 1) };
          let lift = 20;
          while (
            lift > 1 &&
            (this.solidP(K, -D.x * lift, -D.y * lift) || !this.solidP(K, -D.x * lift + M.x, -D.y * lift + M.y))
          ) {
            lift--;
          }
          this.P = { x: K.x - D.x * lift, y: K.y - D.y * lift };
          this.D = { x: M.x, y: M.y };
          this.F = dir > 0 ? { x: -D.x, y: -D.y } : { x: D.x, y: D.y };
          this.mirror = this.cross(this.F, this.D);
          this.onSurfaceChange();
          if (Math.abs(this.s) > 150) {
            this.sparks(4);
          }
          continue;
        }
        if (k > 1) {
          this.P.x += M.x * Math.min(step, k - 1);
          this.P.y += M.y * Math.min(step, k - 1);
          if (k > 2) {
            continue;
          }
        }
        this.bump();
        break;
      }

      this.P.x += M.x * step;
      this.P.y += M.y * step;

      if (!this.solidP(this.P, D.x, D.y)) {
        // Ran off the edge of the surface. Floors launch the car, walls and ceilings
        // wrap it around the corner so it never lets go.
        if (D.y !== 1) {
          let Pn = { x: this.P.x + D.x * 3, y: this.P.y + D.y * 3 };
          let Dn = { x: -M.x, y: -M.y };
          if (!this.solid(Pn.x, Pn.y) && this.solidP(Pn, Dn.x, Dn.y)) {
            this.P = Pn;
            this.D = Dn;
            this.F = dir > 0 ? { x: D.x, y: D.y } : { x: -D.x, y: -D.y };
            this.mirror = this.cross(this.F, this.D);
            this.onSurfaceChange();
            continue;
          }
        }
        this.launch(0, 0);
        this.aimDrop(input, M);
        let headroom = this.clearance(-1, 60);
        if (D.y === 1 && this.dropX == null && this.pitAhead(M) && (headroom === null || headroom > 40)) {
          // Pit ahead: ollie over it with a 360
          this.v.y = -280;
          this.startSpin(Math.PI * 2, 0.54, -this.mirror);
        }
        return;
      }
    }

    this.C = { x: this.P.x - this.D.x * R.H, y: this.P.y - this.D.y * R.H };

    if (this.boosting && Math.abs(this.s) > 100) {
      this.trail(this.C.x - this.F.x * 45, this.C.y - this.F.y * 45, -this.F.x * 80, -this.F.y * 80, 0x40c0ff, 0.25);
    }
    if (this.D.y !== 1 && Math.random() < 0.5) {
      this.sparks(1);
    }
    if (this.D.y !== 1) {
      // Every bit of wall and ceiling riding pays, times the multiplier
      this.surfDist = (this.surfDist || 0) + Math.abs(this.s) * dt;
      if (this.surfDist > 120) {
        this.surfDist -= 120;
        PrinceJS.roadsterScore += 25 * this.comboMult();
      }
    }
  },

  // Safety net: if the car's middle ever ends up inside solid rock, pop it out to the nearest
  // free spot and let it drop, instead of leaving it grinding inside a wall or floor
  unstick: function () {
    if (!this.solid(this.C.x, this.C.y)) {
      return;
    }
    for (let r = 4; r <= 96; r += 4) {
      for (let a = 0; a < 16; a++) {
        let ang = (a / 16) * Math.PI * 2 - Math.PI / 2;
        let x = this.C.x + Math.round(Math.cos(ang) * r);
        let y = this.C.y + Math.round(Math.sin(ang) * r);
        if (!this.boxHit(x, y)) {
          this.C = { x, y };
          this.v = { x: 0, y: 0 };
          this.s = 0;
          this.theta = this.F.x < 0 ? Math.PI : 0;
          this.mirror = this.F.x < 0 ? -1 : 1;
          this.roll = 0;
          this.autoSpin = null;
          this.airTime = 0;
          this.state = PrinceJS.Roadster.STATE_AIRBORNE;
          this.airTopY = y;
          return;
        }
      }
    }
  },

  // Drifting round: the car keeps sliding the old way, scrubbing off speed, while it swings
  // through its front view; then it snaps round and launches back the other way.
  // Returns true while the drift is still going.
  updateDrift: function (dt) {
    let d = this.drift;
    d.t += dt;
    let p = Math.min(1, d.t / d.dur);
    this.s = d.s0 * (1 - p) * (1 - p * 0.3);
    // Slide along the floor
    let M = { x: this.F.x, y: 0 };
    let dist = this.s * dt;
    for (let i = 0; i < dist; i++) {
      if (this.solidP(this.P, M.x * PrinceJS.Roadster.LOOK, -2) || !this.solidP(this.P, 0, 1)) {
        break;
      }
      this.P.x += M.x * Math.min(1, dist - i);
    }
    // Tire smoke from both axles, skid marks of sparks
    [-30, 30].forEach((o) => {
      this.trail(
        this.P.x + o + (Math.random() - 0.5) * 8,
        this.P.y - 3,
        -M.x * 20,
        -30 - Math.random() * 30,
        0xa8a8a8,
        0.7,
        2
      );
      if (Math.random() < 0.3) {
        this.trail(this.P.x + o, this.P.y - 1, -M.x * 60, -10, 0x545454, 0.5);
      }
    });
    this.C = { x: this.P.x, y: this.P.y - PrinceJS.Roadster.H };
    if (p < 1) {
      return true;
    }
    // Swing round and go
    this.drift = null;
    this.F = { x: -this.F.x, y: 0 };
    this.s = 120 + d.s0 * 0.45;
    this.gasKey = this.F.x;
    this.mirror = this.cross(this.F, this.D);
    this.dispAngle = Math.atan2(this.F.y, this.F.x);
    this.yaw = 0;
    this.burst(this.P.x, this.P.y - 2, 18, [0xa8a8a8, 0x545454, 0xfcfcfc], 90, 0.7, false);
    this.trick(d.s0 > 600 ? "LUDICROUS DRIFT" : "DRIFT 180", 500 + Math.round(d.s0));
    return false;
  },

  // --- Stunts & score ---------------------------------------------------------------------

  now: function () {
    return this.game.time.now / 1000;
  },

  comboMult: function () {
    return this.now() - this.comboAt < PrinceJS.Roadster.COMBO_TIME ? Math.min(10, this.combo) : 1;
  },

  comboLeft: function () {
    return Math.max(0, 1 - (this.now() - this.comboAt) / PrinceJS.Roadster.COMBO_TIME);
  },

  // Every stunt within the combo window raises the multiplier (up to x10)
  trick: function (name, base) {
    if (this.now() - this.comboAt >= PrinceJS.Roadster.COMBO_TIME) {
      this.combo = 0;
    }
    this.combo++;
    this.comboAt = this.now();
    let mult = Math.min(10, this.combo);
    let points = Math.round(base * mult);
    PrinceJS.roadsterScore += points;
    this.say(name + " +" + points + (mult > 1 ? " X" + mult : ""), 24);
    this.sfx("ding");
  },

  breakCombo: function () {
    if (this.comboMult() > 1) {
      this.combo = 0;
      this.comboAt = -99;
      return true;
    }
    return false;
  },

  // Scripted spin in the air (hops, pit jumps, ceiling hops, big drops), timed to finish
  // right before touching down so the car lands clean
  startSpin: function (total, time, dir) {
    this.autoSpin = { left: total, rate: total / Math.max(0.15, time), dir };
    this.usedAuto = true;
  },

  // Free space straight above / below the car body, in pixels (null when none within reach)
  clearance: function (dir, max) {
    let h = PrinceJS.Roadster.H;
    for (let k = 1; k < max; k += 2) {
      if (this.solid(this.C.x, this.C.y + dir * (h + k))) {
        return k;
      }
    }
    return null;
  },

  // Running off a ledge: does the floor carry on at the same height a little further on?
  pitAhead: function (M) {
    for (let d = 16; d < 130; d += 4) {
      let x = this.P.x + M.x * d;
      if (this.solid(x, this.P.y + 3) && !this.solid(x, this.P.y - 4)) {
        return true;
      }
    }
    return false;
  },

  // --- Route assists ---------------------------------------------------------------------

  // Hop up through gaps in the ceiling, and let go of walls and ceilings when the route
  // turns away from them. Returns true when the car left the surface.
  assistGrounded: function (dt, input) {
    let r = this.route;
    if (!r || !input.follow) {
      return false;
    }
    let D = this.D;
    let C = { x: this.P.x - D.x * PrinceJS.Roadster.H, y: this.P.y - D.y * PrinceJS.Roadster.H };
    let cx = this.blockCenter(r.i, r.j).x;
    if (D.y === 1 && r.dy === -1 && Math.abs(C.x - cx) <= Math.max(6, Math.abs(this.s) * dt + 2)) {
      this.P.x = cx;
      this.s = 0;
      this.launch(0, -380);
      this.climbing = true;
      this.startSpin(Math.PI * 2, 0.5, -this.mirror);
      this.sfx("whoosh");
      return true;
    }
    if (D.y === 1 && r.dy === 1 && (this.blockAt(r.i, r.j) || {}).floor) {
      // The route goes down through this floor: line up and break through it
      if (Math.abs(C.x - cx) <= Math.max(6, Math.abs(this.s) * dt + 2) && this.smashFloor(r.i, r.j)) {
        this.P.x = cx;
        this.s = 0;
        this.launch(0, 0);
        this.dropX = cx;
        return true;
      }
      return false;
    }
    if (D.y === 1 && r.dy === 1) {
      // Perched on the lip of the gap the route goes down: drop in
      this.s = 0;
      this.launch(0, 0);
      this.dropX = cx;
      return true;
    }
    if (D.x !== 0 && (r.dx === -D.x || r.dy === 1)) {
      this.s = Math.max(-150, Math.min(this.s, 150));
      this.launch(-D.x * 160, r.dy === 1 ? 0 : -120);
      return true;
    }
    if (D.y === -1 && r.dy === 1) {
      this.launch(0, 80);
      return true;
    }
    return false;
  },

  // Ran off a ledge: if the route drops down the gap ahead, dive into it instead of flying over
  aimDrop: function (input, M) {
    if (!input.follow || input.up || M.y !== 0) {
      return;
    }
    let b = this.blockOf(this.C.x + M.x * 20, this.C.y);
    let r = this.routeStep(b.i, b.j);
    this.dropX = r && r.dy === 1 ? this.blockCenter(b.i, b.j).x : null;
  },

  assistAirborne: function (dt, input) {
    let R = PrinceJS.Roadster;
    let r = this.route;
    if (this.hovering) {
      return;
    }
    if (input.h !== 0) {
      // Air steering
      let v = this.v.x + input.h * 900 * dt;
      if (Math.abs(v) < Math.max(Math.abs(this.v.x), R.TOP * 0.8)) {
        this.v.x = v;
      }
    }
    if (r && r.dy === 1 && input.follow && !input.up) {
      this.dropX = this.blockCenter(r.i, r.j).x;
    }
    if (this.dropX !== null && this.dropX !== undefined) {
      // Line up with the gap and fall straight down it
      this.v.x = Math.max(-500, Math.min(500, (this.dropX - this.C.x) * 10));
      if (r && r.dy !== 1 && Math.abs(this.dropX - this.C.x) < 4) {
        this.dropX = null;
      }
    }
    if (r && r.dy === -1 && input.follow) {
      // Thrusters lift the car up through the gap
      let cx = this.blockCenter(r.i, r.j).x;
      this.v.y = Math.min(this.v.y, -320);
      this.v.x = Math.max(-300, Math.min(300, (cx - this.C.x) * 8));
      this.trail(this.C.x - 21, this.C.y + 15, 0, 160, 0x5454fc, 0.2, 2);
      this.trail(this.C.x + 21, this.C.y + 15, 0, 160, 0xfcfcfc, 0.2, 2);
    } else if (this.climbing && r && r.dx) {
      // Through the gap: swing over onto the ledge the route continues on
      this.climbing = false;
      this.v.x = r.dx * Math.max(200, Math.abs(this.v.x));
      this.v.y = Math.min(this.v.y, -200);
    }
  },

  // Driving into a wall: climbing it only makes sense if it leads somewhere (an opening in
  // the wall, or a shaft going up). A wall that runs straight into a ceiling is a dead end to
  // stop against, otherwise the car would loop wall -> ceiling -> drop -> wall forever.
  deadEnd: function (M, k) {
    let P = this.P;
    let col = P.x + M.x * Math.max(0, k - 4);
    let wall = P.x + M.x * (k + 1);
    let n = this.noClimb;
    if (n && this.now() < n.until && Math.abs(P.x - n.x) < 120) {
      // Already went round this wall -> ceiling -> drop loop: not again
      return true;
    }
    for (let h = 2; h < 1600; h += 2) {
      if (!this.solid(wall, P.y - 2 - h)) {
        return false;
      }
      if (this.solid(col, P.y - 2 - h)) {
        let r = this.route;
        // ...unless the route itself climbs right here
        return !(r && r.dy === -1);
      }
    }
    return false;
  },

  sparks: function (n) {
    for (let i = 0; i < n; i++) {
      this.trail(
        this.P.x - this.F.x * 42 * Math.sign(this.s || 1),
        this.P.y - this.F.y * 42 * Math.sign(this.s || 1),
        -this.F.x * 120 * Math.sign(this.s || 1),
        -this.F.y * 120 * Math.sign(this.s || 1),
        i % 2 ? 0xffd800 : 0xff8000,
        0.25
      );
    }
  },

  bump: function () {
    let ahead = this.cellAt(this.C.x + this.F.x * (PrinceJS.Roadster.LOOK + 6), this.C.y);
    if (!ahead && this.D.y === 1 && this.now() - (this.edgeHintAt || -99) > 4) {
      // The only thing the car cannot drive through: the edge of the level map
      this.edgeHintAt = this.now();
      this.say("END OF THE MAP! U-TURN", 30);
    }
    if (Math.abs(this.s) > 300) {
      // Stop dead against the wall (bouncing back flipped the car around every frame)
      this.s = 0;
      this.shake(0.01, 120);
      this.burst(this.C.x + this.F.x * 45, this.C.y + this.F.y * 45, 12, 0xffd800, 140, 0.4, true);
    } else {
      this.s = 0;
    }
    if (this.bumpCooldown <= 0) {
      this.sfx("thud");
      this.bumpCooldown = 0.4;
    }
  },

  onSurfaceChange: function () {
    let D = this.D;
    if (D.x !== 0 && !this.surfacesVisited.wall) {
      this.surfacesVisited.wall = true;
      if (!this.surfacesVisited.ceiling) {
        this.trick("WALL RIDE", 250);
      }
    } else if (D.y === -1 && !this.surfacesVisited.ceiling) {
      this.surfacesVisited.ceiling = true;
      this.trick("CEILING RIDE", 500);
    } else if (D.y === 1 && this.surfacesVisited.ceiling) {
      this.surfacesVisited = {};
      this.trick("LOOP DE LOOP", 2500);
      this.sfx("flip");
    }
    if (D.y === 1) {
      this.surfacesVisited = {};
    }
  },

  launch: function (dvx, dvy) {
    let R = PrinceJS.Roadster;
    this.v = { x: this.F.x * this.s + dvx, y: this.F.y * this.s + dvy };
    this.C = { x: this.P.x - this.D.x * (R.H + 1), y: this.P.y - this.D.y * (R.H + 1) };
    // Make sure the collision box starts in free space
    for (let i = 0; i < 8 && this.boxHit(this.C.x, this.C.y); i++) {
      this.C.x -= this.D.x;
      this.C.y -= this.D.y;
    }
    this.theta = Math.atan2(this.F.y, this.F.x);
    this.dispAngle = this.theta;
    this.omega = 0;
    this.airSpin = 0;
    this.airTime = 0;
    this.takeoffMirror = this.mirror;
    this.state = R.STATE_AIRBORNE;
    this.autoSpin = null;
    this.usedAuto = false;
    this.roll = 0;
    this.drift = null;
    this.dropFlipDone = false;
    this.air180 = false;
    this.airTopY = this.C.y;
  },

  // Sample the car's box on a grid finer than the 6px floor slabs, so thin floors and ceilings
  // can never slip between the sample points
  boxHit: function (x, y) {
    let h = PrinceJS.Roadster.H;
    for (let dy = -h; dy <= h; dy += 4) {
      for (let dx = -h; dx <= h; dx += h) {
        if (this.solid(x + dx, y + dy)) {
          return true;
        }
      }
    }
    return false;
  },

  updateAirborne: function (dt, input) {
    let R = PrinceJS.Roadster;
    this.airTime += dt;
    this.hovering = input.hover;
    if (this.hovering) {
      this.updateHover(dt, input);
    } else {
      this.v.y = Math.min(1400, this.v.y + R.GRAVITY * dt);
      this.airStunts(input);
      this.updateSpin(dt, input);
    }
    this.airTopY = Math.min(this.airTopY, this.C.y);
    this.assistAirborne(dt, input);
    this.moveAirborne(dt);
  },

  // Jetpack package: cold-gas thrusters hold the car level in mid-air
  updateHover: function (dt, input) {
    this.settleRoll();
    let targetVy = input.up ? -170 : input.down ? 170 : 0;
    this.v.y += (targetVy - this.v.y) * Math.min(1, 5 * dt);
    let accel = this.boosting ? 900 : 500;
    if (input.left) {
      this.v.x -= accel * dt;
    } else if (input.right) {
      this.v.x += accel * dt;
    } else {
      this.v.x *= Math.pow(0.3, dt);
    }
    let top = this.boosting ? PrinceJS.Roadster.BOOST_TOP : PrinceJS.Roadster.TOP * 0.6;
    this.v.x = Math.max(-top, Math.min(top, this.v.x));

    // Face the direction of travel and level out
    if (Math.abs(this.v.x) > 20) {
      this.mirror = this.v.x > 0 ? 1 : -1;
    }
    let target = this.mirror === 1 ? 0 : Math.PI;
    let diff = Math.atan2(Math.sin(target - this.theta), Math.cos(target - this.theta));
    this.theta += diff * Math.min(1, 8 * dt);
    this.omega = 0;

    // Thruster jets under the wheels
    let down = { x: -Math.sin(this.theta) * this.mirror, y: Math.cos(this.theta) * this.mirror };
    let fx = Math.cos(this.theta);
    let fy = Math.sin(this.theta);
    [-27, 27].forEach((o) => {
      let x = this.C.x + fx * o + down.x * 14;
      let y = this.C.y + fy * o + down.y * 14;
      this.trail(x, y, down.x * 200, down.y * 200, Math.random() < 0.5 ? 0x5454fc : 0xfcfcfc, 0.22, 2);
      this.trail(x, y, down.x * 160, down.y * 160, 0x5454fc, 0.16, 1);
      if (Math.random() < 0.6) {
        this.trail(x, y, down.x * 120, down.y * 120, 0xfcfc54, 0.12, 2);
      }
    });
  },

  // Fold the barrel roll into the car's orientation: half a roll leaves it upside down.
  // Returns how far the roll was from flat, in radians.
  settleRoll: function () {
    let k = Math.round(this.roll / Math.PI);
    let off = this.roll - k * Math.PI;
    if (Math.abs(k) % 2 === 1) {
      this.mirror = -this.mirror;
    }
    this.roll = 0;
    return off;
  },

  airStunts: function (input) {
    let R = PrinceJS.Roadster;
    // Long way down: throw in a front flip (a double when there is room)
    if (!this.autoSpin && !this.dropFlipDone && this.v.y > 0 && !input.up && !input.down) {
      if (Math.abs(this.airSpin) < 0.5) {
        let d = this.clearance(1, 400);
        if (d !== null && d > 110) {
          let t = (-this.v.y + Math.sqrt(this.v.y * this.v.y + 2 * R.GRAVITY * d)) / R.GRAVITY;
          this.startSpin(Math.PI * 2 * (t > 0.9 ? 2 : 1), t * 0.85, this.mirror);
        }
      }
      this.dropFlipDone = true;
    }
    // Steer against the way the car faces: spin it round mid-air
    let facing = Math.sign(Math.cos(this.theta));
    if (
      input.h &&
      input.h === -facing &&
      !this.air180 &&
      !this.autoSpin &&
      this.airTime > 0.08 &&
      Math.abs(Math.sin(this.theta)) < 0.5
    ) {
      this.air180 = true;
      this.theta = Math.PI - this.theta;
      this.mirror = -this.mirror;
      this.yaw = 1;
      this.yawDur = 0.35;
      this.trick("AIR 180", 400);
    }
  },

  updateSpin: function (dt, input) {
    let R = PrinceJS.Roadster;
    // Flips are barrel rolls: the car rolls around its long axis, sideways to the camera
    if (this.autoSpin) {
      let a = this.autoSpin;
      let step = Math.min(a.left, a.rate * dt);
      this.roll += a.dir * step;
      this.airSpin += a.dir * step;
      a.left -= step;
      if (a.left <= 0) {
        this.autoSpin = null;
      }
      return;
    }

    let spin = input.up ? -this.mirror * R.SPIN : input.down ? this.mirror * R.SPIN : 0;
    this.roll += spin * dt;
    this.airSpin += spin * dt;
  },

  moveAirborne: function (dt) {
    let R = PrinceJS.Roadster;
    if (this.boosting && !this.hovering) {
      // Rocket thrusters (jetpack package)
      let fx = Math.cos(this.theta);
      let fy = Math.sin(this.theta);
      this.v.x += fx * R.BOOST_ACCEL * 0.7 * dt;
      this.v.y += fy * R.BOOST_ACCEL * 0.7 * dt;
      this.trail(this.C.x - fx * 45, this.C.y - fy * 45, -fx * 160, -fy * 160, 0x40c0ff, 0.3);
      this.trail(this.C.x - fx * 45, this.C.y - fy * 45, -fx * 120, -fy * 120, 0xffffff, 0.2);
    }
    let sp = Math.hypot(this.v.x, this.v.y);
    if (sp > R.BOOST_TOP * 1.1) {
      this.v.x *= (R.BOOST_TOP * 1.1) / sp;
      this.v.y *= (R.BOOST_TOP * 1.1) / sp;
    }

    let dx = this.v.x * dt;
    let dy = this.v.y * dt;
    let n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
    for (let i = 0; i < n && this.state === R.STATE_AIRBORNE; i++) {
      let nx = this.C.x + dx / n;
      if (this.boxHit(nx, this.C.y)) {
        if (this.hit({ x: Math.sign(dx), y: 0 })) {
          return;
        }
        dx = this.v.x * dt * ((n - i) / n);
      } else {
        this.C.x = nx;
      }
      if (this.state !== R.STATE_AIRBORNE) {
        return;
      }
      let ny = this.C.y + dy / n;
      if (this.boxHit(this.C.x, ny)) {
        if (this.hit({ x: 0, y: Math.sign(dy) })) {
          return;
        }
        dy = this.v.y * dt * ((n - i) / n);
      } else {
        this.C.y = ny;
      }
    }
  },

  // Returns true when the car landed on the surface
  hit: function (N) {
    let R = PrinceJS.Roadster;
    if (this.hovering) {
      // Thrusters keep the car off surfaces: just stop against them
      if (N.x !== 0) {
        this.v.x = 0;
      } else {
        this.v.y = 0;
      }
      return false;
    }
    if (N.y === 1) {
      this.land(N);
      return true;
    }
    if (N.x !== 0) {
      let fast = this.boosting && Math.abs(this.v.x) >= R.SMASH;
      if ((fast || this.routeSmash(N.x)) && this.trySmash(this.C.x + N.x * (R.H + 1), this.C.y)) {
        this.v.x *= 0.85;
        return false;
      }
      if (this.airTime > 0.05 && !this.noWallGrab) {
        this.land(N);
        return true;
      }
      this.v.x = 0;
      return false;
    }
    this.land(N);
    return true;
  },

  land: function (N) {
    let R = PrinceJS.Roadster;
    let T = { x: -N.y, y: N.x };
    let fa = { x: Math.cos(this.theta), y: Math.sin(this.theta) };
    let speed = Math.hypot(this.v.x, this.v.y);
    let vt = this.v.x * T.x + this.v.y * T.y;
    let F;
    let r = this.route;
    if (N.y === 1) {
      // Floors: face the way the car is moving (or pointing, when barely moving)
      let along = Math.abs(this.v.x) > 60 ? this.v.x * T.x : fa.x * T.x + fa.y * T.y;
      F = along >= 0 ? T : { x: -T.x, y: -T.y };
    } else if (N.x !== 0 && !(this.input && this.input.down) && !(r && r.dy === 1)) {
      // Hitting a wall: the tires grab it and climb, so the car never ping-pongs in a pit
      F = { x: 0, y: -1 };
    } else if (Math.abs(vt) > 60) {
      F = vt >= 0 ? T : { x: -T.x, y: -T.y };
    } else if (N.x !== 0) {
      F = { x: 0, y: -1 };
    } else {
      F = fa.x * T.x + fa.y * T.y >= 0 ? T : { x: -T.x, y: -T.y };
    }
    let rollOff = this.settleRoll();
    let Dair = { x: -Math.sin(this.theta) * this.mirror, y: Math.cos(this.theta) * this.mirror };
    let quality = N.y === 1 ? (Dair.x * N.x + Dair.y * N.y) * Math.cos(rollOff) : 1;
    if (quality < 0.4 && N.y === 1 && Math.abs(Math.cos(this.theta)) > 0.7 && this.air180) {
      quality = 1;
    }
    let impact = Math.abs(this.v.x * N.x + this.v.y * N.y);

    this.D = { x: N.x, y: N.y };
    this.F = F;
    this.s = this.v.x * F.x + this.v.y * F.y;
    if (N.y !== 1) {
      // Momentum carries over onto walls and ceilings
      this.s = Math.max(this.s, speed * 0.8);
    }
    this.P = { x: this.C.x + N.x * R.H, y: this.C.y + N.y * R.H };
    for (let i = 0; i < 4 && !this.solidP(this.P, N.x, N.y); i++) {
      this.P.x += N.x;
      this.P.y += N.y;
    }
    for (let i = 0; i < 6 && this.solidP(this.P, 0, 0); i++) {
      this.P.x -= N.x;
      this.P.y -= N.y;
    }
    this.mirror = this.cross(F, this.D);
    this.dispAngle = this.theta;
    this.state = R.STATE_GROUNDED;
    this.surfacesVisited = {};
    this.dropX = null;
    this.climbing = false;
    this.noWallGrab = false;

    let flips = Math.floor((Math.abs(this.airSpin) + 0.9) / (Math.PI * 2));
    if (this.autoSpin) {
      // Scripted spins always stick the landing
      this.autoSpin = null;
      quality = 1;
    }
    let drop = N.y === 1 ? this.C.y - this.airTopY : 0;
    if (quality < -0.3) {
      this.s *= 0.25;
      this.say(this.breakCombo() ? "WIPEOUT! COMBO LOST" : "WIPEOUT!");
      this.sfx("crash");
      this.shake(0.02, 250);
      this.burst(this.C.x, this.C.y, 25, [0xffd800, 0xff4000, 0x888888], 200, 0.6, true);
    } else if (quality < 0.4) {
      this.s *= 0.6;
      this.say("SKETCHY!");
      this.sfx("thud");
      this.burst(this.P.x, this.P.y, 10, 0xffd800, 120, 0.4, true);
    } else if (flips > 0) {
      let back = Math.sign(this.airSpin) === -this.takeoffMirror * Math.sign(F.x || 1);
      let names = ["", "", "DOUBLE ", "TRIPLE ", "QUADRUPLE "];
      let name = (flips < names.length ? names[flips] : flips + "X ") + (back ? "BARREL ROLL" : "CORKSCREW");
      this.trick(name, (this.usedAuto ? 600 : 1200) * flips);
      this.s += Math.sign(this.s || 1) * 120 * flips;
      this.sfx("flip");
      this.burst(this.C.x, this.C.y, 20 * flips, [0xffffff, 0xffd800, 0x40c0ff], 160, 0.7, false);
    } else if (this.airTime > 1.2) {
      this.trick("BIG AIR", 300 + Math.round(this.airTime * 300));
    }
    if (quality >= 0.4 && drop > 120) {
      this.trick("SKY DROP " + (drop / PrinceJS.BLOCK_HEIGHT).toFixed(1) + " FLOORS", Math.round(drop * 4));
    }
    if (impact > 500) {
      this.shake(0.012, 150);
      this.sfx("thud");
      this.burst(this.P.x, this.P.y, 8, 0xaaaaaa, 100, 0.4, true);
    }
    if (N.x !== 0) {
      this.onSurfaceChange();
    }
  },

  // --- Smashing walls ------------------------------------------------------------------

  // Break the floor of block (i, j) so the car drops through it
  smashFloor: function (i, j) {
    let gx = Math.floor(i / 10);
    let gy = Math.floor(j / 3);
    let room = this.roomAt(gx, gy);
    let c = i - gx * 10;
    let r = j - gy * 3;
    let old = room && this.level.rooms[room].tiles[r * 10 + c];
    if (!old || old.element !== PrinceJS.Level.TILE_FLOOR) {
      return false;
    }
    old.back.visible = false;
    old.front.visible = false;
    let space = new PrinceJS.Tile.Base(this.game, PrinceJS.Level.TILE_SPACE, 0, this.level.type);
    if (this.level.type === PrinceJS.Level.TYPE_PALACE) {
      space.back.frameName = old.key + "_0_1";
    }
    this.level.addTile(c, r, room, space);
    let colors =
      this.level.type === PrinceJS.Level.TYPE_DUNGEON ? [0x6c6c88, 0x9090a8, 0x484860] : [0xd8a858, 0xe0a45c, 0x9c6c34];
    this.burst(old.x + PrinceJS.BLOCK_WIDTH / 2, old.y + PrinceJS.BLOCK_HEIGHT + 10, 35, colors, 220, 0.8, true);
    this.sfx("boom");
    this.shake(0.025, 200);
    this.trick("BREAK THROUGH", 600);
    this.routeAt = 0;
    return true;
  },

  trySmash: function (x, y) {
    let cell = this.cellAt(x, y);
    if (!cell || !cell.tile || cell.tile.element !== PrinceJS.Level.TILE_WALL) {
      return false;
    }
    let old = cell.tile;
    old.back.visible = false;
    old.front.visible = false;
    let tile = new PrinceJS.Tile.Base(this.game, PrinceJS.Level.TILE_FLOOR, 0, this.level.type);
    this.level.addTile(cell.c, cell.r, cell.room, tile);
    if (tile.addDebris) {
      tile.addDebris();
    }
    let bx = old.x + PrinceJS.BLOCK_WIDTH / 2;
    let by = old.y + 13 + PrinceJS.BLOCK_HEIGHT / 2;
    let colors =
      this.level.type === PrinceJS.Level.TYPE_DUNGEON ? [0x6c6c88, 0x9090a8, 0x484860] : [0xd8a858, 0xe0a45c, 0x9c6c34];
    this.burst(bx, by, 45, colors, 260, 0.9, true);
    this.sfx("boom");
    this.shake(0.025, 200);
    this.trick("SMASH", 400);
    this.routeAt = 0;
    return true;
  },

  // --- Interactions --------------------------------------------------------------------

  checkTiles: function () {
    let center = this.cellAt(this.C.x, this.C.y);
    if (center && center.tile && center.tile.element === PrinceJS.Level.TILE_GATE) {
      let gate = center.tile;
      if (
        [
          PrinceJS.Tile.Gate.STATE_CLOSED,
          PrinceJS.Tile.Gate.STATE_DROPPING,
          PrinceJS.Tile.Gate.STATE_FAST_DROPPING
        ].includes(gate.state)
      ) {
        gate.closedFast = false;
        gate.state = PrinceJS.Tile.Gate.STATE_CLOSED;
        gate.raise();
        this.sfx("crash");
        this.burst(this.C.x, this.C.y, 16, [0x888888, 0xcccccc], 200, 0.5, true);
        this.shake(0.01, 100);
      }
    }
    if (this.state !== PrinceJS.Roadster.STATE_GROUNDED) {
      this.lastPushed = null;
      return;
    }
    let below = this.cellAt(this.P.x + this.D.x * 3, this.P.y + this.D.y * 3);
    if (!below || !below.tile || below.tile === this.lastPushed) {
      return;
    }
    let tile = below.tile;
    this.lastPushed = tile;
    if (tile.element === PrinceJS.Level.TILE_LOOSE_BOARD && tile.shake) {
      tile.shake(true);
    } else if (
      this.D.y === 1 &&
      [PrinceJS.Level.TILE_RAISE_BUTTON, PrinceJS.Level.TILE_DROP_BUTTON].includes(tile.element) &&
      tile.push
    ) {
      tile.push();
    }
  },

  checkEnemies: function () {
    let enemies = this.delegate.enemies;
    for (let i = 0; i < enemies.length; i++) {
      let enemy = enemies[i];
      if (!enemy.alive || !enemy.visible || ["skeleton", "shadow"].includes(enemy.charName)) {
        continue;
      }
      let room = this.level.rooms[enemy.room];
      if (!room) {
        continue;
      }
      let ex = room.x * PrinceJS.ROOM_WIDTH + PrinceJS.Utils.convertX(enemy.charX + enemy.charFdx * enemy.charFace);
      let ey = room.y * PrinceJS.ROOM_HEIGHT + 3 + enemy.charY - 18;
      if (Math.abs(ex - this.C.x) < 30 && Math.abs(ey - this.C.y) < 26) {
        this.kid.opponent = enemy;
        enemy.die();
        this.sfx("crash");
        this.burst(ex, ey, 30, [0xff0000, 0xaa0000, 0xffffff], 220, 0.7, true);
        this.shake(0.02, 200);
        this.trick(["BONK", "ROADKILL", "YEET", "OUT OF MY WAY"][PrinceJS.Utils.random(4)], 750);
        if (this.state === PrinceJS.Roadster.STATE_GROUNDED) {
          this.s *= 0.9;
        }
      }
    }
  },

  syncKid: function () {
    let kid = this.kid;
    let lx = this.P.x - PrinceJS.Roadster.XOFF;
    let ly =
      (this.state === PrinceJS.Roadster.STATE_GROUNDED ? this.P.y : this.C.y + PrinceJS.Roadster.H) +
      PrinceJS.Roadster.YOFF;
    let gx = Math.floor(lx / PrinceJS.ROOM_WIDTH);
    let gy = Math.floor(ly / PrinceJS.ROOM_HEIGHT);
    let room = this.roomAt(gx, gy);
    if (!room) {
      return;
    }
    kid.room = room;
    kid.baseX = gx * PrinceJS.ROOM_WIDTH;
    kid.baseY = gy * PrinceJS.ROOM_HEIGHT + 3;
    kid.charX = ((lx - gx * PrinceJS.ROOM_WIDTH) * 140) / 320 + 7;
    kid.charY = ly - gy * PrinceJS.ROOM_HEIGHT - 4;
    kid.charFdx = 0;
    kid.charFdy = 0;
    kid.charFace = this.F.x >= 0 ? 1 : -1;
    kid.charBlockX = Math.max(0, Math.min(9, PrinceJS.Utils.convertXtoBlockX(kid.charX)));
    kid.charBlockY = Math.max(0, Math.min(2, PrinceJS.Utils.convertYtoBlockY(kid.charY)));
  },

  updateCamera: function () {
    let gx = Math.floor(this.C.x / PrinceJS.ROOM_WIDTH);
    let gy = Math.floor(this.C.y / PrinceJS.ROOM_HEIGHT);
    let room = this.roomAt(gx, gy);
    if (room && room !== this.delegate.currentCameraRoom) {
      this.delegate.changeRoom(room, room);
    }
  },

  checkTarget: function () {
    let t = this.target;
    if (!t || this.finished) {
      return;
    }
    let hitTarget = false;
    if (t.door) {
      hitTarget = Math.abs(this.C.x - t.x) < 26 && Math.abs(this.C.y - t.y) < 30;
    } else if (t.special && this.level.number === 6) {
      // Level 6 ends by dropping through the pit in room 1
      hitTarget =
        (this.kid.room === t.room && this.C.y > t.y - 12) || this.kid.room === this.level.rooms[t.room].links.down;
    }
    if (!hitTarget) {
      return;
    }
    this.finished = true;
    this.state = PrinceJS.Roadster.STATE_DONE;
    if (t.door) {
      t.door.raise();
    }
    this.burst(this.C.x, this.C.y, 60, [0xffffff, 0xffd800, 0x40c0ff, 0xff2040], 260, 1.0, false);
    this.sprite.visible = false;
    this.game.sound.play("Victory");
    this.shake(0.02, 300);
    let bonus = Math.max(0, Math.round((60 - this.elapsed()) * 100));
    PrinceJS.roadsterScore += bonus;
    this.say("LEVEL " + this.level.number + " CLEAR " + this.elapsed().toFixed(1) + "S +" + bonus, 40);
    let level = PrinceJS.currentLevel;
    PrinceJS.Utils.delayed(() => {
      if (this.game && this.delegate.level === this.level) {
        this.delegate.nextLevel(level);
      }
    }, 1800);
  },

  // --- Rendering ---------------------------------------------------------------------

  render: function (dt) {
    let R = PrinceJS.Roadster;
    let sprite = this.sprite;
    let angle;
    if (this.state === R.STATE_AIRBORNE) {
      angle = this.theta;
      this.dispAngle = angle;
    } else {
      if (this.state === R.STATE_GROUNDED || this.state === R.STATE_PARKED) {
        this.C = { x: this.P.x - this.D.x * R.H, y: this.P.y - this.D.y * R.H };
      }
      let target = Math.atan2(this.F.y, this.F.x);
      let diff = Math.atan2(Math.sin(target - this.dispAngle), Math.cos(target - this.dispAngle));
      if (Math.abs(diff) > 2.4 && this.D.y !== 0) {
        // Turning around on a floor or ceiling: swing the car round instead of rolling it over
        this.dispAngle = target;
        diff = 0;
        this.yaw = 1;
      }
      let rate = 22 * dt;
      this.dispAngle += Math.abs(diff) <= rate ? diff : Math.sign(diff) * rate;
      angle = this.dispAngle;
    }
    // Snap to whole pixels and 22.5 degree steps to keep the pixel-art look
    let step = Math.PI / 8;
    let lift = 0;
    if (this.bounce > 0) {
      this.bounce = Math.max(0, this.bounce - dt * 2.5);
      lift = Math.round(Math.abs(Math.sin(this.bounce * Math.PI * 3)) * 2 * this.bounce);
    }
    sprite.x = Math.round(this.C.x);
    sprite.y = Math.round(this.C.y) - lift;
    sprite.rotation = Math.round(angle / step) * step;
    this.renderView(dt);

    this.renderArrow();
  },

  // Fake 3D in pixel art: the yaw (drifting round) and roll (barrel rolls) squash the side view
  // and swap in the front/back and top/bottom views when the car is edge-on to the camera
  renderView: function (dt) {
    let R = PrinceJS.Roadster;
    let q = (v) => Math.sign(v || 1) * Math.max(0.25, Math.round(Math.abs(v) * 4) / 4);
    let view = "side";
    let sx = 1;
    let sy = 1;
    if (this.drift) {
      // Mid-drift the car swings through its front view (with a little lean into the slide)
      let p = Math.min(1, this.drift.t / this.drift.dur);
      let f = Math.cos(Math.PI * p);
      if (Math.abs(f) < 0.4) {
        view = "front";
      } else {
        sx = q(f);
      }
      this.sprite.rotation += (p < 0.5 ? -1 : 1) * this.F.x * (Math.PI / 16);
    } else if (this.yaw > 0) {
      this.yaw = Math.max(0, this.yaw - dt / this.yawDur);
      let f = -Math.cos(Math.PI * (1 - this.yaw));
      if (Math.abs(f) < 0.4) {
        view = this.yawDur > 0.4 ? "front" : "rear";
        sx = 1;
      } else {
        sx = q(f);
      }
      if (this.state === R.STATE_GROUNDED && this.D.y === 1 && this.yawDur > 0.4) {
        // Tire smoke while drifting round
        this.trail(this.P.x + (Math.random() - 0.5) * 50, this.P.y - 2, 0, -25, 0xa8a8a8, 0.6, 2);
      }
      if (this.yaw === 0) {
        this.yawDur = 0.28;
      }
    }
    if (view === "side" && this.roll) {
      let c = Math.cos(this.roll);
      if (Math.abs(c) < 0.4) {
        view = Math.sin(this.roll) * this.mirror < 0 ? "top" : "under";
        sy = q(Math.abs(Math.sin(this.roll)));
      } else {
        sy = q(c);
      }
    }
    if (view !== this.view) {
      this.view = view;
      this.sprite.loadTexture(this.views[view]);
    }
    this.beam.alpha = view === "side" ? 1 : 0;
    this.sprite.scale.set(R.SCALE * sx, R.SCALE * sy * this.mirror);
  },

  renderArrow: function () {
    let t = this.target;
    let room = this.level.rooms[this.delegate.currentCameraRoom];
    if (!t || !room || !this.driving) {
      this.arrow.visible = false;
      return;
    }
    let bx = room.x * PrinceJS.ROOM_WIDTH;
    let by = room.y * PrinceJS.ROOM_HEIGHT;
    let blink = Math.floor(this.game.time.now / 250) % 2 === 0;
    this.arrow.visible = blink;
    if (t.x >= bx && t.x < bx + PrinceJS.ROOM_WIDTH && t.y >= by && t.y < by + PrinceJS.ROOM_HEIGHT) {
      this.arrow.x = t.x;
      this.arrow.y = Math.round(t.y - 36 - Math.abs(Math.sin(this.game.time.now / 150)) * 6);
      this.arrow.rotation = Math.PI / 2;
      this.arrow.visible = true;
      return;
    }
    // GPS: point a few blocks ahead along the route, not straight at the exit
    let aim = t;
    let b = this.blockOf(this.C.x, this.C.y);
    for (let n = 0, step = this.route; step && n < 3; n++) {
      b = { i: b.i + step.dx, j: b.j + step.dy };
      aim = this.blockCenter(b.i, b.j);
      step = this.routeStep(b.i, b.j);
    }
    let dx = aim.x - this.C.x;
    let dy = aim.y - this.C.y;
    this.arrow.rotation = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
    let len = Math.hypot(dx, dy) || 1;
    this.arrow.x = Math.round(Math.max(bx + 10, Math.min(bx + PrinceJS.ROOM_WIDTH - 10, this.C.x + (dx / len) * 40)));
    this.arrow.y = Math.round(Math.max(by + 10, Math.min(by + PrinceJS.ROOM_HEIGHT - 10, this.C.y + (dy / len) * 40)));
  },

  // --- Audio ---------------------------------------------------------------------------

  // Deep electric-motor bass: detuned sawtooth plus a sub-octave square, heavily low-passed
  initAudio: function () {
    this.audio = null;
    try {
      let ctx = this.game.sound.context;
      if (!ctx || !this.game.sound.usingWebAudio) {
        return;
      }
      let out = this.game.sound.masterGain || ctx.destination;
      let gain = ctx.createGain();
      gain.gain.value = 0;
      let filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 150;
      filter.Q.value = 6;
      let motor = ctx.createOscillator();
      motor.type = "sawtooth";
      motor.frequency.value = 30;
      let sub = ctx.createOscillator();
      sub.type = "square";
      sub.frequency.value = 15;
      let subGain = ctx.createGain();
      subGain.gain.value = 0.5;
      motor.connect(filter);
      sub.connect(subGain);
      subGain.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      motor.start();
      sub.start();

      let noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      let data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.audio = { ctx, out, gain, motor, sub, filter, noise };
    } catch (e) {
      this.audio = null;
    }
  },

  updateAudio: function (mph, throttle) {
    if (!this.audio) {
      return;
    }
    let a = this.audio;
    let t = a.ctx.currentTime;
    let on = (this.driving || this.engineOn) && !this.muted;
    let f = 28 + Math.min(mph, 340) * 0.3;
    a.motor.frequency.setTargetAtTime(f, t, 0.08);
    a.sub.frequency.setTargetAtTime(f / 2, t, 0.08);
    a.filter.frequency.setTargetAtTime((throttle ? 260 : 140) + mph * 1.4, t, 0.1);
    a.gain.gain.setTargetAtTime(on ? (throttle ? 0.16 : 0.08) + Math.min(mph, 340) / 4000 : 0, t, 0.12);
  },

  sfx: function (type, dur = 0.5) {
    if (!this.audio || this.muted) {
      return;
    }
    let a = this.audio;
    let ctx = a.ctx;
    let now = ctx.currentTime;
    let tone = (wave, f0, f1, dur, vol, delay = 0, cutoff = 400) => {
      let t = now + delay;
      let o = ctx.createOscillator();
      o.type = wave;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      let lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = cutoff;
      let g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp);
      lp.connect(g);
      g.connect(a.out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    let noise = (c0, c1, dur, vol, delay = 0) => {
      let t = now + delay;
      let src = ctx.createBufferSource();
      src.buffer = a.noise;
      let lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(c0, t);
      lp.frequency.exponentialRampToValueAtTime(c1, t + dur);
      let g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(lp);
      lp.connect(g);
      g.connect(a.out);
      src.start(t);
      src.stop(t + dur + 0.05);
    };
    switch (type) {
      case "thud":
        tone("sine", 90, 35, 0.22, 0.6);
        noise(300, 60, 0.12, 0.3);
        break;
      case "crash":
        noise(900, 80, 0.5, 0.5);
        tone("sine", 80, 30, 0.35, 0.7);
        break;
      case "boom":
        noise(600, 40, 0.9, 0.7);
        tone("sine", 60, 22, 0.8, 0.9);
        tone("square", 40, 20, 0.5, 0.2, 0, 120);
        break;
      case "whoosh":
        noise(150, 900, 0.25, 0.2);
        tone("sawtooth", 40, 80, 0.25, 0.25, 0, 200);
        break;
      case "flip":
        tone("sawtooth", 45, 110, 0.18, 0.35, 0, 300);
        tone("sawtooth", 55, 140, 0.18, 0.35, 0.12, 300);
        break;
      case "chirp":
        tone("square", 70, 70, 0.08, 0.3, 0, 250);
        tone("square", 70, 70, 0.08, 0.3, 0.3, 250);
        break;
      case "clunk":
        tone("square", 60, 30, 0.12, 0.4, 0, 200);
        noise(500, 80, 0.08, 0.4);
        break;
      case "sting":
        tone("sawtooth", 35, 30, 1.2, 0.35, 0, 160);
        tone("sawtooth", 52, 45, 1.2, 0.2, 0, 160);
        break;
      case "rev":
        // Background blip of the throttle: a deep voom up and back down
        tone("sawtooth", 28, 70, 0.35, 0.45, 0, 200);
        tone("square", 14, 35, 0.35, 0.2, 0, 140);
        tone("sawtooth", 70, 30, 0.6, 0.4, 0.33, 200);
        break;
      case "ding":
        tone("square", 660, 660, 0.06, 0.12, 0, 3000);
        tone("square", 990, 990, 0.09, 0.12, 0.06, 3000);
        break;
      case "skid":
        noise(2400, 500, 0.45, 0.35);
        tone("sawtooth", 60, 30, 0.3, 0.3, 0, 200);
        break;
      case "screech": {
        // Sustained tire screech: wobbling high band of noise over a squealing tone
        let t = now;
        let src = ctx.createBufferSource();
        src.buffer = a.noise;
        src.loop = true;
        let bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 6;
        bp.frequency.setValueAtTime(2600, t);
        bp.frequency.linearRampToValueAtTime(1500, t + dur);
        let g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
        g.gain.setValueAtTime(0.5, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
        src.connect(bp);
        bp.connect(g);
        g.connect(a.out);
        src.start(t);
        src.stop(t + dur + 0.15);
        let o = ctx.createOscillator();
        o.type = "square";
        o.frequency.setValueAtTime(720, t);
        let lfo = ctx.createOscillator();
        lfo.frequency.value = 23;
        let lg = ctx.createGain();
        lg.gain.value = 60;
        lfo.connect(lg);
        lg.connect(o.frequency);
        let og = ctx.createGain();
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
        og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
        let lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3000;
        o.connect(lp);
        lp.connect(og);
        og.connect(a.out);
        o.start(t);
        lfo.start(t);
        o.stop(t + dur + 0.1);
        lfo.stop(t + dur + 0.1);
        break;
      }
      case "whirr":
        tone("square", 55, 70, 1.0, 0.12, 0, 180);
        break;
      case "shine":
        tone("triangle", 1400, 2600, 0.12, 0.08, 0, 4000);
        tone("triangle", 2100, 3200, 0.1, 0.05, 0.06, 4000);
        break;
      case "voom":
        this.floorIt();
        break;
    }
  },

  // Flooring it: a huge electric VOOM. Sub thrust, a distorted motor growl that opens up,
  // the inverter whine climbing like a real EV, and a rush of air, all over about two seconds.
  floorIt: function () {
    let a = this.audio;
    if (!a || this.muted) {
      return;
    }
    let ctx = a.ctx;
    let t = ctx.currentTime;
    let bus = ctx.createGain();
    bus.gain.value = 1.4;
    let comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    bus.connect(comp);
    comp.connect(a.out);
    let shape = ctx.createWaveShaper();
    let curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 4);
    }
    shape.curve = curve;
    let voice = (type, freqs, vol, dest, end) => {
      let o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freqs[0], t);
      o.frequency.exponentialRampToValueAtTime(freqs[1], t + 0.7);
      o.frequency.exponentialRampToValueAtTime(freqs[2], t + end);
      let g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
      g.gain.setValueAtTime(vol, t + 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + end);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + end + 0.05);
    };
    // Sub-bass thrust you feel in your seat
    voice("sine", [32, 72, 40], 1.0, bus, 2.2);
    // Motor growl through a filter that opens as the revs climb
    let growl = ctx.createBiquadFilter();
    growl.type = "lowpass";
    growl.frequency.setValueAtTime(250, t);
    growl.frequency.exponentialRampToValueAtTime(2200, t + 0.7);
    growl.frequency.exponentialRampToValueAtTime(300, t + 2.0);
    growl.Q.value = 4;
    shape.connect(growl);
    growl.connect(bus);
    voice("sawtooth", [38, 150, 55], 0.7, shape, 2.0);
    voice("square", [19, 75, 28], 0.4, shape, 2.0);
    // Inverter whine
    voice("triangle", [380, 2600, 1200], 0.09, bus, 1.8);
    // Air rush
    let src = ctx.createBufferSource();
    src.buffer = a.noise;
    src.loop = true;
    let lp = ctx.createBiquadFilter();
    lp.type = "bandpass";
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(3000, t + 0.9);
    let ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.45, t + 0.6);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(bus);
    src.start(t);
    src.stop(t + 2.0);
    this.shake(0.012, 900);
  },

  mute: function (muted) {
    this.muted = muted;
    if (this.audio) {
      this.audio.gain.gain.setValueAtTime(0, this.audio.ctx.currentTime);
    }
  },

  destroy: function () {
    if (this.gps) {
      this.gps.destroy();
      this.gps = null;
    }
    if (this.closeup) {
      this.closeup.destroy();
      this.closeup = null;
    }
    if (this.audio) {
      try {
        this.audio.gain.gain.value = 0;
        this.audio.motor.stop();
        this.audio.sub.stop();
        this.audio.gain.disconnect();
      } catch (e) {
        // already stopped
      }
      this.audio = null;
    }
  }
};

Object.defineProperty(PrinceJS.Roadster.prototype, "driving", {
  get: function () {
    return this.state === PrinceJS.Roadster.STATE_GROUNDED || this.state === PrinceJS.Roadster.STATE_AIRBORNE;
  }
});
