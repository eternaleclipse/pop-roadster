"use strict";

// Charging stop: a parody interlude after level 4. The roadster pulls into a desert charging
// station and plugs in. The cable stays locked until the battery is full, and meanwhile the
// prince scrolls "PRINCESTAGRAM" on his phone: an endless feed of princesses' posts (plus the odd
// ad and a post from Jaffar). UP / DOWN scroll, SPACE / ENTER like, RIGHT drives on when full.
PrinceJS.RoadsterCharge = function () {};

PrinceJS.RoadsterCharge.PHONE = { x: 110, y: 6, w: 100, h: 200 };
PrinceJS.RoadsterCharge.SCREEN = { x: 4, y: 8, w: 92, h: 186 }; // inside the phone
PrinceJS.RoadsterCharge.POST_H = 138;
PrinceJS.RoadsterCharge.FEED_TOP = 38;
PrinceJS.RoadsterCharge.CHARGE_TIME = 56; // 100%/T below 80%, then it tapers: about 75 s to full

PrinceJS.RoadsterCharge.POSTS = [
  {
    user: "PRINCESS.OF.PERSIA",
    place: "THE TOWER",
    bg: "tower",
    hair: "#2c1c14",
    dress: "#fcfcfc",
    trim: "#fc54fc",
    likes: 48211,
    caption: "TOWER VIEW AGAIN. STILL WAITING ON MY PRINCE #LOCKEDUP #60MINUTESLEFT",
    when: "2 HOURS AGO"
  },
  {
    user: "YASMINA_ROYAL",
    place: "HALL OF MIRRORS",
    bg: "mirror",
    hair: "#5c2c14",
    dress: "#40c0ff",
    trim: "#fcfc54",
    likes: 12904,
    caption: "MIRROR SELFIE. DONT ASK WHERE MY REFLECTION WENT #MIRRORMIRROR",
    when: "5 HOURS AGO"
  },
  {
    user: "SHAHRZAD_1001",
    place: "STORYTIME LOUNGE",
    bg: "lamps",
    hair: "#100c08",
    dress: "#a800a8",
    trim: "#fca800",
    likes: 100100,
    caption: "STORY 1001 OF 1001. LIKE IF YOU READ THEM ALL. NO SPOILERS",
    when: "1 DAY AGO"
  },
  {
    user: "PARISA.GLOWS",
    place: "OASIS SPA",
    bg: "oasis",
    hair: "#7c3c1c",
    dress: "#54fc54",
    trim: "#fcfcfc",
    likes: 30422,
    caption: "GOLDEN HOUR AT THE OASIS. NO FILTER. OK ONE FILTER #BLESSED",
    when: "1 DAY AGO"
  },
  {
    user: "ROXANA_RIDES",
    place: "DUNE 7",
    bg: "carpet",
    hair: "#2c1c14",
    dress: "#fc5454",
    trim: "#fcfc54",
    likes: 8077,
    caption: "HE PICKED ME UP ON A FLYING CARPET. LEFT HIM ON READ #STANDARDS",
    when: "2 DAYS AGO"
  },
  {
    user: "THE_SULTANS_DAUGHTER",
    place: "PALACE BALCONY",
    bg: "balcony",
    hair: "#100c08",
    dress: "#fcfc54",
    trim: "#a800a8",
    likes: 77003,
    caption: "DAD SAYS NO BOYS WITH SWORDS. WHAT ABOUT BOYS WITH CARS???",
    when: "3 DAYS AGO"
  }
];

// Ingredients for the endless feed after the hand-made posts above
PrinceJS.RoadsterCharge.FEED = {
  users: [
    "PRINCESS_NILOU",
    "SHIRIN.SPARKLES",
    "LADY_LEILA",
    "AZADEH_ROYALE",
    "MAHSA.MOONLIGHT",
    "PRINCESS_SOREYA",
    "DARYA_DREAMS",
    "TARANEH_TIARA",
    "ROYAL_ROYA",
    "PARI.PALACE",
    "NASRIN_NIGHTS",
    "GOLNAR.GLAM",
    "PRINCESS_ZIBA",
    "MINOO_MAJESTY",
    "SAHAR_SUNRISE",
    "KIANA.CROWNED",
    "ELAHEH_ELEGANT",
    "FARAH_FOREVER"
  ],
  places: {
    garden: "ROSE GARDEN",
    bazaar: "GRAND BAZAAR",
    library: "ROYAL LIBRARY",
    roof: "PALACE ROOF",
    stairs: "MARBLE STAIRS",
    tower: "TOWER 2",
    mirror: "HALL OF MIRRORS",
    lamps: "STORYTIME LOUNGE",
    oasis: "OASIS SPA",
    carpet: "DESERT CAMP",
    balcony: "PALACE BALCONY"
  },
  bgs: ["garden", "bazaar", "library", "roof", "stairs", "tower", "mirror", "lamps", "oasis", "carpet", "balcony"],
  hair: ["#2c1c14", "#5c2c14", "#100c08", "#7c3c1c", "#a8641c", "#3c2414"],
  dress: ["#fcfcfc", "#40c0ff", "#a800a8", "#54fc54", "#fc5454", "#fcfc54", "#fc54fc", "#5454fc", "#fca800"],
  trims: ["#fcd800", "#fcfcfc", "#fc54fc", "#a800a8", "#40c0ff"],
  poses: ["none", "none", "selfie", "peace", "cat", "potion", "fan"],
  hats: ["tiara", "tiara", "crown", "veil", "flower", "scarf"],
  captions: [
    "NEW TIARA WHO DIS",
    "POV: YOUR PRINCE IS STUCK ON LEVEL 3",
    "HOT GIRL SUMMER IN THE DUNGEON #NOFILTER",
    "IF HE CANT SURVIVE THE CHOPPERS HE DOESNT DESERVE ME",
    "OOTD: SILK, GOLD, MORE GOLD",
    "POTION OF THE DAY: RED. TASTES LIKE CHERRY",
    "GUARDS WONT LET ME LEAVE SO I MADE IT A PHOTOSHOOT",
    "THIS SAND GETS EVERYWHERE",
    "SUNDAY RESET: CANDLES, SCROLLS, TRAPDOOR",
    "WHO KEEPS LEAVING LOOSE FLOOR TILES",
    "A PRINCE IN A CAR?? IN THIS ECONOMY??",
    "BRUNCH AT THE OASIS. DATES ONLY. NOT THAT KIND",
    "MY SCREEN TIME IS ONE HOURGLASS A DAY",
    "MIRROR ME HAS BETTER HAIR #SHADOWWORK",
    "JUST A GIRL STANDING IN FRONT OF A GATE ASKING IT TO OPEN",
    "STOP ASKING IF IM SINGLE. I AM TRAPPED",
    "GOLDEN HOUR HITS DIFFERENT IN A PALACE",
    "NEW BLOG POST: 10 SPIKES THAT RUINED MY WEEK",
    "THE VIZIER LIKED MY POST AGAIN. BLOCKED",
    "REMEMBER TO DRINK WATER, NOT POTIONS FROM THE FLOOR",
    "WHEN HE SAYS HE IS 5 ROOMS AWAY",
    "SWIPE FOR MY THRONE ROOM TOUR",
    "LIVING MY BEST LIFE (LOCKED IN A TOWER)",
    "SOFT LAUNCHING MY NEW CARPET"
  ],
  extras: [
    {
      user: "DJINN_CHARGE",
      place: "SPONSORED",
      ad: "charger",
      caption: "CHARGE YOUR CAR OR CARPET IN 15 MIN. WISHES SOLD SEPARATELY"
    },
    {
      user: "JAFFAR_OFFICIAL",
      place: "MY TOWER",
      vizier: true,
      caption: "NEW HOURGLASS JUST DROPPED. 60 MINUTES ONLY. NO REFUNDS"
    },
    {
      user: "MAGICLAMP_RIDES",
      place: "SPONSORED",
      ad: "carpet",
      caption: "FLYING CARPET RIDESHARE. 5 STARS. NO SEATBELTS"
    },
    {
      user: "JAFFAR_OFFICIAL",
      place: "THRONE ROOM (SOON)",
      vizier: true,
      caption: "MANIFESTING. #BOSSVIZIER #THRONEGOALS"
    }
  ]
};

