// KO detection + scoreboard. An entity leaves the camera bounds -> KO event.
// Scoreboard mirrors the replay's results.scores (entityId -> score).

import type { Entity } from '../types.js'

export type KoDetection = {
  camera: { x: number; y: number; width: number; height: number }
}

/**
 * Return the entities that left the camera bounds this frame. Camera is the
 * level's CameraBounds (from level geometry). An entity is KO'd when its
 * position is fully outside the camera rect.
 */
export function detectKos(
  entities: Map<number, Entity>,
  det: KoDetection,
  _frame: number,
): Array<{ entityId: number }> {
  const out: Array<{ entityId: number }> = []
  const { camera } = det
  const minX = camera.x
  const maxX = camera.x + camera.width
  const minY = camera.y
  const maxY = camera.y + camera.height
  for (const [id, e] of entities) {
    if (e.ko) continue
    const outX = e.x < minX || e.x > maxX
    const outY = e.y < minY || e.y > maxY
    if (outX || outY) out.push({ entityId: id })
  }
  return out
}

/** Apply a score delta to the scoreboard (initializes on first touch). */
export function applyScore(scores: Record<number, number>, entityId: number, delta: number): void {
  scores[entityId] = (scores[entityId] ?? 0) + delta
}
