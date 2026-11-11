import { normalize, clamp } from './math.js';

export class Input {
  constructor(canvas, onPause) {
    this.canvas = canvas;
    this.onPause = onPause;
    this.held = new Set();
    this.pressed = new Set();
    this.touchId = null;
    this.touchStart = { x: 0, y: 0 };
    this.touchMove = { x: 0, y: 0 };
    this.joystick = document.getElementById('joystick');
    this.knob = document.getElementById('joystick-knob');
    this.down = (e) => {
      const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
      if (keys.includes(e.code) && (e.target === document.body || e.target === canvas)) e.preventDefault();
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) onPause();
      if(!e.repeat&&!this.held.has(e.code))this.pressed.add(e.code);
      this.held.add(e.code);
    };
    this.up = (e) => { this.held.delete(e.code); };
    this.blur = () => this.reset();
    this.pointerDown = (e) => {
      if (e.pointerType === 'mouse' || this.touchId !== null || canvas.style.pointerEvents === 'none') return;
      this.touchId = e.pointerId;
      this.touchStart = { x: e.clientX, y: e.clientY };
      this.touchMove = { x: 0, y: 0 };
      canvas.setPointerCapture(e.pointerId);
      this.joystick.hidden = false;
      this.joystick.style.left = e.clientX + 'px';
      this.joystick.style.top = e.clientY + 'px';
      this.knob.style.transform = 'translate(-50%,-50%)';
      e.preventDefault();
    };
    this.pointerMove = (e) => {
      if (e.pointerId !== this.touchId) return;
      const dx = e.clientX - this.touchStart.x, dy = e.clientY - this.touchStart.y;
      const m = normalize(dx, dy), strength = clamp(Math.hypot(dx, dy) / 52, 0, 1);
      this.touchMove = { x: m.x * strength, y: m.y * strength };
      this.knob.style.transform = 'translate(calc(-50% + ' + (m.x * strength * 32) + 'px),calc(-50% + ' + (m.y * strength * 32) + 'px))';
    };
    this.pointerUp = (e) => {
      if (e.pointerId !== this.touchId) return;
      this.touchId = null;
      this.touchMove = { x: 0, y: 0 };
      this.joystick.hidden = true;
    };
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
  }
  vector() {
    let x = Number(this.held.has('KeyD') || this.held.has('ArrowRight')) - Number(this.held.has('KeyA') || this.held.has('ArrowLeft'));
    let y = Number(this.held.has('KeyS') || this.held.has('ArrowDown')) - Number(this.held.has('KeyW') || this.held.has('ArrowUp'));
    if (!x && !y) return this.touchMove;
    return normalize(x, y);
  }
  consumeKey(code){const pressed=this.pressed.has(code);this.pressed.delete(code);return pressed;}
  reset() {
    this.held.clear();this.pressed.clear(); this.touchId = null; this.touchMove = { x: 0, y: 0 }; this.joystick.hidden = true;
  }
  destroy() {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.blur);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerUp);
  }
}
