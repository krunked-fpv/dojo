// Unified Input Pipeline: Keyboard (WASD/Arrows/Enter/Space/Esc) + Multi-Touch Virtual Gamepad

const KEY_TO_DIR = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export class InputController {
  constructor() {
    this.heldKeys = new Set();
    this.dirStack = [];
    this.pointerDirs = new Map();
    this.dpadPointerId = null;

    this.listeners = {
      action: [],
      cancel: [],
      pokedex: [],
    };
    this.lastEmitTime = {
      action: 0,
      cancel: 0,
      pokedex: 0,
    };
    this.debounceMs = 130;
    this.buttonPointerIds = new Map();

    this.dpadEl = document.getElementById('dpad');
    this.dpadArms = this.dpadEl ? Array.from(this.dpadEl.querySelectorAll('[data-dir]')) : [];
    this.btnA = document.getElementById('btn-a');
    this.btnB = document.getElementById('btn-b');

    this.bindKeyboard();
    this.bindGamepad();
  }

  on(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].push(handler);
    }
    return () => {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter((fn) => fn !== handler);
    };
  }

  emit(event) {
    if (!this.listeners[event]) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.lastEmitTime[event] || 0;
    if (now - prev < this.debounceMs) return;
    this.lastEmitTime[event] = now;
    for (const fn of this.listeners[event]) {
      fn();
    }
  }

  pushDirection(dir) {
    if (!dir) return;
    this.dirStack = this.dirStack.filter((d) => d !== dir);
    this.dirStack.push(dir);
    this.syncDpadVisuals();
  }

  removeDirection(dir) {
    if (!dir) return;
    this.dirStack = this.dirStack.filter((d) => d !== dir);
    this.syncDpadVisuals();
  }

  clearAll() {
    this.heldKeys.clear();
    this.pointerDirs.clear();
    this.buttonPointerIds.clear();
    this.dpadPointerId = null;
    this.dirStack = [];
    this.btnA?.classList.remove('is-pressed');
    this.btnB?.classList.remove('is-pressed');
    this.syncDpadVisuals();
  }

  getDirection() {
    if (this.dirStack.length === 0) return null;
    return this.dirStack[this.dirStack.length - 1];
  }

  syncDpadVisuals() {
    const activeDir = this.getDirection();
    for (const el of this.dpadArms) {
      el.classList.toggle('is-pressed', el.dataset.dir === activeDir);
    }
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const dir = KEY_TO_DIR[e.code];
      if (dir) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        if (!this.heldKeys.has(e.code)) {
          this.heldKeys.add(e.code);
          this.pushDirection(dir);
        }
        return;
      }

      if (e.repeat) return;

      const tag = e.target?.tagName;
      const inButtonOrInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (inButtonOrInput) return;

      if (e.code === 'Space' || e.code === 'KeyZ' || (e.code === 'Enter' && tag !== 'BUTTON')) {
        if (e.code === 'Space') e.preventDefault();
        this.emit('action');
      } else if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'KeyX') {
        this.emit('cancel');
      } else if (e.code === 'KeyP' || e.code === 'KeyM') {
        this.emit('pokedex');
      }
    });

    window.addEventListener('keyup', (e) => {
      const dir = KEY_TO_DIR[e.code];
      if (!dir) return;
      this.heldKeys.delete(e.code);
      const stillHeldSameDir = [...this.heldKeys].some((code) => KEY_TO_DIR[code] === dir) ||
        [...this.pointerDirs.values()].includes(dir);
      if (!stillHeldSameDir) {
        this.removeDirection(dir);
      }
    });

    window.addEventListener('blur', () => this.clearAll());
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.clearAll();
      });
    }
  }

  resolveDpadDirection(clientX, clientY) {
    if (!this.dpadEl) return null;
    const rect = this.dpadEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return null;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? 'right' : 'left';
    }
    return dy >= 0 ? 'down' : 'up';
  }

  bindGamepad() {
    if (this.dpadEl) {
      const updateDpadPointer = (e) => {
        const dir = this.resolveDpadDirection(e.clientX, e.clientY);
        const prev = this.pointerDirs.get(e.pointerId);
        if (prev && prev !== dir) {
          this.pointerDirs.delete(e.pointerId);
          const stillHeld = [...this.heldKeys].some((c) => KEY_TO_DIR[c] === prev) ||
            [...this.pointerDirs.values()].includes(prev);
          if (!stillHeld) this.removeDirection(prev);
        }
        if (dir) {
          this.pointerDirs.set(e.pointerId, dir);
          this.pushDirection(dir);
        }
      };

      const releaseDpadPointer = (e) => {
        if (this.dpadPointerId === e.pointerId) {
          this.dpadPointerId = null;
        }
        const prev = this.pointerDirs.get(e.pointerId);
        if (prev) {
          this.pointerDirs.delete(e.pointerId);
          const stillHeld = [...this.heldKeys].some((c) => KEY_TO_DIR[c] === prev) ||
            [...this.pointerDirs.values()].includes(prev);
          if (!stillHeld) this.removeDirection(prev);
        }
      };

      this.dpadEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.dpadPointerId = e.pointerId;
        try {
          this.dpadEl.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if element cannot capture
        }
        updateDpadPointer(e);
      });

      this.dpadEl.addEventListener('pointermove', (e) => {
        if (this.dpadPointerId !== e.pointerId) return;
        e.preventDefault();
        updateDpadPointer(e);
      });

      this.dpadEl.addEventListener('pointerup', releaseDpadPointer);
      this.dpadEl.addEventListener('pointercancel', releaseDpadPointer);
      this.dpadEl.addEventListener('lostpointercapture', releaseDpadPointer);
      this.dpadEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    const bindActionButton = (btn, eventName) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.buttonPointerIds.set(btn, e.pointerId);
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if element cannot capture
        }
        btn.classList.add('is-pressed');
        this.emit(eventName);
      });
      const release = (e) => {
        const activeId = this.buttonPointerIds.get(btn);
        if (activeId !== undefined && e.pointerId !== activeId) return;
        this.buttonPointerIds.delete(btn);
        btn.classList.remove('is-pressed');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    bindActionButton(this.btnA, 'action');
    bindActionButton(this.btnB, 'cancel');
  }
}
