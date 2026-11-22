// Tiny Stack VM: interpreter 37 opcode, semantik persis SPEC.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR || '/input', O = process.env.MAKEFUN_OUTPUT_DIR || '/output';
// Tabel opcode: L = panjang immediate (-1 = tak dikenal), P = pops, U = pushes.
const L = new Int8Array(256).fill(-1), P = new Uint8Array(256), U = new Uint8Array(256);
const d = (o, l, p, u) => { L[o] = l; P[o] = p; U[o] = u; };
d(0, 0, 0, 0); d(1, 1, 0, 1); d(2, 4, 0, 1); d(3, 0, 1, 0);
d(4, 0, 1, 2); d(5, 0, 2, 2); d(6, 0, 2, 3); d(7, 0, 3, 3);
// Kelompok biner 2->1: 16-22, 24-26, 28-30, 32-34.
for (const r of [[16, 22], [24, 26], [28, 30], [32, 34]]) for (let o = r[0]; o <= r[1]; o++) d(o, 0, 2, 1);
d(23, 0, 1, 1); d(27, 0, 1, 1);
d(48, 2, 0, 0); d(49, 2, 1, 0); d(50, 2, 1, 0); d(51, 2, 0, 0); d(52, 0, 0, 0);
d(64, 0, 1, 1); d(65, 0, 2, 0);
d(80, 0, 1, 0); d(81, 0, 1, 0); d(82, 0, 0, 1); d(83, 0, 1, 0);
// Jalankan satu program; hasil [byte stdout, kode keluar].
function run(p, q) {
  const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536), n = p.length;
  let sp = 0, cs = 0, pc = 0, st = 0, ip = 0, ol = 0;
  const end = (c) => [out.subarray(0, ol), c];
  for (;;) {
    if (st === 1e6) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc], l = L[op];
    if (l < 0) return end(5);
    if (pc + l >= n) return end(9);
    st++;
    if (sp < P[op]) return end(2);
    if (sp - P[op] + U[op] > 256) return end(3);
    const nx = pc + 1 + l, t = p[pc + 1] | p[pc + 2] << 8;
    let a, b;
    switch (op) {
      case 0: return end(0);
      case 1: D[sp++] = (p[pc + 1] << 24) >> 24; break;
      case 2: D[sp++] = p[pc + 1] | p[pc + 2] << 8 | p[pc + 3] << 16 | p[pc + 4] << 24; break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: a = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = a; break;
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break;
      case 23: D[sp - 1] = -D[sp - 1] | 0; break;
      case 27: D[sp - 1] = ~D[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30:
      case 32: case 33: case 34:
        b = D[--sp]; a = D[sp - 1];
        if (b === 0 && op >= 19 && op <= 22) return end(4);
        D[sp - 1] = op === 16 ? (a + b) | 0 : op === 17 ? (a - b) | 0 : op === 18 ? Math.imul(a, b) :
          op === 19 ? (a / b) | 0 : op === 20 ? (a % b) | 0 :
          op === 21 ? Math.floor((a >>> 0) / (b >>> 0)) | 0 : op === 22 ? (a >>> 0) % (b >>> 0) | 0 :
          op === 24 ? a & b : op === 25 ? a | b : op === 26 ? a ^ b :
          op === 28 ? a << (b & 31) : op === 29 ? a >> (b & 31) : op === 30 ? (a >>> (b & 31)) | 0 :
          op === 32 ? (a === b ? 1 : 0) : op === 33 ? (a < b ? 1 : 0) : (a >>> 0) < (b >>> 0) ? 1 : 0;
        break;
      case 48: pc = nx + ((t << 16) >> 16); continue;
      case 49: case 50: a = D[--sp]; pc = nx + ((op === 49) === (a === 0) ? (t << 16) >> 16 : 0); continue;
      case 51: if (cs === 64) return end(7); C[cs++] = nx; pc = t; continue;
      case 52: if (cs === 0) return end(8); pc = C[--cs]; continue;
      case 64: a = D[sp - 1]; if (a < 0 || a > 255) return end(6); D[sp - 1] = M[a]; break;
      case 65: a = D[sp - 1]; if (a < 0 || a > 255) return end(6); M[a] = D[sp - 2]; sp -= 2; break;
      case 80: {
        const v = D[--sp], s = String(v);
        if (ol + s.length > 65536) return end(11);
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 81: a = D[--sp]; if (ol === 65536) return end(11); out[ol++] = a & 255; break;
      case 82: D[sp++] = ip < q.length ? q[ip++] : -1; break;
      case 83: return end(D[sp - 1] & 255);
    }
    pc = nx;
  }
}
for (const id of readdirSync(I).sort()) {
  const dir = join(I, id), od = join(O, id);
  const [o, c] = run(readFileSync(join(dir, 'program.bin')), readFileSync(join(dir, 'input.bin')));
  mkdirSync(od, { recursive: true });
  writeFileSync(join(od, 'stdout.bin'), o);
  writeFileSync(join(od, 'exit.txt'), c + '\n');
}
