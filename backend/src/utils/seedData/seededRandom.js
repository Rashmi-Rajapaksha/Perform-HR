/**
 * Deterministic PRNG (mulberry32) so that re-running the seeders produces
 * the same "realistic" dataset every time - useful for reproducible demos
 * and viva walkthroughs instead of a different random dataset each run.
 */
function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed = 42) {
  const rand = mulberry32(seed);

  return {
    next: () => rand(),
    int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
    float: (min, max, decimals = 2) => {
      const val = rand() * (max - min) + min;
      const factor = 10 ** decimals;
      return Math.round(val * factor) / factor;
    },
    choice: (arr) => arr[Math.floor(rand() * arr.length)],
    weightedChoice: (weightedArr) => {
      // weightedArr: [{ value, weight }]
      const total = weightedArr.reduce((s, w) => s + w.weight, 0);
      let r = rand() * total;
      for (const item of weightedArr) {
        r -= item.weight;
        if (r <= 0) return item.value;
      }
      return weightedArr[weightedArr.length - 1].value;
    },
    bool: (probabilityTrue = 0.5) => rand() < probabilityTrue,
    shuffle: (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

module.exports = { createRng };
