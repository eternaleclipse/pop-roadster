"use strict";

// Roadster version of the final cutscene: the prince parks in the princess's chamber, rolls down
// the window ("NEED A RIDE?"), hops out, she runs into his arms, they both get in and blast off
// into the sunset.
PrinceJS.RoadsterEnding = function (game, onDone) {
  this.game = game;
  this.onDone = onDone;
  this.t = 0;
  this.tickTime = 0;
  this.done = {};

  this.scene = new PrinceJS.Scene(game);
  this.princess = new PrinceJS.Actor(game, 40, 165, -1, "princess");
  this.princess.action = "wait";
  this.kid = null;

  this.car = game.add.sprite(
    360,
    PrinceJS.RoadsterEnding.CAR_Y,
    PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR)
  );
  this.car.anchor.setTo(0.5, 0.5);
  this.car.scale.set(-PrinceJS.Roadster.SCALE, PrinceJS.Roadster.SCALE);
  this.car.z = 35;
  this.beam = this.car.addChild(game.make.sprite(30, 0, PrinceJS.Roadster.beamTexture(game)));
  this.beam.anchor.setTo(0, 0.5);
  this.beam.visible = false;
  this.carX = 360;
  this.carY = PrinceJS.RoadsterEnding.CAR_Y;
  this.carV = -520;
  this.carAngle = 0;
  this.bounce = 0;

  let dot = game.make.bitmapData(1, 1);
  dot.fill(255, 255, 255);
  this.particles = [];
  for (let i = 0; i < 160; i++) {
    let p = game.add.sprite(0, 0, dot);
    p.z = 36;
    p.visible = false;
    this.particles.push(p);
  }

  this.text = game.add.bitmapText(PrinceJS.SCREEN_WIDTH / 2, 186, "font", "", 16);
  this.text.anchor.setTo(0.5, 0.5);
  this.text.z = 90;

  this.cover = game.add.sprite(0, 0, "cover");
  this.cover.z = 100;
  game.add.tween(this.cover).to({ alpha: 0 }, 1500, Phaser.Easing.Linear.None, true);
  game.world.sort("z");

  // Reuse the car's synthesized motor and sound effects
  this.synth = Object.create(PrinceJS.Roadster.prototype);
  this.synth.game = game;
  this.synth.engineOn = true;
  this.synth.initAudio();
};

PrinceJS.RoadsterEnding.CAR_Y = 153;
// Parked in the open stretch between the two foreground columns
PrinceJS.RoadsterEnding.PARK_X = 190;
PrinceJS.RoadsterEnding.TICK = 0.12;

