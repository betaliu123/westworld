// One left press on the scene is either a click (it acts) or a drag (it turns the view), never both.
// Some browsers reserve right-button drags for their own gestures, so the left button has to be able to turn.
export const DRAG_START = 6;        // px of travel before a press counts as a drag
export const DRAG_START_ARMED = 10; // a little more with the weapon drawn, so a hurried click still strikes

export class ViewPress {
  constructor() { this.active = null; }
  // immediate: the action already fired on press (a drawn weapon strikes at once); release then does nothing.
  down(x, y, immediate = false) { this.active = {x, y, drag: false, immediate}; }
  // began is true on the one move that turns the press into a drag.
  move(x, y) {
    const p = this.active;
    if (!p) return {turn: false, began: false};
    if (p.drag) return {turn: true, began: false};
    if (Math.hypot(x - p.x, y - p.y) <= (p.immediate ? DRAG_START_ARMED : DRAG_START)) return {turn: false, began: false};
    p.drag = true;
    return {turn: true, began: true};
  }
  // True when the release completes a click that has not acted yet.
  up() { const p = this.active; this.active = null; return !!p && !p.drag && !p.immediate; }
  cancel() { this.active = null; }
}
