export type DriveInput = "forward" | "backward" | "left" | "right" | "brake";
export interface DriveCollider { minX: number; maxX: number; minZ: number; maxZ: number }
export interface DriveState { x: number; z: number; heading: number; speed: number; distance: number }
export const newDriveState = (): DriveState => ({ x: 0, z: 0, heading: 0, speed: 0, distance: 0 });

// Three circles approximate the body; fixed 120 Hz steps keep movement below 20 cm.
export function driveCollides(x: number, z: number, heading: number, colliders: DriveCollider[]) {
  for (const offset of [-1.25, 0, 1.25]) {
    const cx = x + Math.sin(heading) * offset;
    const cz = z + Math.cos(heading) * offset;
    if (cx - 0.92 < -90 || cx + 0.92 > 90 || cz - 0.92 < -20 || cz + 0.92 > 180) return true;
    for (const box of colliders) {
      const dx = cx - Math.max(box.minX, Math.min(cx, box.maxX));
      const dz = cz - Math.max(box.minZ, Math.min(cz, box.maxZ));
      if (dx * dx + dz * dz < 0.92 * 0.92) return true;
    }
  }
  return false;
}
export function stepDrive(state: DriveState, input: ReadonlySet<DriveInput>, colliders: DriveCollider[], dt: number) {
  const throttle = Number(input.has("forward")) - Number(input.has("backward"));
  const braking = input.has("brake") || (throttle !== 0 && Math.sign(state.speed) !== throttle && Math.abs(state.speed) > 0.2);
  if (braking) state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - 22 * dt);
  else if (throttle) state.speed += throttle * (throttle > 0 ? 8 : 5) * dt;
  else state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - (1.5 + Math.abs(state.speed) * 0.12) * dt);
  state.speed = Math.max(-7, Math.min(22, state.speed));
  const steer = Number(input.has("left")) - Number(input.has("right"));
  const heading = state.heading + steer * state.speed * 0.085 * dt / (1 + Math.abs(state.speed) * 0.018);
  const x = state.x + Math.sin(heading) * state.speed * dt;
  const z = state.z + Math.cos(heading) * state.speed * dt;
  if (driveCollides(x, z, heading, colliders)) { state.speed = 0; return; }
  state.distance += Math.hypot(x - state.x, z - state.z);
  state.x = x; state.z = z; state.heading = heading;
}
