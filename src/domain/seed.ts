export function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededUnit(seed: number, salt: number): number {
  let value = seed + Math.imul(salt + 1, 0x6d2b79f5)
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

export function stableId(prefix: string, seed: number, ordinal: number): string {
  return `${prefix}_${(seed ^ Math.imul(ordinal + 1, 2654435761)).toString(36)}`
}
