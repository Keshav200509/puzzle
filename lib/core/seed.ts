const encoder = new TextEncoder();

export async function createSeedHash(dateKey: string, secret: string): Promise<string> {
  const data = encoder.encode(`${dateKey}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function createSeededRandom(seedHex: string): () => number {
  let state = Number.parseInt(seedHex.slice(0, 8), 16) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