// Extra glyphs for the 3x5 font
PrinceJS.RoadsterCharge.GLYPHS = {
  "#": [5, 7, 5, 7, 5],
  "@": [2, 5, 7, 4, 3],
  ",": [0, 0, 0, 2, 4],
  "'": [2, 2, 0, 0, 0],
  "?": [6, 1, 2, 0, 2],
  _: [0, 0, 0, 0, 7],
  "+": [0, 2, 7, 2, 0],
  "%": [5, 1, 2, 4, 5],
  "(": [2, 4, 4, 4, 2],
  ")": [2, 1, 1, 1, 2],
  "*": [5, 2, 7, 2, 5]
};

PrinceJS.RoadsterCharge.HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
PrinceJS.RoadsterCharge.HEART_OUTLINE = [".XX.XX.", "X..X..X", "X.....X", ".X...X.", "..X.X..", "...X..."];

PrinceJS.RoadsterCharge.prototype = {
  create: function () {
    let game = this.game;
    game.world.setBounds(0, 0, PrinceJS.SCREEN_WIDTH, PrinceJS.SCREEN_HEIGHT);
    game.camera.setPosition(0, 0);
    game.world.alpha = 1;
    game.stage.backgroundColor = "#000000";
    // Keys pressed here must not reach the level's key handler
    game.input.keyboard.onDownCallback = null;
    this.font = Object.assign({}, PrinceJS.RoadsterGPS.FONT, PrinceJS.RoadsterCharge.GLYPHS);

    this.t = 0;
    this.phase = "arrive";
    this.phaseT = 0;
    this.battery = 12;
    this.post = 0;
    this.feedY = 0;
    this.liked = {};
    this.likesGiven = 0;
    this.pop = null;
    this.toast = null;
    this.toasts = [];
    this.leaving = false;
    this.feed = [];

    this.add.image(0, 0, this.backgroundTexture());

    this.carX = -80;
    this.carV = 260;
    this.car = this.add.sprite(this.carX, 168, PrinceJS.Roadster.pixelArt(game, PrinceJS.Roadster.CAR));
    this.car.anchor.setTo(0.5, 0.5);
    this.car.scale.set(PrinceJS.Roadster.SCALE);

    // Foreground charger post, cable, side panels and the phone
    this.overlay = game.make.bitmapData(PrinceJS.SCREEN_WIDTH, PrinceJS.SCREEN_HEIGHT);
    this.add.image(0, 0, this.overlay);
    let P = PrinceJS.RoadsterCharge.PHONE;
    this.phoneBmd = game.make.bitmapData(P.w, P.h);
    this.phone = this.add.image(P.x, PrinceJS.SCREEN_HEIGHT + 4, this.phoneBmd);
    this.hand = this.add.image(P.x - 12, PrinceJS.SCREEN_HEIGHT + 4, this.handTexture());

    this.cover = this.add.image(0, 0, this.solid(PrinceJS.SCREEN_WIDTH, PrinceJS.SCREEN_HEIGHT, "#000000"));
    this.add.tween(this.cover).to({ alpha: 0 }, 700, Phaser.Easing.Linear.None, true);

    // Count key presses from events so even the quickest taps register
    this.hits = {};
    let keys = { up: ["UP"], down: ["DOWN"], like: ["SPACEBAR", "ENTER"], right: ["RIGHT"] };
    this.keyList = [];
    Object.keys(keys).forEach((name) => {
      keys[name].forEach((code) => {
        let key = game.input.keyboard.addKey(Phaser.Keyboard[code]);
        key.onDown.add(() => {
          this.hits[name] = true;
        });
        this.keyList.push(key);
      });
    });
    this.prev = {};

    // Phone gestures on the screen itself: swipe up / down to scroll, double-tap to like
    this.gesture = null;
    this.lastTap = 0;
    this.onPointerDown = (e) => {
      this.gesture = { y: e.clientY, x: e.clientX };
    };
    this.onPointerUp = (e) => {
      if (!this.gesture) {
        return;
      }
      let dy = e.clientY - this.gesture.y;
      let dx = e.clientX - this.gesture.x;
      this.gesture = null;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        this.hits[dy < 0 ? "down" : "up"] = true;
      } else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
        let now = performance.now();
        if (now - this.lastTap < 350) {
          this.hits.like = true;
          this.lastTap = 0;
        } else {
          this.lastTap = now;
        }
      }
    };
    PrinceJS.TouchControls.onPress = (key) => {
      let name = { up: "up", down: "down", right: "right", shift: "like", space: "like" }[key];
      if (name) {
        this.hits[name] = true;
      }
    };
    game.canvas.addEventListener("pointerdown", this.onPointerDown);
    game.canvas.addEventListener("pointerup", this.onPointerUp);

    this.synth = Object.create(PrinceJS.Roadster.prototype);
    this.synth.game = game;
    this.synth.engineOn = true;
    this.synth.initAudio();
  },

  solid: function (w, h, color) {
    let bmd = this.game.make.bitmapData(w, h);
    bmd.ctx.fillStyle = color;
    bmd.ctx.fillRect(0, 0, w, h);
    return bmd;
  },

  // A key, button or gesture press since the last frame
  pressed: function (name) {
    let hit = this.hits[name];
    this.hits[name] = false;
    return hit;
  },

  update: function () {
    let dt = Math.min(0.05, this.game.time.physicsElapsed || 1 / 60);
    this.t += dt;
    this.phaseT += dt;
    let up = this.pressed("up");
    let down = this.pressed("down");
    let like = this.pressed("like");
    let right = this.pressed("right");

    if (this.phase === "arrive") {
      // Roll in and stop with the charge port next to the post
      let stop = 172;
      this.carV = Math.max(18, Math.min(this.carV, (stop - this.carX) * 2.6));
      this.carX = Math.min(stop, this.carX + this.carV * dt);
      this.synth.updateAudio(this.carV * 0.2, false);
      if (this.carX >= stop - 0.5) {
        this.next("plug");
        this.synth.updateAudio(0, false);
        this.synth.sfx("thud");
      }
    } else if (this.phase === "plug") {
      if (this.phaseT >= 0.9 && !this.plugged) {
        this.plugged = true;
        this.synth.sfx("clunk");
        this.say("CHARGING", 1.5);
      }
      if (this.phaseT >= 1.6) {
        this.next("phone");
        this.synth.sfx("chirp");
      }
    } else if (this.phase === "phone") {
      this.charge(dt);
      if (up) {
        this.scroll(-1);
      } else if (down) {
        this.scroll(1);
      }
      if (like) {
        this.like();
      }
      if (right && this.battery >= 100) {
        this.next("leave");
        this.synth.sfx("clunk");
      } else if (right) {
        // No skipping: the cable stays locked until the battery is full
        this.synth.sfx("thud");
        this.notify("CHARGER", "CABLE LOCKED UNTIL 100%. ENJOY YOUR FEED");
      }
      this.updateToasts();
    } else if (this.phase === "leave") {
      if (this.phaseT > 0.9 && !this.revved) {
        this.revved = true;
        this.synth.sfx("voom");
      }
      if (this.phaseT > 1.1) {
        this.carV = Math.min(900, this.carV + 900 * dt);
        this.carX += this.carV * dt;
        this.synth.updateAudio(this.carV * 0.4, true);
      }
      if (this.phaseT > 2.2 && !this.leaving) {
        this.leaving = true;
        this.add.tween(this.cover).to({ alpha: 1 }, 500, Phaser.Easing.Linear.None, true);
        this.cover.bringToTop();
        PrinceJS.Utils.delayed(() => this.state.start("Game"), 600);
      }
    }

    // Feed scroll easing and other live bits
    let target = this.post * PrinceJS.RoadsterCharge.POST_H;
    this.feedY += (target - this.feedY) * Math.min(1, dt * 12);
    this.feed.forEach((p) => {
      if (p && Math.random() < dt * 1.5) {
        p.live += 1 + Math.floor(Math.random() * 3);
      }
    });
    if (this.pop) {
      this.pop.t += dt;
      if (this.pop.t > 0.7) {
        this.pop = null;
      }
    }
    if (this.toast) {
      this.toast.t += dt;
      if (this.toast.t > 3) {
        this.toast = null;
      }
    }

    this.car.x = Math.round(this.carX);
    let P = PrinceJS.RoadsterCharge.PHONE;
    let phoneUp =
      this.phase === "phone"
        ? Math.min(1, this.phaseT / 0.5)
        : this.phase === "leave"
          ? Math.max(0, 1 - this.phaseT / 0.4)
          : 0;
    let ease = 1 - Math.pow(1 - phoneUp, 3);
    this.phone.y = Math.round(PrinceJS.SCREEN_HEIGHT + 4 - (PrinceJS.SCREEN_HEIGHT + 4 - P.y) * ease);
    this.hand.y = this.phone.y;
    this.drawOverlay(ease);
    if (ease > 0) {
      this.drawPhone();
    }
  },

  next: function (phase) {
    this.phase = phase;
    this.phaseT = 0;
  },

  charge: function (dt) {
    // Fast until 80%, then it tapers off like a real charger
    let rate = this.battery < 80 ? 100 / PrinceJS.RoadsterCharge.CHARGE_TIME : 30 / PrinceJS.RoadsterCharge.CHARGE_TIME;
    let before = this.battery;
    this.battery = Math.min(100, this.battery + rate * dt);
    if (before < 80 && this.battery >= 80) {
      this.notify("CHARGER", "80% REACHED. IDLE FEES START SOON :)");
    }
    if (before < 100 && this.battery >= 100) {
      this.notify("CHARGER", "CHARGE COMPLETE. PRESS RIGHT TO DRIVE");
      this.synth.sfx("ding");
    }
  },

  scroll: function (dir) {
    let to = Math.max(0, this.post + dir);
    if (to !== this.post) {
      this.post = to;
      this.synth.sfx("flip");
    }
  },

  like: function () {
    let p = this.postAt(this.post);
    if (this.liked[this.post]) {
      this.liked[this.post] = false;
      p.live--;
      return;
    }
    this.liked[this.post] = true;
    p.live++;
    this.pop = { t: 0 };
    this.synth.sfx("ding");
    if (!p.scored) {
      p.scored = true;
      this.likesGiven++;
      PrinceJS.roadsterScore = (PrinceJS.roadsterScore || 0) + 100;
    }
  },

  // Post i of the feed: the hand-made ones first, then an endless mix generated from a seed
  // (mostly princesses, with every seventh an ad or a post from Jaffar)
  postAt: function (i) {
    if (this.feed[i]) {
      return this.feed[i];
    }
    let C = PrinceJS.RoadsterCharge;
    let post;
    if (i < C.POSTS.length) {
      post = Object.assign({ hat: "tiara", pose: i === 1 ? "selfie" : "none" }, C.POSTS[i]);
    } else {
      let seed = i * 7919 + 13;
      let rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      let pick = (list) => list[Math.floor(rnd() * list.length)];
      let F = C.FEED;
      if (i % 7 === 3) {
        post = Object.assign(
          { bg: "lamps", hair: "#100c08", dress: "#a800a8", trim: "#fcd800" },
          F.extras[Math.floor(i / 7) % F.extras.length]
        );
      } else {
        post = {
          user: F.users[(i * 5) % F.users.length],
          bg: pick(F.bgs),
          hair: pick(F.hair),
          dress: pick(F.dress),
          trim: pick(F.trims),
          pose: pick(F.poses),
          hat: pick(F.hats),
          caption: pick(F.captions)
        };
        post.place = F.places[post.bg];
        post.carousel = post.caption.startsWith("SWIPE") || rnd() < 0.2;
      }
      post.likes = Math.floor(200 + rnd() * rnd() * 90000);
      post.when = 3 + Math.floor(i / 2) + " DAYS AGO";
    }
    post.live = post.likes;
    this.feed[i] = post;
    return post;
  },

  notify: function (from, text) {
    this.toast = { from, text, t: 0 };
    this.synth.sfx("chirp");
  },

  // Timed notifications while scrolling
  updateToasts: function () {
    let at = this.phaseT;
    let once = (key, time, from, text) => {
      if (at >= time && !this.toasts.includes(key)) {
        this.toasts.push(key);
        this.notify(from, text);
      }
    };
    once("follow", 3, "PRINCESTAGRAM", "JAFFAR STARTED FOLLOWING YOU");
    if (this.likesGiven > 0) {
      once("jaffar", 9, "JAFFAR", "STOP LIKING HER PICS. SHE IS MINE");
    }
    once("princess", 15, "PRINCESS", "WHERE ARE YOU?? THE HOURGLASS IS RUNNING");
    if (this.likesGiven >= 4) {
      once("sultan", 22, "SULTAN", "WHY DID YOU LIKE ALL MY DAUGHTERS PICS");
    }
    once("followers", 29, "PRINCESTAGRAM", "YOU HAVE 99+ NEW FOLLOWERS");
    if (this.likesGiven >= 2) {
      once("jealous", 37, "PRINCESS", "ARE YOU LIKING OTHER PRINCESSES' PICS??");
    }
    once("car", 45, "PRINCESTAGRAM", "JAFFAR LIKED A PHOTO OF YOUR CAR");
    once("guards", 53, "SULTAN", "THE GUARDS SAY YOU ARE AT A CHARGER");
    once("minutes", 62, "PRINCESS", "STILL WAITING. JUST SAYING");
    once("story", 70, "SHAHRZAD_1001", "SENT YOU A STORY. IT HAS 1001 PARTS");
  },

  say: function (text, life) {
    this.banner = { text, life };
  },

  text: function (ctx, s, x, y, color) {
    ctx.fillStyle = color;
    for (let n = 0; n < s.length; n++) {
      let glyph = this.font[s[n]] || this.font[" "];
      for (let row = 0; row < 5; row++) {
        for (let bit = 0; bit < 3; bit++) {
          if (glyph[row] & (4 >> bit)) {
            ctx.fillRect(x + n * 4 + bit, y + row, 1, 1);
          }
        }
      }
    }
  },

  wrap: function (s, chars) {
    let lines = [];
    let line = "";
    s.split(" ").forEach((word) => {
      if ((line + " " + word).trim().length > chars) {
        lines.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    });
    if (line) {
      lines.push(line);
    }
    return lines;
  },

  sprite: function (ctx, rows, x, y, color, scale = 1) {
    ctx.fillStyle = color;
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === "X") {
          ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
        }
      }
    });
  },

  // --- Scene ------------------------------------------------------------------------------

  backgroundTexture: function () {
    let W = PrinceJS.SCREEN_WIDTH;
    let H = PrinceJS.SCREEN_HEIGHT;
    let bmd = this.game.make.bitmapData(W, H);
    let ctx = bmd.ctx;
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    // Night sky
    let sky = ["#0c0828", "#140c34", "#1c1040", "#28144c", "#381c54", "#4c2458"];
    for (let i = 0; i < sky.length; i++) {
      px(0, i * 22, W, 22, sky[i]);
    }
    let seed = 7;
    let rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 70; i++) {
      px(Math.floor(rnd() * W), Math.floor(rnd() * 100), 1, 1, rnd() < 0.3 ? "#fcfc54" : "#fcfcfc");
    }
    // Crescent moon
    px(262, 18, 12, 12, "#fcfca8");
    px(266, 16, 12, 12, sky[0]);
    // Palace skyline
    let skyline = "#1c1030";
    px(0, 112, W, 40, skyline);
    [
      [20, 88, 26],
      [70, 74, 34],
      [150, 66, 44],
      [236, 80, 30],
      [292, 92, 22]
    ].forEach(([x, y, w]) => {
      px(x, y, w, 112 - y, skyline);
      for (let r = 0; r < w / 2; r++) {
        let half = Math.round(Math.sqrt((w / 2) * (w / 2) - r * r));
        px(x + w / 2 - half, y - r, half * 2, 1, skyline);
      }
      px(x + w / 2, y - w / 2 - 6, 1, 6, skyline);
    });
    [52, 128, 212, 280].forEach((x) => px(x, 60, 5, 52, skyline));
    // Lit windows
    for (let i = 0; i < 16; i++) {
      px(Math.floor(rnd() * W), 96 + Math.floor(rnd() * 14), 2, 3, "#fca800");
    }
    // Dunes and the charging pad
    px(0, 140, W, 60, "#3c2c24");
    px(0, 140, W, 1, "#5c4434");
    px(0, 180, W, 20, "#2a2a30");
    px(0, 180, W, 1, "#545460");
    for (let x = 30; x < W; x += 70) {
      px(x, 184, 1, 16, "#a8a8a8");
    }
    // Palm trees
    [16, 300].forEach((x) => {
      px(x, 118, 3, 62, "#2c1c14");
      [-10, -5, 0, 5, 10].forEach((d) => px(x + d - 4, 116 + Math.abs(d) / 3, 10, 2, "#1c3c1c"));
    });
    // Canopy with a glowing sign
    px(36, 120, 248, 6, "#1c1c24");
    px(36, 126, 248, 1, "#40c0ff");
    px(46, 126, 3, 54, "#1c1c24");
    px(271, 126, 3, 54, "#1c1c24");
    let sign = "DJINN CHARGE";
    px(160 - sign.length * 2 - 4, 108, sign.length * 4 + 7, 11, "#0c0c14");
    px(160 - sign.length * 2 - 4, 118, sign.length * 4 + 7, 1, "#40c0ff");
    this.text(ctx, sign, 160 - sign.length * 2, 111, "#54fcfc");
    // Background charger posts
    [96, 224].forEach((x) => this.post3d(ctx, x, 146, "#7c7c88", "#3c4c78"));
    return bmd;
  },

  post3d: function (ctx, x, y, body, glow) {
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    px(x, y, 9, 34, body);
    px(x + 1, y + 1, 3, 32, "#fcfcfc");
    px(x + 7, y, 2, 34, "#545454");
    px(x + 2, y + 3, 5, 2, glow);
    px(x - 1, y + 33, 11, 2, "#1c1c24");
  },

  handTexture: function () {
    let P = PrinceJS.RoadsterCharge.PHONE;
    let bmd = this.game.make.bitmapData(P.w + 20, P.h + 20);
    let ctx = bmd.ctx;
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    // Hand gripping the phone's edges (never over the screen), white sleeve below
    let o = 12;
    px(o - 7, 112, 11, 40, "#c86c38");
    px(o - 6, 113, 9, 38, "#fca868");
    px(o - 6, 124, 9, 1, "#c86c38");
    px(o - 6, 136, 9, 1, "#c86c38");
    [118, 132, 146, 160].forEach((y) => {
      px(o + P.w - 3, y, 9, 11, "#c86c38");
      px(o + P.w - 2, y + 1, 7, 9, "#fca868");
    });
    px(o - 12, 150, 18, 60, "#c86c38");
    px(o - 11, 151, 16, 58, "#fca868");
    px(o - 14, 176, 22, 40, "#fcfcfc");
    px(o - 14, 176, 6, 40, "#a8a8a8");
    return bmd;
  },

  drawOverlay: function (phoneUp) {
    let ctx = this.overlay.ctx;
    let W = PrinceJS.SCREEN_WIDTH;
    this.overlay.dirty = true;
    let H = PrinceJS.SCREEN_HEIGHT;
    ctx.clearRect(0, 0, W, H);
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    // Our charger post, right behind the car's charge port (left rear)
    let postX = 110;
    this.post3d(ctx, postX, 146, "#d8d8e0", this.plugged ? "#54fc54" : "#40c0ff");

    // Cable from the post to the port, sagging a little
    let port = { x: this.car.x - 44, y: 166 };
    let reach = this.phase === "plug" ? Math.min(1, this.phaseT / 0.8) : this.phase === "phone" ? 1 : 0;
    if (this.phase === "leave") {
      reach = Math.max(0, 1 - this.phaseT / 0.8);
    }
    if (reach > 0) {
      let from = { x: postX + 4, y: 152 };
      let to = { x: from.x + (port.x - from.x) * reach, y: from.y + (port.y - from.y) * reach };
      for (let i = 0; i <= 20; i++) {
        let k = i / 20;
        let sag = Math.sin(k * Math.PI) * 10 * reach;
        px(Math.round(from.x + (to.x - from.x) * k), Math.round(from.y + (to.y - from.y) * k + sag), 2, 2, "#1c1c1c");
      }
      px(Math.round(to.x) - 2, Math.round(to.y) - 2, 4, 4, "#d8d8e0");
      if (this.plugged && reach === 1) {
        let blink = Math.floor(this.t * 3) % 2 === 0;
        px(Math.round(to.x) - 1, Math.round(to.y) - 4, 2, 1, blink ? "#54fc54" : "#2c8c2c");
      }
    }

    // Banner
    if (this.banner) {
      this.banner.life -= 1 / 60;
      if (this.banner.life > 0) {
        let s = this.banner.text;
        px(160 - s.length * 2 - 4, 4, s.length * 4 + 7, 11, "rgba(0,0,0,0.7)");
        this.text(ctx, s, 160 - s.length * 2, 7, "#54fc54");
      }
    }

    if (phoneUp <= 0) {
      return;
    }
    // Side panels: charging status on the left, stats and keys on the right
    let a = phoneUp;
    px(0, 0, 106, H, `rgba(0,0,0,${0.55 * a})`);
    px(214, 0, 106, H, `rgba(0,0,0,${0.55 * a})`);
    let col = (c) => (a < 1 ? "rgba(252,252,252," + a + ")" : c);
    let full = this.battery >= 100;
    let blink = Math.floor(this.t * 2.5) % 2 === 0;

    this.text(ctx, "CHARGING", 8, 14, col(full ? "#54fc54" : "#54fcfc"));
    // Big battery
    px(8, 24, 80, 30, "#545454");
    px(88, 32, 4, 14, "#545454");
    px(10, 26, 76, 26, "#000000");
    let fill = Math.round((76 * this.battery) / 100);
    let bc = this.battery < 20 ? "#fc5454" : this.battery < 80 ? "#54fc54" : "#a8fca8";
    px(10, 26, fill, 26, bc);
    // Flowing charge stripes
    if (!full) {
      let off = Math.floor(this.t * 30) % 8;
      for (let x = 10 + off; x < 10 + fill; x += 8) {
        px(x, 26, 2, 26, "rgba(252,252,252,0.35)");
      }
    }
    let pct = Math.floor(this.battery) + "%";
    this.text(ctx, pct, 48 - pct.length * 2, 37, "#000000");
    let kw = full ? 0 : this.battery < 80 ? 250 - Math.round(this.battery) : Math.round(120 - this.battery);
    this.text(ctx, kw + " KW", 8, 62, col("#fcfcfc"));
    let T = PrinceJS.RoadsterCharge.CHARGE_TIME;
    let left = full
      ? 0
      : Math.ceil((Math.max(0, 80 - this.battery) / 100) * T + ((100 - Math.max(80, this.battery)) / 30) * T);
    this.text(ctx, "FULL IN " + Math.floor(left / 60) + ":" + ("0" + (left % 60)).slice(-2), 8, 70, col("#a8a8a8"));
    this.text(ctx, "+" + Math.round(this.battery * 4) + " MI RANGE", 8, 78, col("#a8a8a8"));
    this.text(ctx, "IDLE FEE 1 DINAR", 8, 90, col("#7c7c88"));
    this.text(ctx, "PER MINUTE", 8, 97, col("#7c7c88"));
    if (full) {
      this.text(ctx, "CHARGE COMPLETE", 8, 116, blink ? "#54fc54" : "#fcfcfc");
    }

    this.text(ctx, "LIKES GIVEN", 220, 14, col("#fc5454"));
    this.sprite(ctx, PrinceJS.RoadsterCharge.HEART, 220, 22, "#fc5454", 2);
    this.text(ctx, String(this.likesGiven), 238, 26, col("#fcfcfc"));
    this.text(ctx, "+" + this.likesGiven * 100 + " PTS", 220, 38, col("#fcfc54"));
    this.text(ctx, "SWIPE / UP DOWN", 220, 142, col("#a8a8a8"));
    this.text(ctx, "DOUBLE TAP LIKE", 220, 134, col("#a8a8a8"));
    this.text(ctx, "UP DOWN  SCROLL", 220, 150, col("#a8a8a8"));
    this.text(ctx, "SPACE    LIKE", 220, 158, col("#a8a8a8"));
    this.text(
      ctx,
      full ? "RIGHT    DRIVE" : "RIGHT    LOCKED",
      220,
      166,
      full && blink ? "#54fc54" : col(full ? "#a8a8a8" : "#7c7c88")
    );
  },

  // --- Phone --------------------------------------------------------------------------------

  drawPhone: function () {
    let C = PrinceJS.RoadsterCharge;
    let P = C.PHONE;
    let S = C.SCREEN;
    let ctx = this.phoneBmd.ctx;
    let px = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    ctx.clearRect(0, 0, P.w, P.h);
    // Body with rounded corners
    px(2, 0, P.w - 4, P.h, "#545454");
    px(0, 2, P.w, P.h - 2, "#545454");
    px(3, 1, P.w - 6, P.h - 1, "#0c0c0c");
    px(1, 3, P.w - 2, P.h - 3, "#0c0c0c");
    px(S.x, S.y, S.w, S.h, "#fcfcfc");

    ctx.save();
    ctx.beginPath();
    ctx.rect(S.x, S.y, S.w, S.h);
    ctx.clip();

    // Feed
    let top = S.y + C.FEED_TOP - Math.round(this.feedY);
    this.drawStories(ctx, S.x, top - 18);
    let firstPost = Math.max(0, Math.floor((S.y - top) / C.POST_H));
    for (let i = firstPost; i < firstPost + 3; i++) {
      let y = top + i * C.POST_H;
      if (y < S.y + S.h && y + C.POST_H > S.y) {
        this.drawPost(ctx, this.postAt(i), i, S.x, y);
      }
    }

    // Status bar and app header stay on top
    px(S.x, S.y, S.w, 18, "#fcfcfc");
    this.text(ctx, "9:41", S.x + 4, S.y + 1, "#000000");
    px(S.x + 34, S.y, 24, 5, "#0c0c0c");
    let bx = S.x + S.w - 16;
    px(bx, S.y + 1, 11, 5, "#000000");
    px(bx + 1, S.y + 2, 9, 3, "#fcfcfc");
    px(bx + 1, S.y + 2, Math.max(1, Math.round((9 * this.battery) / 100)), 3, "#54c054");
    px(bx + 11, S.y + 2, 1, 3, "#000000");
    this.text(ctx, "PRINCESTAGRAM", S.x + 4, S.y + 10, "#000000");
    this.sprite(ctx, C.HEART_OUTLINE, S.x + S.w - 20, S.y + 9, "#000000");
    px(S.x + S.w - 10, S.y + 9, 6, 6, "#000000");
    px(S.x + S.w - 9, S.y + 10, 4, 4, "#fcfcfc");
    px(S.x, S.y + 17, S.w, 1, "#d8d8d8");

    // Notification toast sliding down
    if (this.toast) {
      let k = Math.min(1, this.toast.t * 5, (3 - this.toast.t) * 5);
      let ty = S.y + Math.round(-24 + 26 * k);
      px(S.x + 2, ty, S.w - 4, 22, "#2a2a30");
      px(S.x + 4, ty + 3, 7, 7, this.toast.from === "CHARGER" ? "#54fc54" : "#fc54fc");
      this.text(ctx, this.toast.from, S.x + 14, ty + 3, "#fcfcfc");
      this.wrap(this.toast.text, 21)
        .slice(0, 2)
        .forEach((line, i) => this.text(ctx, line, S.x + 4, ty + 10 + i * 6, "#d8d8d8"));
    }
    ctx.restore();
    // Home bar
    px(P.w / 2 - 16, P.h - 9, 32, 2, "#545454");
    this.phoneBmd.dirty = true;
  },

  drawStories: function (ctx, x, y) {
    [6, 7, 8, 9, 10]
      .map((i) => this.postAt(i))
      .forEach((post, i) => {
        let cx = x + 4 + i * 18;
        ctx.fillStyle = i < 3 ? "#fc5400" : "#d8d8d8";
        ctx.fillRect(cx, y, 14, 14);
        ctx.fillStyle = "#fcfcfc";
        ctx.fillRect(cx + 1, y + 1, 12, 12);
        this.face(ctx, post, cx + 2, y + 2, 10);
      });
  },

  // A tiny avatar: hair, face and tiara in a square
  face: function (ctx, post, x, y, s) {
    ctx.fillStyle = post.hair;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#fcc890";
    ctx.fillRect(x + Math.round(s * 0.25), y + Math.round(s * 0.25), Math.round(s * 0.5), Math.round(s * 0.6));
    ctx.fillStyle = "#fcd800";
    ctx.fillRect(x + Math.round(s * 0.3), y + Math.round(s * 0.1), Math.round(s * 0.4), 1);
  },

  drawPost: function (ctx, post, i, x, y) {
    let C = PrinceJS.RoadsterCharge;
    let W = C.SCREEN.w;
    // Header
    ctx.fillStyle = "#fc5400";
    ctx.fillRect(x + 3, y + 1, 11, 11);
    ctx.fillStyle = "#fcfcfc";
    ctx.fillRect(x + 4, y + 2, 9, 9);
    this.face(ctx, post, x + 5, y + 3, 7);
    this.text(ctx, post.user.slice(0, 18), x + 17, y + 1, "#000000");
    this.text(ctx, post.place, x + 17, y + 7, "#7c7c7c");
    // Picture
    let iy = y + 14;
    this.portrait(ctx, post, x, iy, W, 72);
    if (this.pop && i === this.post) {
      let k = this.pop.t / 0.7;
      let scale = k < 0.2 ? 2 + k * 15 : 5;
      let alpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
      ctx.globalAlpha = alpha;
      let s = Math.round(scale);
      this.sprite(ctx, C.HEART, Math.round(x + W / 2 - 3.5 * s), Math.round(iy + 36 - 3 * s), "#fcfcfc", s);
      ctx.globalAlpha = 1;
    }
    // Carousel dots, or the ad's button
    if (post.carousel) {
      for (let d = 0; d < 4; d++) {
        ctx.fillStyle = d === 0 ? "#40c0ff" : "#c8c8c8";
        ctx.fillRect(x + W / 2 - 7 + d * 4, iy + 74, 2, 2);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x + W - 16, iy + 2, 14, 7);
      this.text(ctx, "1/4", x + W - 15, iy + 3, "#fcfcfc");
    }
    if (post.ad) {
      ctx.fillStyle = "#40c0ff";
      ctx.fillRect(x, iy + 62, W, 10);
      this.text(ctx, "LEARN MORE  >", x + 3, iy + 65, "#fcfcfc");
    }
    // Actions
    let ay = iy + 75;
    let liked = this.liked[i];
    this.sprite(ctx, liked ? C.HEART : C.HEART_OUTLINE, x + 3, ay, liked ? "#fc3c3c" : "#000000");
    // Comment bubble and share arrow
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 14, ay, 6, 1);
    ctx.fillRect(x + 14, ay + 4, 6, 1);
    ctx.fillRect(x + 13, ay + 1, 1, 3);
    ctx.fillRect(x + 20, ay + 1, 1, 3);
    ctx.fillRect(x + 14, ay + 5, 1, 1);
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(x + 24 + k, ay + 5 - k, 1, 1);
    }
    ctx.fillRect(x + 26, ay, 4, 1);
    ctx.fillRect(x + W - 7, ay, 4, 6);
    ctx.fillStyle = "#fcfcfc";
    ctx.fillRect(x + W - 6, ay + 4, 2, 2);
    // Likes, caption, time
    this.text(ctx, post.live.toLocaleString("en-US") + " LIKES", x + 3, ay + 9, "#000000");
    let lines = this.wrap(post.caption, 21).slice(0, 3);
    lines.forEach((line, n) => this.text(ctx, line, x + 3, ay + 16 + n * 6, "#2a2a2a"));
    this.text(ctx, post.when, x + 3, ay + 17 + lines.length * 6, "#a8a8a8");
  },

  // The princess posing in front of her backdrop
  portrait: function (ctx, post, x, y, w, h) {
    let px = (a, b, c, d, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + a, y + b, c, d);
    };
    let t = this.t;
    switch (post.bg) {
      case "tower":
        px(0, 0, w, h, "#141038");
        px(10, 8, 30, 40, "#2c2458");
        px(12, 10, 26, 36, "#0c0828");
        px(28, 14, 6, 6, "#fcfca8");
        px(30, 13, 6, 6, "#0c0828");
        px(24, 10, 1, 36, "#2c2458");
        px(12, 27, 26, 1, "#2c2458");
        px(60, 10, 3, 3, "#fca800");
        px(60, 6 - (Math.floor(t * 6) % 2), 3, 4, "#fcfc54");
        px(0, 60, w, 12, "#3c3460");
        break;
      case "mirror":
        px(0, 0, w, h, "#6c5c4c");
        px(54, 4, 32, 54, "#fcd800");
        px(56, 6, 28, 50, "#a8c8fc");
        px(58, 8, 4, 30, "#d8ecfc");
        px(0, 58, w, 14, "#5c3c2c");
        break;
      case "lamps":
        px(0, 0, w, h, "#3c1c3c");
        for (let i = 0; i < 4; i++) {
          let lx = 6 + i * 24;
          px(lx + 3, 0, 1, 8, "#a8a8a8");
          px(lx, 8, 7, 5, (Math.floor(t * 4) + i) % 3 ? "#fca800" : "#fcfc54");
        }
        px(0, 56, w, 16, "#7c2c2c");
        for (let i = 0; i < w; i += 8) {
          px(i, 60, 4, 2, "#fcd800");
        }
        break;
      case "oasis":
        for (let i = 0; i < 6; i++) {
          px(0, i * 8, w, 8, ["#fc8c3c", "#fca850", "#fcbc64", "#fcd07c", "#fce094", "#fcf0ac"][i]);
        }
        px(60, 20, 14, 14, "#fcfc54");
        px(0, 48, w, 24, "#2c8cb4");
        px(0, 48, w, 1, "#a8ecfc");
        px(76, 14, 3, 40, "#5c3c1c");
        px(68, 12, 20, 3, "#2c7c2c");
        break;
      case "carpet":
        px(0, 0, w, h, "#fc7c3c");
        px(0, 36, w, h - 36, "#fcb45c");
        px(0, 50, w, 22, "#d8944c");
        px(64 + Math.round(Math.sin(t * 2) * 3), 22 + Math.round(Math.sin(t * 3) * 2), 22, 4, "#a80000");
        px(64 + Math.round(Math.sin(t * 2) * 3), 22 + Math.round(Math.sin(t * 3) * 2), 22, 1, "#fcd800");
        px(72 + Math.round(Math.sin(t * 2) * 3), 14 + Math.round(Math.sin(t * 3) * 2), 4, 8, "#fcfcfc");
        break;
      case "garden":
        px(0, 0, w, h, "#7cc8fc");
        px(0, 30, w, 42, "#2c8c2c");
        for (let i = 0; i < 26; i++) {
          px((i * 37) % w, 32 + ((i * 13) % 36), 3, 3, i % 3 ? "#fc3c3c" : "#fcfcfc");
        }
        px(60, 40, 22, 6, "#d8d8d8");
        px(70, 26 - (Math.floor(t * 8) % 3), 2, 14, "#a8ecfc");
        break;
      case "bazaar":
        px(0, 0, w, h, "#fcd8a8");
        for (let i = 0; i < w; i += 8) {
          px(i, 6, 4, 12, "#fc3c3c");
          px(i + 4, 6, 4, 12, "#fcfcfc");
        }
        px(0, 18, w, 2, "#7c3c1c");
        [52, 64, 76].forEach((x, n) => {
          px(x, 44, 9, 10, ["#c86c38", "#5454fc", "#2c8c2c"][n]);
          px(x + 2, 40, 5, 4, ["#c86c38", "#5454fc", "#2c8c2c"][n]);
        });
        px(0, 56, w, 16, "#a8743c");
        break;
      case "library":
        px(0, 0, w, h, "#5c3c1c");
        for (let r = 0; r < 4; r++) {
          px(0, 10 + r * 14, w, 2, "#3c2410");
          for (let x = 2; x < w; x += 3) {
            px(x, 2 + r * 14, 2, 8, ["#fc5454", "#5454fc", "#fcd800", "#2c8c2c", "#a800a8"][(x + r) % 5]);
          }
        }
        break;
      case "roof":
        px(0, 0, w, h, "#0c0828");
        for (let i = 0; i < 20; i++) {
          px((i * 41) % w, (i * 17) % 40, 1, 1, "#fcfcfc");
        }
        px(54, 30, 34, 30, "#fcd800");
        px(58, 22, 26, 8, "#fcd800");
        px(64, 16, 14, 6, "#fcd800");
        px(70, 8, 2, 8, "#fcd800");
        px(0, 58, w, 14, "#3c3460");
        break;
      case "stairs":
        px(0, 0, w, h, "#e8e0d8");
        for (let i = 0; i < 9; i++) {
          px(0, 64 - i * 7, w - i * 10, 2, "#a8a0a0");
        }
        px(76, 0, 6, h, "#fcfcfc");
        px(74, 0, 2, h, "#c8c0c0");
        break;
      default:
        px(0, 0, w, h, "#fc9c64");
        px(0, 30, w, 20, "#c86c64");
        for (let i = 0; i < w; i += 10) {
          px(i, 50, 3, 22, "#fcd8a8");
        }
        px(0, 48, w, 3, "#fcd8a8");
        px(0, 66, w, 6, "#fcd8a8");
    }
    if (post.ad) {
      this.adImage(px, post, w, h, t);
      return;
    }
    // The princess (or Jaffar): hair behind, dress, neck, face, headwear, jewelry and a pose
    let cx = 32;
    let skin = post.vizier ? "#e8b078" : "#fcc890";
    if (!post.vizier) {
      px(cx - 13, 16, 26, 42, post.hair);
    }
    px(cx - 18, 52, 36, 20, post.dress);
    px(cx - 18, 52, 36, 2, post.trim);
    px(cx - 3, 46, 6, 7, "#e8a874");
    px(cx - 9, 22, 18, 24, skin);
    px(cx - 6, 32, 3, 2, "#000000");
    px(cx + 3, 32, 3, 2, "#000000");
    if (post.vizier) {
      // Turban, sly eyebrows, beard
      px(cx - 11, 12, 22, 12, "#fcfcfc");
      px(cx - 2, 14, 4, 4, "#a800a8");
      px(cx - 7, 30, 5, 1, "#000000");
      px(cx + 2, 30, 5, 1, "#000000");
      px(cx - 8, 39, 16, 12, "#2c1c14");
      px(cx - 3, 40, 6, 2, "#a8241c");
      return;
    }
    px(cx - 9, 22, 18, 5, post.hair);
    px(cx - 7, 31, 4, 1, "#2c1c14");
    px(cx + 3, 31, 4, 1, "#2c1c14");
    px(cx - 8, 36, 3, 2, "#fc9c9c");
    px(cx + 5, 36, 3, 2, "#fc9c9c");
    px(cx - 2, 40, 4, 2, "#d82c4c");
    px(cx - 10, 38, 2, 3, "#fcd800");
    px(cx + 8, 38, 2, 3, "#fcd800");
    switch (post.hat) {
      case "crown":
        px(cx - 8, 14, 16, 6, "#fcd800");
        [-8, -3, 2, 6].forEach((d) => px(cx + d, 10, 2, 4, "#fcd800"));
        px(cx - 1, 16, 2, 2, "#fc3c3c");
        break;
      case "veil":
        ctx.globalAlpha = 0.55;
        px(cx - 15, 14, 30, 40, post.trim);
        ctx.globalAlpha = 1;
        px(cx - 7, 18, 14, 2, "#fcd800");
        break;
      case "flower":
        px(cx + 6, 18, 5, 5, "#fc3c3c");
        px(cx + 8, 20, 1, 1, "#fcfc54");
        break;
      case "scarf":
        px(cx - 13, 14, 26, 10, post.trim);
        px(cx - 14, 22, 5, 30, post.trim);
        px(cx + 9, 22, 5, 30, post.trim);
        break;
      default:
        px(cx - 7, 18, 14, 3, "#fcd800");
        px(cx - 1, 15, 2, 3, "#fcd800");
        px(cx - 1, 19, 2, 2, post.trim);
    }
    switch (post.pose) {
      case "selfie":
        px(cx + 10, 34, 8, 12, "#0c0c0c");
        px(cx + 9, 44, 6, 6, skin);
        break;
      case "peace":
        px(cx + 11, 30, 2, 8, skin);
        px(cx + 14, 30, 2, 8, skin);
        px(cx + 10, 37, 7, 7, skin);
        break;
      case "cat": {
        let cat = "#a8a8a8";
        px(cx - 8, 54, 16, 10, cat);
        px(cx - 8, 50, 3, 4, cat);
        px(cx + 5, 50, 3, 4, cat);
        px(cx - 4, 57, 2, 2, "#54fc54");
        px(cx + 2, 57, 2, 2, "#54fc54");
        break;
      }
      case "potion":
        px(cx + 11, 40, 6, 9, "#fc3c3c");
        px(cx + 13, 36, 2, 4, "#d8d8d8");
        px(cx + 10, 48, 8, 4, skin);
        break;
      case "fan":
        for (let k = 0; k < 6; k++) {
          px(cx + 10 + k, 34 - k, 2, 10 + k * 2, k % 2 ? post.trim : "#fcfcfc");
        }
        break;
    }
  },

  // Sponsored posts
  adImage: function (px, post, w, h, t) {
    if (post.ad === "charger") {
      px(0, 0, w, h, "#0c0c28");
      px(0, 54, w, 18, "#2a2a30");
      px(38, 14, 12, 42, "#d8d8e0");
      px(40, 16, 4, 38, "#fcfcfc");
      px(41, 20, 6, 3, Math.floor(t * 3) % 2 ? "#40c0ff" : "#54fcfc");
    } else {
      px(0, 0, w, h, "#fc9c3c");
      px(0, 44, w, 28, "#d8944c");
      let bob = Math.round(Math.sin(t * 3) * 2);
      px(16, 30 + bob, 60, 8, "#a80000");
      px(16, 30 + bob, 60, 2, "#fcd800");
      for (let x = 16; x < 76; x += 6) {
        px(x, 38 + bob, 2, 3, "#fcd800");
      }
      for (let k = 0; k < 4; k++) {
        px(4 + k * 20, 6 + ((k * 7) % 10), 3, 1, "#fcfcfc");
      }
    }
  },

  shutdown: function () {
    PrinceJS.TouchControls.onPress = null;
    this.game.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.game.canvas.removeEventListener("pointerup", this.onPointerUp);
    if (this.synth) {
      this.synth.destroy();
      this.synth = null;
    }
    this.keyList.forEach((key) => {
      key.onDown.removeAll();
      this.game.input.keyboard.removeKey(key.keyCode);
    });
  }
};