PrinceJS.RoadsterEnding.prototype = {
  once: function (key, at, fn) {
    if (this.t >= at && !this.done[key]) {
      this.done[key] = true;
      fn();
    }
  },

  say: function (text) {
    this.text.text = text;
  },

  update: function () {
    let dt = Math.min(this.game.time.elapsedMS, 50) / 1000;
    if (dt <= 0) {
      return;
    }
    this.t += dt;

    // Original actors and torches run at the classic 120ms tick
    this.tickTime += dt;
    while (this.tickTime >= PrinceJS.RoadsterEnding.TICK) {
      this.tickTime -= PrinceJS.RoadsterEnding.TICK;
      this.scene.update();
      this.princess.updateActor();
      if (this.kid) {
        this.kid.updateActor();
      }
    }

    if (this.sunset) {
      this.updateSunset(dt);
    } else {
      this.updateChamber(dt);
    }
    this.updateParticles(dt);
  },

  updateChamber: function (dt) {
    let R = PrinceJS.RoadsterEnding;
    let synth = this.synth;

    // Drive in from the right and skid to a stop next to the princess
    if (this.t > 0.8 && !this.done.parked) {
      let left = this.carX - R.PARK_X;
      this.carV = left > 0 ? -Math.max(40, Math.min(520, Math.sqrt(2 * 900 * left))) : 0;
      this.carX = Math.max(R.PARK_X, this.carX + this.carV * dt);
      if (left < 60 && Math.random() < 0.7) {
        this.puff(this.carX + 26, R.CAR_Y + 7, 40, -20, 0xa8a8a8, 0.4);
        this.puff(this.carX - 18, R.CAR_Y + 7, 40, -20, 0xa8a8a8, 0.4);
      }
      synth.updateAudio(Math.abs(this.carV) * 0.25, left > 120);
      if (this.carX <= R.PARK_X) {
        this.done.parked = this.t;
        this.bounce = 1;
        synth.sfx("thud");
        this.beam.visible = true;
        this.princess.action = "stand";
      }
    }
    if (this.done.parked) {
      let p = this.t - this.done.parked;
      if (!this.done.driveOff) {
        synth.updateAudio(8, false);
      }
      this.updateCloseup(p);

      this.once("exit", this.done.parked + 5.3, () => {
        // He climbs out on the princess's side
        synth.sfx("clunk");
        this.bounce = 0.6;
        this.kid = new PrinceJS.Actor(this.game, 66, 165, -1, "kid");
        this.kid.action = "stand";
        this.kid.z = 20;
        this.game.world.sort("z");
      });
      this.once("embrace", this.done.parked + 6.1, () => {
        this.game.sound.play("Embrace");
        this.princess.action = "embrace";
        this.say("");
      });
      this.once("hug", this.done.parked + 6.7, () => {
        this.kid.kill();
        this.kid = null;
      });
      this.once("in1", this.done.parked + 9.4, () => {
        this.princess.visible = false;
        synth.sfx("clunk");
        this.bounce = 0.6;
      });
      this.once("in2", this.done.parked + 9.8, () => {
        synth.sfx("clunk");
        this.bounce = 0.6;
      });
      this.once("driveOff", this.done.parked + 10.6, () => {
        synth.sfx("voom");
        this.game.camera.shake(0.01, 400);
        this.carV = 0;
      });
    }
    if (this.done.driveOff) {
      this.updateLiftoff(dt);
    }
    this.renderCar(dt);
  },

  updateCloseup: function (p) {
    this.once("closeupIn", this.done.parked + 0.6, () => {
      this.closeup = new PrinceJS.RoadsterCloseup(this.game);
      this.closeup.group.cameraOffset.x = 214 * PrinceJS.SCALE_FACTOR;
      this.closeup.group.z = 60;
      this.game.world.sort("z");
    });
    let cu = this.closeup;
    if (!cu) {
      return;
    }
    cu.setSize(p < 4.6 ? (p - 0.6) / 0.3 : 1 - (p - 4.6) / 0.3);
    this.once("whirr", this.done.parked + 1.1, () => this.synth.sfx("whirr"));
    if (p >= 1.1 && p <= 2.2) {
      cu.setWindow((p - 1.1) / 1.0);
    }
    this.once("shine", this.done.parked + 2.4, () => this.synth.sfx("shine"));
    cu.glint.visible = p > 2.4 && p < 2.65;
    this.once("ride", this.done.parked + 2.6, () => this.say("NEED A RIDE?"));
    if (p > 5) {
      cu.destroy();
      this.closeup = null;
    }
  },

  // Drive off to the left, pitch the nose up and light the rockets
  updateLiftoff: function (dt) {
    this.carV = Math.max(-700, this.carV - (this.done.rockets ? 600 : 260) * dt);
    if (this.carX < 120) {
      this.carAngle = Math.min((Math.PI * 3) / 8, this.carAngle + 1.4 * dt);
      if (!this.done.rockets) {
        this.done.rockets = true;
        this.synth.sfx("boom");
        this.game.camera.shake(0.02, 600);
      }
    }
    let a = this.carAngle;
    let speed = Math.abs(this.carV);
    this.carX -= Math.cos(a) * speed * dt;
    this.carY -= Math.sin(a) * speed * dt;
    let tailX = this.carX + Math.cos(a) * 45;
    let tailY = this.carY + Math.sin(a) * 45;
    if (this.done.rockets) {
      this.puff(tailX, tailY, Math.cos(a) * 200, Math.sin(a) * 200, 0x5454fc, 0.35, 2);
      this.puff(tailX, tailY, Math.cos(a) * 140, Math.sin(a) * 140, 0xfcfcfc, 0.25);
      this.puff(tailX, tailY, Math.cos(a) * 160, Math.sin(a) * 160, 0xfcfc54, 0.2);
    } else if (Math.random() < 0.6) {
      this.puff(tailX, this.carY + 7, 60, -30, 0xa8a8a8, 0.5);
    }
    this.synth.updateAudio(Math.min(340, speed * 0.4), true);
    if (this.carY < -60 && !this.done.flash) {
      this.done.flash = true;
      this.game.camera.flash(0xffffff, 700);
      this.startSunset();
    }
  },

  renderCar: function (dt) {
    this.bounce = Math.max(0, this.bounce - dt * 4);
    let snap = Math.PI / 8;
    this.car.x = Math.round(this.carX);
    this.car.y = Math.round(this.carY - Math.sin(this.bounce * Math.PI) * 2);
    this.car.rotation = Math.round(this.carAngle / snap) * snap;
  },

  puff: function (x, y, vx, vy, color, life, size = 1) {
    let p = this.particles.find((q) => !q.visible);
    if (!p) {
      return;
    }
    p.visible = true;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = vx + (Math.random() - 0.5) * 40;
    p.vy = vy + (Math.random() - 0.5) * 40;
    p.life = life;
    p.tint = color;
    p.scale.set(size);
  },

  updateParticles: function (dt) {
    this.particles.forEach((p) => {
      if (!p.visible) {
        return;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.visible = false;
        return;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.min(1, p.life * 4);
    });
  },

  // --- Sunset ------------------------------------------------------------------------

  startSunset: function () {
    this.sunset = { t: 0 };
    this.sky = this.game.add.image(0, 0, PrinceJS.RoadsterEnding.sunsetTexture(this.game));
    this.sky.z = 80;
    this.car.rotation = 0;
    this.car.scale.set(1.5, 1.5);
    this.car.z = 85;
    this.beam.visible = false;
    this.particles.forEach((p) => {
      p.visible = false;
      p.z = 86;
    });
    this.princess.visible = false;
    this.say("");
    this.game.world.sort("z");
  },

  updateSunset: function (dt) {
    let s = this.sunset;
    s.t += dt;
    let k = Math.min(1, s.t / 5);
    let e = 1 - Math.pow(1 - k, 2);
    // Fly from the lower left into the sun, shrinking into the distance
    let x = -40 + (160 + 40) * e;
    let y = 190 - (190 - 104) * e - Math.sin(k * Math.PI) * 30;
    let scale = Math.max(0, Math.round((1.5 - 1.5 * e) * 8) / 8);
    this.car.x = Math.round(x);
    this.car.y = Math.round(y);
    this.car.scale.set(scale);
    this.car.rotation = k < 1 ? -Math.PI / 8 : 0;
    this.car.visible = scale > 0;
    if (scale > 0) {
      let tail = 30 * scale;
      this.puff(
        x - tail,
        y + tail * 0.4,
        -120,
        50,
        Math.random() < 0.5 ? 0x5454fc : 0xfcfcfc,
        0.3,
        scale > 0.6 ? 2 : 1
      );
      this.puff(x - tail, y + tail * 0.4, -80, 30, 0xfcfc54, 0.2);
    }
    this.synth.updateAudio(scale > 0 ? 200 * scale : 0, scale > 0.5);
    if (scale === 0) {
      this.synth.engineOn = false;
    }

    if (s.t > 1.2 && !s.said) {
      s.said = true;
      this.say("OFF INTO THE SUNSET!");
    }
    if (k >= 1 && !s.sparkle) {
      s.sparkle = true;
      this.synth.sfx("shine");
      this.star = this.game.add.image(160, 104, PrinceJS.Roadster.pixelArt(this.game, PrinceJS.RoadsterEnding.STAR));
      this.star.anchor.setTo(0.5, 0.5);
      this.star.scale.set(2);
      this.star.z = 87;
      this.game.world.sort("z");
    }
    if (this.star) {
      this.star.visible = s.t < 6.2 && Math.floor(s.t * 8) % 2 === 0;
    }
    if (s.t > 6.4 && !s.end) {
      s.end = true;
      this.say("THE END");
    }
    if (s.t > 9.5 && !s.fade) {
      s.fade = true;
      this.game.add.tween(this.cover).to({ alpha: 1 }, 1500, Phaser.Easing.Linear.None, true);
      this.cover.bringToTop();
      PrinceJS.Utils.delayed(() => this.onDone(), 1600);
    }
  },

  destroy: function () {
    if (this.closeup) {
      this.closeup.destroy();
      this.closeup = null;
    }
    this.synth.destroy();
  }
};

PrinceJS.RoadsterEnding.STAR = ["...w...", "...w...", "..www..", "wwwwwww", "..www..", "...w...", "...w..."];

// Pixel-art sunset over the desert with the palace on the horizon
PrinceJS.RoadsterEnding.sunsetTexture = function (game) {
  let W = PrinceJS.SCREEN_WIDTH;
  let H = PrinceJS.SCREEN_HEIGHT;
  let horizon = 120;
  let bmd = game.make.bitmapData(W, H);
  let c = bmd.ctx;
  let rect = (color, x, y, w, h) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };

  // Sky bands, dithered where they meet
  let bands = [
    [0, "#000028"],
    [26, "#280054"],
    [50, "#540054"],
    [70, "#a80054"],
    [86, "#fc5454"],
    [100, "#fc8040"],
    [110, "#fcbc40"]
  ];
  bands.forEach(([y0, color], i) => {
    let y1 = i + 1 < bands.length ? bands[i + 1][0] : horizon;
    rect(color, 0, y0, W, y1 - y0);
  });
  bands.forEach(([y0], i) => {
    if (i === 0) {
      return;
    }
    let prev = bands[i - 1][1];
    for (let y = y0; y < y0 + 4; y++) {
      for (let x = (y + (y - y0 < 2 ? 0 : 1)) % 2; x < W; x += y - y0 < 2 ? 2 : 4) {
        rect(prev, x, y, 1, 1);
      }
    }
  });
  // Stars
  for (let i = 0; i < 40; i++) {
    let x = (i * 97 + 13) % W;
    let y = (i * 53 + 7) % 40;
    rect(i % 5 === 0 ? "#fcfcfc" : "#a8a8a8", x, y, 1, 1);
  }

  // Striped retro sun sinking into the horizon
  let cx = 160;
  let cy = horizon - 4;
  let r = 34;
  for (let y = cy - r; y < horizon; y++) {
    let dy = y - cy;
    let half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    let k = (y - (cy - r)) / (horizon - (cy - r));
    let color = k < 0.35 ? "#fcfc54" : k < 0.65 ? "#fcbc40" : "#fc8040";
    let gap = y > cy - 18 && (y - (cy - 18)) % 6 >= 6 - Math.floor((y - (cy - 18)) / 7);
    if (!gap) {
      rect(color, cx - half, y, half * 2, 1);
    }
  }

  // Palace silhouette on the horizon: domes and minarets
  let sil = "#280028";
  let dome = (x, y, rad) => {
    for (let dy = -rad; dy <= 0; dy++) {
      let half = Math.floor(Math.sqrt(rad * rad - dy * dy));
      rect(sil, x - half, y + dy, half * 2 + 1, 1);
    }
    rect(sil, x, y - rad - 4, 1, 4);
  };
  rect(sil, 18, horizon - 14, 64, 14);
  dome(50, horizon - 14, 12);
  dome(28, horizon - 14, 6);
  dome(72, horizon - 14, 6);
  [10, 90].forEach((x) => {
    rect(sil, x - 2, horizon - 34, 5, 34);
    rect(sil, x - 3, horizon - 26, 7, 2);
    dome(x, horizon - 34, 3);
  });
  for (let x = 24; x < 80; x += 8) {
    rect("#fcbc40", x, horizon - 9, 2, 3);
  }

  // Desert dunes in front, with the sun's reflection on the sand
  for (let x = 0; x < W; x++) {
    let far = horizon + 4 + Math.round(3 * Math.sin(x / 23) + 2 * Math.sin(x / 9));
    let near = horizon + 30 + Math.round(10 * Math.sin(x / 41 + 1) + 4 * Math.sin(x / 13));
    rect("#540028", x, horizon, 1, far - horizon);
    rect("#a85400", x, far, 1, H - far);
    rect("#542800", x, near, 1, H - near);
    rect("#fc8040", x, far, 1, 1);
    rect("#a85400", x, near, 1, 1);
  }
  for (let y = horizon + 2; y < horizon + 26; y += 3) {
    let w = 30 - (y - horizon);
    rect("#fcbc40", cx - w, y, w * 2, 1);
  }

  bmd.dirty = true;
  return bmd;
};
