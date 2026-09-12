// Minimal Aho-Corasick automaton for multi-pattern substring search.
// Used to scan every straight line in a rendered matrix against the whole
// lexicon (1000+ words) in a single linear pass per line, rather than
// testing each word individually.
export class AhoCorasick {
  constructor(words) {
    // Each node: { next: Map<char,int>, fail: int, out: number[] (pattern indices ending here) }
    this.nodes = [{ next: new Map(), fail: 0, out: [] }];
    this.words = words;
    for (let i = 0; i < words.length; i++) this._insert(words[i], i);
    this._buildFailureLinks();
  }

  _insert(word, patternIndex) {
    let node = 0;
    for (const ch of word) {
      const cur = this.nodes[node];
      if (!cur.next.has(ch)) {
        this.nodes.push({ next: new Map(), fail: 0, out: [] });
        cur.next.set(ch, this.nodes.length - 1);
      }
      node = cur.next.get(ch);
    }
    this.nodes[node].out.push(patternIndex);
  }

  _buildFailureLinks() {
    const root = 0;
    const queue = [];
    for (const [, child] of this.nodes[root].next) {
      this.nodes[child].fail = root;
      queue.push(child);
    }
    let qi = 0;
    while (qi < queue.length) {
      const u = queue[qi++];
      for (const [ch, v] of this.nodes[u].next) {
        queue.push(v);
        let f = this.nodes[u].fail;
        while (f !== root && !this.nodes[f].next.has(ch)) f = this.nodes[f].fail;
        this.nodes[v].fail = this.nodes[f].next.has(ch) && this.nodes[f].next.get(ch) !== v
          ? this.nodes[f].next.get(ch)
          : root;
        // Merge output sets across fail links for O(1) reporting later.
        this.nodes[v].out = this.nodes[v].out.concat(this.nodes[this.nodes[v].fail].out);
      }
    }
  }

  // Returns [{start, end, patternIndex}] for every match in `text`
  // (end is exclusive). Overlapping matches are all reported.
  search(text) {
    const matches = [];
    let node = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node !== 0 && !this.nodes[node].next.has(ch)) node = this.nodes[node].fail;
      if (this.nodes[node].next.has(ch)) node = this.nodes[node].next.get(ch);
      else node = 0;
      const out = this.nodes[node].out;
      for (let k = 0; k < out.length; k++) {
        const pIdx = out[k];
        const len = this.words[pIdx].length;
        matches.push({ start: i - len + 1, end: i + 1, patternIndex: pIdx });
      }
    }
    return matches;
  }
}
