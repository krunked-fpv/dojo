// Unified Input Pipeline: Keyboard (WASD/Arrows/Enter/Space/Esc/1-4) + Multi-Touch Virtual Gamepad

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

const KEY_NAME_TO_DIR = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
};

const DIGIT_SLOTS = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
};

function resolveDirFromKey(codeOrKey) {
  return KEY_TO_DIR[codeOrKey] || KEY_NAME_TO_DIR[codeOrKey] || null;
}

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
      navigate: [],
      moveSlot: [],
    };
    this.lastEmitTime = {
      action: 0,
      cancel: 0,
      pokedex: 0,
      navigate: 0,
      moveSlot: 0,
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

  emit(event, payload) {
    if (!this.listeners[event]) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const minInterval = event === 'navigate' || event === 'moveSlot' ? 0 : this.debounceMs;
    const prev = this.lastEmitTime[event] || 0;
    if (minInterval > 0 && now - prev < minInterval) return;
    this.lastEmitTime[event] = now;
    for (const fn of this.listeners[event]) {
      fn(payload);
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
    const isEditableElement = (el) => {
      if (!el) return false;
      const tag = (el.tagName || '').toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION' || Boolean(el.isContentEditable);
    };

    window.addEventListener('keydown', (e) => {
      const targetTag = (e.target?.tagName || '').toUpperCase();
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const inInput = isEditableElement(e.target) || isEditableElement(activeEl);
      if (inInput) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const keyId = e.code || e.key;
      const dir = resolveDirFromKey(e.code) || resolveDirFromKey(e.key);
      if (dir) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(keyId)) {
          e.preventDefault();
        }
        if (!this.heldKeys.has(keyId)) {
          this.heldKeys.add(keyId);
          this.pushDirection(dir);
        }
        if (!e.repeat) {
          this.emit('navigate', dir);
        }
        return;
      }

      if (e.repeat) return;

      const slot = DIGIT_SLOTS[e.code] ?? DIGIT_SLOTS[e.key];
      if (slot !== undefined) {
        this.emit('moveSlot', slot);
        return;
      }

      if (e.code === 'Space' || e.code === 'KeyZ' || ((e.code === 'Enter' || e.code === 'NumpadEnter') && targetTag !== 'BUTTON')) {
        if (e.code === 'Space') e.preventDefault();
        this.emit('action');
      } else if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'KeyX') {
        this.emit('cancel');
      } else if (e.code === 'KeyP' || e.code === 'KeyM') {
        this.emit('pokedex');
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('focusin', (e) => {
        if (isEditableElement(e.target)) {
          this.heldKeys.clear();
          const pointerActiveDirs = new Set(this.pointerDirs.values());
          this.dirStack = this.dirStack.filter((d) => pointerActiveDirs.has(d));
          this.syncDpadVisuals();
        }
      });
    }

    window.addEventListener('keyup', (e) => {
      const keyId = e.code || e.key;
      const dir = resolveDirFromKey(e.code) || resolveDirFromKey(e.key);
      if (!dir) return;
      this.heldKeys.delete(keyId);
      const stillHeldSameDir = [...this.heldKeys].some((code) => resolveDirFromKey(code) === dir) ||
        [...this.pointerDirs.values()].includes(dir);
      if (!stillHeldSameDir) {
        this.removeDirection(dir);
      }
    });

    window.addEventListener('blur', () => this.clearAll());
    window.addEventListener('pagehide', () => this.clearAll());
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
          const stillHeld = [...this.heldKeys].some((c) => resolveDirFromKey(c) === prev) ||
            [...this.pointerDirs.values()].includes(prev);
          if (!stillHeld) this.removeDirection(prev);
        }
        if (dir) {
          this.pointerDirs.set(e.pointerId, dir);
          this.pushDirection(dir);
          if (prev !== dir) {
            this.emit('navigate', dir);
          }
        }
      };

      const releaseDpadPointer = (e) => {
        if (this.dpadPointerId === e.pointerId) {
          this.dpadPointerId = null;
        }
        const prev = this.pointerDirs.get(e.pointerId);
        if (prev) {
          this.pointerDirs.delete(e.pointerId);
          const stillHeld = [...this.heldKeys].some((c) => resolveDirFromKey(c) === prev) ||
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
