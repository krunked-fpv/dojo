// Unified Input Pipeline: Keyboard (WASD/Arrows/Enter/Space/Esc/P/M/1-4) + Programmatic Direction Stack

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

    this.listeners = {
      action: [],
      cancel: [],
      pokedex: [],
      warp: [],
      navigate: [],
      moveSlot: [],
    };
    this.lastEmitTime = {
      action: 0,
      cancel: 0,
      pokedex: 0,
      warp: 0,
      navigate: 0,
      moveSlot: 0,
    };
    this.debounceMs = 130;

    this.bindKeyboard();
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
  }

  removeDirection(dir) {
    if (!dir) return;
    this.dirStack = this.dirStack.filter((d) => d !== dir);
  }

  clearAll() {
    this.heldKeys.clear();
    this.dirStack = [];
  }

  getDirection() {
    if (this.dirStack.length === 0) return null;
    return this.dirStack[this.dirStack.length - 1];
  }

  bindKeyboard() {
    if (typeof window === 'undefined') return;

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
      } else if (e.code === 'KeyT') {
        this.emit('warp');
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('focusin', (e) => {
        if (isEditableElement(e.target)) {
          this.heldKeys.clear();
          this.dirStack = [];
        }
      });
    }

    window.addEventListener('keyup', (e) => {
      const keyId = e.code || e.key;
      const dir = resolveDirFromKey(e.code) || resolveDirFromKey(e.key);
      if (!dir) return;
      this.heldKeys.delete(keyId);
      const stillHeldSameDir = [...this.heldKeys].some((code) => resolveDirFromKey(code) === dir);
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
}
