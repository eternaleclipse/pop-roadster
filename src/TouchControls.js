"use strict";

// On-screen multi-touch buttons for phones and tablets. Each button holds its own key state,
// so gas, jump, boost and hover can all be held together. Kid and Roadster read PrinceJS.Touch.
PrinceJS.Touch = { left: false, right: false, up: false, down: false, shift: false, space: false };

PrinceJS.TouchControls = {
  BUTTONS: [
    { key: "left", label: "◀", cls: "tc-left" },
    { key: "right", label: "▶", cls: "tc-right" },
    { key: "down", label: "▼", cls: "tc-down" },
    { key: "up", label: "▲", cls: "tc-up" },
    { key: "shift", label: "ACT", cls: "tc-shift", drive: "BOOST", foot: "ACT" },
    { key: "space", label: "HOVER", cls: "tc-space", driveOnly: true }
  ],

  enabled: function () {
    let params = new URLSearchParams(window.location.search);
    if (params.has("touch")) {
      return params.get("touch") !== "0";
    }
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  init: function (game) {
    if (!this.enabled() || this.root) {
      return;
    }
    this.game = game;
    this.root = document.createElement("div");
    this.root.className = "touch-controls";
    this.buttons = this.BUTTONS.map((def) => this.makeButton(def));
    document.body.appendChild(this.root);
    let tick = () => {
      this.update();
      window.requestAnimationFrame(tick);
    };
    tick();
  },

  makeButton: function (def) {
    let el = document.createElement("div");
    el.className = "tc-button " + def.cls;
    el.textContent = def.label;
    let pointers = new Set();
    let sync = () => {
      PrinceJS.Touch[def.key] = pointers.size > 0;
      el.classList.toggle("tc-pressed", pointers.size > 0);
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      pointers.add(e.pointerId);
      // Screens that react to single presses (like the charging stop's phone) hook in here,
      // so even a tap shorter than a frame counts
      if (PrinceJS.TouchControls.onPress) {
        PrinceJS.TouchControls.onPress(def.key);
      }
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        // capture is optional
      }
      sync();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
      el.addEventListener(type, (e) => {
        pointers.delete(e.pointerId);
        sync();
      })
    );
    this.root.appendChild(el);
    return { def, el, pointers, sync };
  },

  // Only show the buttons while playing (and at the charging stop); relabel them for driving,
  // walking or scrolling the phone
  update: function () {
    let state = this.game.state.getCurrentState();
    if (this.game.state.current === "RoadsterCharge") {
      this.root.style.display = "block";
      this.buttons.forEach((b) => {
        b.el.style.display = ["left", "space"].includes(b.def.key) ? "none" : "flex";
        let label = b.def.key === "shift" ? "LIKE" : b.def.label;
        if (b.el.textContent !== label) {
          b.el.textContent = label;
        }
      });
      this.root.classList.add("tc-driving");
      return;
    }
    this.buttons.forEach((b) => {
      if (b.def.key === "left") {
        b.el.style.display = "flex";
      }
    });
    let playing = this.game.state.current === "Game" && state && state.kid;
    let driving = !!(playing && state.isDriving && state.isDriving());
    let cutscene = !!(playing && state.kid.inCutscene);
    let visible = playing && !cutscene;
    this.root.style.display = visible ? "block" : "none";
    if (!visible) {
      this.release();
      return;
    }
    this.buttons.forEach((b) => {
      if (b.def.driveOnly) {
        b.el.style.display = driving ? "flex" : "none";
      }
      let label = driving ? b.def.drive : b.def.foot;
      if (label && b.el.textContent !== label) {
        b.el.textContent = label;
      }
    });
    this.root.classList.toggle("tc-driving", driving);
  },

  release: function () {
    (this.buttons || []).forEach((b) => {
      if (b.pointers.size) {
        b.pointers.clear();
        b.sync();
      }
    });
  }
};
