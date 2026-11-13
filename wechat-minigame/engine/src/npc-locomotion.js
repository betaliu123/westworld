// Navigation keeps ownership of direction/collision. Ease only the requested
// travel distance, so corners cannot cut through walls or overshoot a seat.
export function npcArriveStep(distance, speed, dt, stop=.12) {
  const remaining=Math.max(0,distance-stop);
  const brakingSpeed=Math.sqrt(2*2.6*remaining);
  return Math.min(remaining,Math.min(speed,brakingSpeed)*dt);
}
export function npcTravelStep(requested, previousSpeed, dt) {
  if(dt<=0||requested<=0)return 0;
  const target=requested/dt;
  const speed=previousSpeed+(target-previousSpeed)*(1-Math.exp(-9*dt));
  return Math.min(requested,Math.max(0,speed)*dt);
}
