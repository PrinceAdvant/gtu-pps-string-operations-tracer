// Shared calculations for the four 2026-11-17 GTU practice tools.
// Practice inputs are my own, not copied from a GTU paper.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.F = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fail(msg) { throw new Error(msg); }
  function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }

  // ---------- exact fractions (integers) ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function Fr(n, d) {
    if (d == null) d = 1;
    if (d === 0) fail('division by zero');
    if (n === 0) return { n: 0, d: 1 };
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function fadd(a, b) { return Fr(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fsub(a, b) { return Fr(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fmul(a, b) { return Fr(a.n * b.n, a.d * b.d); }
  function fdiv(a, b) { if (b.n === 0) fail('division by zero'); return Fr(a.n * b.d, a.d * b.n); }
  function fneg(a) { return Fr(-a.n, a.d); }
  function feq(a, b) { return a.n === b.n && a.d === b.d; }
  function fstr(a) {
    if (a.d === 1) return String(a.n);
    if (a.n < 0) return '-' + (-a.n) + '/' + a.d;
    return a.n + '/' + a.d;
  }
  function ffrom(s) {
    if (typeof s === 'number') {
      if (!Number.isFinite(s) || !Number.isInteger(s)) fail('expected an integer or fraction, got ' + s);
      return Fr(s);
    }
    s = String(s).trim();
    if (!s) fail('empty number');
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length !== 2) fail('bad fraction ' + s);
      const n = Number(p[0]), d = Number(p[1]);
      if (!Number.isInteger(n) || !Number.isInteger(d)) fail('bad fraction ' + s);
      return Fr(n, d);
    }
    const n = Number(s);
    if (!Number.isInteger(n)) fail('expected an integer or fraction, got ' + s);
    return Fr(n);
  }

  // ===================== EGD scales =====================
  const UNITS_MM = { mm: 1, cm: 10, m: 1000, km: 1000000 };

  function parseRF(s) {
    s = String(s).trim().replace(/\s+/g, '');
    if (!s) fail('RF is empty');
    let n, d;
    if (s.includes(':')) {
      const p = s.split(':');
      if (p.length !== 2) fail('RF looks like 1:50 or 1/50');
      n = Number(p[0]); d = Number(p[1]);
    } else if (s.includes('/')) {
      const p = s.split('/');
      if (p.length !== 2) fail('RF looks like 1:50 or 1/50');
      n = Number(p[0]); d = Number(p[1]);
    } else {
      const v = Number(s);
      if (!(v > 0) || !Number.isFinite(v)) fail('RF must be a positive number');
      if (v > 1) fail('A representative fraction is less than or equal to 1. Did you mean 1:' + v + '?');
      return { n: v, d: 1, dec: v, text: '1 : ' + String(Math.round(1 / v)) };
    }
    if (!(n > 0) || !(d > 0) || !Number.isFinite(n) || !Number.isFinite(d)) fail('RF must be positive');
    if (n > d) fail('RF should be drawing:object, so the first number is smaller (1:50, not 50:1).');
    const g = gcd(Math.round(n * 1000), Math.round(d * 1000));
    // keep original ratio text
    return { n, d, dec: n / d, text: n + ' : ' + d };
  }

  function toMM(value, unit) {
    unit = String(unit || 'm').toLowerCase();
    if (!UNITS_MM[unit]) fail('Unit must be mm, cm, m or km');
    const v = Number(value);
    if (!(v > 0) || !Number.isFinite(v)) fail('Length must be a positive number');
    return v * UNITS_MM[unit];
  }

  function fromStatement(drawVal, drawUnit, objVal, objUnit) {
    const a = toMM(drawVal, drawUnit);
    const b = toMM(objVal, objUnit);
    const g = gcd(Math.round(a), Math.round(b));
    // Use exact mm ratio reduced
    const n = a, d = b;
    return { n, d, dec: n / d, text: simplifyRatio(n, d) };
  }

  function simplifyRatio(n, d) {
    // reduce using integers if close to ints, else 1 : d/n
    const r = d / n;
    if (near(r, Math.round(r), 1e-8)) return '1 : ' + String(Math.round(r));
    // try 10 decimals as ints
    const k = 1e6;
    const g = gcd(Math.round(n * k), Math.round(d * k));
    const nn = Math.round(n * k) / g, dd = Math.round(d * k) / g;
    if (nn === 1) return '1 : ' + String(dd);
    return nn + ' : ' + dd;
  }

  function scalePlan(rf, maxVal, maxUnit, kind) {
    const rfObj = typeof rf === 'object' && rf.dec ? rf : parseRF(rf);
    const maxMM = toMM(maxVal, maxUnit);
    const lengthMM = rfObj.dec * maxMM;
    if (!(lengthMM > 0)) fail('Length of scale came out zero');
    kind = (kind || 'diagonal').toLowerCase();
    if (kind !== 'plain' && kind !== 'diagonal' && kind !== 'plane') fail('Kind must be plain or diagonal');
    if (kind === 'plane') kind = 'plain';

    const unit = String(maxUnit || 'm').toLowerCase();
    const chain = unitChain(unit);
    // main divisions: one per whole maxUnit (if max is integer)
    const maxN = Number(maxVal);
    const mainCount = Number.isInteger(maxN) && maxN >= 1 ? maxN : 1;
    const mainMM = lengthMM / mainCount;
    const secondaryName = chain[1];
    const tertiaryName = chain[2];
    const secondaryParts = 10;
    const tertiaryParts = kind === 'diagonal' ? 10 : 0;

    let warning = '';
    if (lengthMM > 180) {
      warning = 'Length of scale is ' + round2(lengthMM) + ' mm, which is long for an A2/A3 sheet. In the exam, say so and either reduce the maximum length or split the scale.';
    } else if (lengthMM < 20) {
      warning = 'Length of scale is only ' + round2(lengthMM) + ' mm, which is short to draw and subdivide. Check the RF and the maximum length.';
    }

    return {
      rfText: rfObj.text,
      rfDec: rfObj.dec,
      lengthMM: round4(lengthMM),
      mainCount,
      mainMM: round4(mainMM),
      mainUnit: chain[0],
      secondaryName,
      tertiaryName,
      secondaryParts,
      tertiaryParts,
      kind,
      how: howToDraw(kind, mainCount, mainMM, chain, lengthMM),
      warning
    };
  }

  function unitChain(unit) {
    if (unit === 'km') return ['km', 'hectometres (1/10 km)', 'decametres (1/100 km)'];
    if (unit === 'm') return ['metres', 'decimetres', 'centimetres'];
    if (unit === 'cm') return ['centimetres', 'millimetres', 'tenths of a millimetre'];
    return ['millimetres', 'tenths of a millimetre', 'hundredths of a millimetre'];
  }

  function howToDraw(kind, mainCount, mainMM, chain, lengthMM) {
    const lines = [];
    lines.push('Draw a line ' + round2(lengthMM) + ' mm long. This is the length of the scale.');
    lines.push('Divide it into ' + mainCount + ' equal part' + (mainCount > 1 ? 's' : '') + ' of ' + round2(mainMM) + ' mm. Each main part is 1 ' + chain[0].replace(/s$/, '') + ' (or the main unit you chose).');
    lines.push('Mark 0 after the first main part, then 1, 2, ... to the right. The leftover first part, to the left of 0, is for the smaller unit.');
    lines.push('Divide the part to the left of 0 into 10. Each small division is 1 ' + chain[1].replace(/s$/, '').replace(/ \(.*\)$/, '') + '. This is a plain (plane) scale, enough for two units.');
    if (kind === 'diagonal') {
      lines.push('For a diagonal scale (three units), draw 10 equally spaced horizontals on a rectangle of height about 30 to 50 mm, and join diagonals on the left part. Each step up a diagonal is 1 ' + chain[2].replace(/s$/, '').replace(/ \(.*\)$/, '') + '.');
      lines.push('To read a length, take the main unit from the right of 0, the secondary unit from the left of 0, and the smallest unit from the diagonal row.');
    }
    return lines;
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function round4(x) { return Math.round(x * 10000) / 10000; }

  const sca = {
    parseRF, fromStatement, plan: scalePlan,
    // helpers for tests
    toMM
  };

  // ===================== Analytic function from u(x,y) =====================
  // Polynomials in x,y with rational coeffs, plus a few standard named forms.

  function polyMake() { return {}; } // key "i,j" -> Fr
  function pk(i, j) { return i + ',' + j; }
  function pget(p, i, j) { return p[pk(i, j)] || Fr(0); }
  function pset(p, i, j, f) {
    if (f.n === 0) delete p[pk(i, j)];
    else p[pk(i, j)] = f;
  }
  function padd(p, i, j, f) { pset(p, i, j, fadd(pget(p, i, j), f)); }
  function pclone(p) {
    const q = polyMake();
    for (const k of Object.keys(p)) q[k] = p[k];
    return q;
  }
  function pterms(p) {
    return Object.keys(p).map((k) => {
      const [i, j] = k.split(',').map(Number);
      return { i, j, c: p[k] };
    }).sort((a, b) => (b.i + b.j) - (a.i + a.j) || b.i - a.i);
  }
  function pstr(p, vars) {
    vars = vars || ['x', 'y'];
    const t = pterms(p);
    if (!t.length) return '0';
    return t.map((term, idx) => {
      let s = monom(term.c, term.i, term.j, vars);
      if (idx === 0) return s;
      if (s.startsWith('-')) return ' - ' + s.slice(1);
      return ' + ' + s;
    }).join('');
  }
  function monom(c, i, j, vars) {
    const vx = vars[0], vy = vars[1];
    let coeff = fstr(c);
    const parts = [];
    if (i === 1) parts.push(vx);
    else if (i > 1) parts.push(vx + '^' + i);
    if (j === 1) parts.push(vy);
    else if (j > 1) parts.push(vy + '^' + j);
    if (!parts.length) return coeff;
    if (coeff === '1') return parts.join('');
    if (coeff === '-1') return '-' + parts.join('');
    return coeff + parts.join('');
  }
  function pdx(p) {
    const q = polyMake();
    for (const t of pterms(p)) {
      if (t.i === 0) continue;
      padd(q, t.i - 1, t.j, fmul(t.c, Fr(t.i)));
    }
    return q;
  }
  function pdy(p) {
    const q = polyMake();
    for (const t of pterms(p)) {
      if (t.j === 0) continue;
      padd(q, t.i, t.j - 1, fmul(t.c, Fr(t.j)));
    }
    return q;
  }
  function pintegratex(p) { // ∫ p dx  (no +g(y))
    const q = polyMake();
    for (const t of pterms(p)) padd(q, t.i + 1, t.j, fdiv(t.c, Fr(t.i + 1)));
    return q;
  }
  function peq(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const [i, j] = k.split(',').map(Number);
      if (!feq(pget(a, i, j), pget(b, i, j))) return false;
    }
    return true;
  }
  function pscale(p, f) {
    const q = polyMake();
    for (const t of pterms(p)) padd(q, t.i, t.j, fmul(t.c, f));
    return q;
  }
  function pplus(a, b) {
    const q = pclone(a);
    for (const t of pterms(b)) padd(q, t.i, t.j, t.c);
    return q;
  }
  function peval(p, x, y) {
    let s = 0;
    for (const t of pterms(p)) s += (t.c.n / t.c.d) * Math.pow(x, t.i) * Math.pow(y, t.j);
    return s;
  }
  // evaluate polynomial as a function of z, with x=z, y=0 (real line) for f'(z) construction
  function pstrZ(p, which) {
    // which: 'ux' means u_x(z,0) as a polynomial in z; 'uy' similarly
    // Represent as poly in z only: terms with j>0 vanish at y=0
    const q = polyMake();
    for (const t of pterms(p)) if (t.j === 0) padd(q, t.i, 0, t.c);
    return pstr(q, ['z', 'y']);
  }
  function pintegrateZ(pAtY0) {
    // integrate polynomial in z (j=0 terms)
    const q = polyMake();
    for (const t of pterms(pAtY0)) {
      if (t.j !== 0) continue;
      padd(q, t.i + 1, 0, fdiv(t.c, Fr(t.i + 1)));
    }
    return q;
  }

  // Very small polynomial parser: sums of optional-sign terms like  -3*x^2*y, x^2-y^2, 2xy, x, 4
  function parsePoly(s) {
    s = String(s).trim().replace(/\s+/g, '');
    if (!s) fail('Enter u(x,y), for example x^2-y^2');
    // reject known specials here
    if (/exp|sin|cos|log|ln|e\^/i.test(s)) return null;
    if (!/^[0-9xXyY+\-*/^().]+$/.test(s)) fail('Use a polynomial in x and y, like x^2-y^2 or x^3-3*x*y^2, or a named form such as exp(x)*cos(y).');
    // insert + before minus that starts a term (not after ^ or * or / or () )
    const parts = [];
    let i = 0;
    while (i < s.length) {
      let sign = 1;
      if (s[i] === '+') { i++; continue; }
      if (s[i] === '-') { sign = -1; i++; }
      if (i >= s.length) fail('expression ended early');
      // read one term up to + or - that is not an exponent sign
      let j = i;
      while (j < s.length) {
        if ((s[j] === '+' || s[j] === '-') && j > i) break;
        j++;
      }
      const term = s.slice(i, j);
      if (!term) fail('empty term in ' + s);
      parts.push({ sign, term });
      i = j;
    }
    const p = polyMake();
    for (const part of parts) {
      const { powX, powY, coeff } = parseTerm(part.term);
      padd(p, powX, powY, fmul(Fr(part.sign), coeff));
    }
    return p;
  }
  function parseTerm(term) {
    // product of factors: number, x, y, x^n, y^n, (number)
    let coeff = Fr(1), powX = 0, powY = 0, i = 0;
    const t = term;
    if (!t) fail('empty term');
    while (i < t.length) {
      if (t[i] === '*') { i++; continue; }
      if (t[i] === '(') fail('Parentheses in a term are not needed. Write x^2-y^2 or 2*x*y.');
      if (t[i] === 'x' || t[i] === 'X') {
        let p = 1; i++;
        if (t[i] === '^') {
          i++;
          const r = readInt(t, i, false);
          p = r.val; i = r.next;
        }
        powX += p;
        continue;
      }
      if (t[i] === 'y' || t[i] === 'Y') {
        let p = 1; i++;
        if (t[i] === '^') {
          i++;
          const r = readInt(t, i, false);
          p = r.val; i = r.next;
        }
        powY += p;
        continue;
      }
      if ((t[i] >= '0' && t[i] <= '9') || t[i] === '.') {
        const r = readNumber(t, i);
        coeff = fmul(coeff, r.frac);
        i = r.next;
        continue;
      }
      fail('Cannot parse term: ' + term);
    }
    return { powX, powY, coeff };
  }
  function readInt(t, i, allowNeg) {
    let sign = 1;
    if (allowNeg && t[i] === '-') { sign = -1; i++; }
    if (i >= t.length || t[i] < '0' || t[i] > '9') fail('expected an integer');
    let n = 0;
    while (i < t.length && t[i] >= '0' && t[i] <= '9') { n = n * 10 + (t[i].charCodeAt(0) - 48); i++; }
    return { val: sign * n, next: i };
  }
  function readNumber(t, i) {
    let s = '', start = i;
    while (i < t.length && t[i] >= '0' && t[i] <= '9') { s += t[i]; i++; }
    if (t[i] === '.') {
      s += '.'; i++;
      while (i < t.length && t[i] >= '0' && t[i] <= '9') { s += t[i]; i++; }
    }
    if (t[i] === '/') {
      // fraction 1/2
      const num = Number(t.slice(start, i));
      i++;
      const r = readInt(t, i, false);
      if (!Number.isInteger(num)) fail('use a fraction of integers');
      return { frac: Fr(num, r.val), next: r.next };
    }
    if (s.includes('.')) fail('Use fractions such as 1/2 instead of decimals in u(x,y).');
    return { frac: Fr(Number(s)), next: i };
  }

  function specialForm(s) {
    const k = String(s).trim().toLowerCase().replace(/\s+/g, '');
    const forms = {
      'exp(x)*cos(y)': 'excos',
      'e^x*cos(y)': 'excos',
      'e^xcos(y)': 'excos',
      'exp(x)cos(y)': 'excos',
      'exp(x)*sin(y)': 'exsin',
      'e^x*sin(y)': 'exsin',
      'e^xsin(y)': 'exsin',
      'exp(x)sin(y)': 'exsin',
      'cos(x)*sinh(y)': 'coshsinh_not', // skip
    };
    return forms[k] || null;
  }

  function analyticFromU(uText) {
    const spec = specialForm(uText);
    if (spec === 'excos') {
      return {
        kind: 'special',
        u: 'e^x cos(y)',
        ux: 'e^x cos(y)',
        uy: '-e^x sin(y)',
        uxx: 'e^x cos(y)',
        uyy: '-e^x cos(y)',
        harmonic: true,
        v: 'e^x sin(y) + c',
        f: 'e^z + i c',
        fp: 'e^z',
        note: 'This is the standard pair u = Re(e^z), v = Im(e^z).'
      };
    }
    if (spec === 'exsin') {
      return {
        kind: 'special',
        u: 'e^x sin(y)',
        ux: 'e^x sin(y)',
        uy: 'e^x cos(y)',
        uxx: 'e^x sin(y)',
        uyy: '-e^x sin(y)',
        harmonic: true,
        v: '-e^x cos(y) + c',
        f: '-i e^z + i c',
        fp: '-i e^z',
        note: 'u = Re(-i e^z) = e^x sin(y). The conjugate is v = -e^x cos(y) + c.'
      };
    }
    const u = parsePoly(uText);
    if (!u) fail('Cannot parse u(x,y). Try x^2-y^2 or exp(x)*cos(y).');
    const ux = pdx(u), uy = pdy(u);
    const uxx = pdx(ux), uyy = pdy(uy);
    const harmonic = peq(pplus(uxx, uyy), polyMake());
    const out = {
      kind: 'poly',
      u: pstr(u),
      ux: pstr(ux),
      uy: pstr(uy),
      uxx: pstr(uxx),
      uyy: pstr(uyy),
      harmonic,
      v: null,
      f: null,
      fp: null,
      note: ''
    };
    if (!harmonic) {
      out.note = 'u_xx + u_yy is not 0, so u is not harmonic. No analytic function has this real part. Laplace equation pehle check karo.';
      return out;
    }
    // v = ∫ -u_y dx + g(y)
    const minusUy = pscale(uy, Fr(-1));
    const vPart = pintegratex(minusUy); // no g(y)
    // ∂v/∂y should equal u_x. Compute ∂vPart/∂y and the difference, which must depend only on y
    const vyPart = pdy(vPart);
    // u_x - vyPart = g'(y)
    const gp = pplus(ux, pscale(vyPart, Fr(-1)));
    // gp must have i=0 for all terms (no x)
    for (const t of pterms(gp)) {
      if (t.i !== 0) fail('CR integration failed (g\'(y) still depends on x). Check the input.');
    }
    // g(y) = ∫ g'(y) dy  (treat i=0, j -> j+1)
    const g = polyMake();
    for (const t of pterms(gp)) padd(g, 0, t.j + 1, fdiv(t.c, Fr(t.j + 1)));
    const v = pplus(vPart, g);
    out.v = pstr(v) + ' + c';

    // f'(z) = u_x(z,0) - i u_y(z,0)
    const uxZ = polyMake();
    const uyZ = polyMake();
    for (const t of pterms(ux)) if (t.j === 0) padd(uxZ, t.i, 0, t.c);
    for (const t of pterms(uy)) if (t.j === 0) padd(uyZ, t.i, 0, t.c);
    const fpRe = pstr(uxZ, ['z', 'y']);
    const fpIm = pstr(pscale(uyZ, Fr(-1)), ['z', 'y']); // -u_y, then times i
    // Build string for f' = Re + i*( - uy) wait: f' = ux - i * uy
    let fpStr;
    if (peq(uyZ, polyMake())) fpStr = fpRe;
    else if (peq(uxZ, polyMake())) {
      // 0 - i * uy = -i * uy
      const uyS = pstr(uyZ, ['z', 'y']);
      fpStr = (uyS === '1') ? '-i' : (uyS === '-1' ? 'i' : '-i (' + uyS + ')');
    } else {
      const im = pstr(uyZ, ['z', 'y']);
      fpStr = fpRe + ' - i (' + im + ')';
    }
    // Integrate f' along real: integrate uxZ, and -i * integrate uyZ
    const intUx = pintegrateZ(uxZ);
    const intUy = pintegrateZ(uyZ);
    let fStr;
    const reF = pstr(intUx, ['z', 'y']);
    if (peq(intUy, polyMake())) fStr = reF + ' + i c';
    else {
      const imF = pstr(intUy, ['z', 'y']);
      if (reF === '0') fStr = '- i (' + imF + ') + i c';
      else fStr = reF + ' - i (' + imF + ') + i c';
    }
    // Beautify known cases z^2, z^3
    fStr = beautifyF(fStr, intUx, intUy);
    fpStr = beautifyFp(fpStr, uxZ, uyZ);
    out.f = fStr;
    out.fp = fpStr;
    out.note = 'The real constant in v (or the imaginary constant in f) is arbitrary. In the exam, write + c.';
    // stash polys for tests
    out._v = v; out._u = u;
    return out;
  }

  function beautifyF(s, intUx, intUy) {
    // z^2: u=x^2-y^2, v=2xy, intUx=z^2, intUy=0? u_y=-2y, uy(z,0)=0, f=z^2. already good
    return s;
  }
  function beautifyFp(s, uxZ, uyZ) { return s; }

  const anl = { fromU: analyticFromU, parsePoly, pstr, pdx, pdy, peq, peval, _pterms: pterms, _pget: pget };

  // ===================== Laser Ruby vs He-Ne + energy =====================
  const HC_EV_NM = 1239.84193; // hc in eV·nm (CODATA-style, 3 more than enough for exam 12400/10)
  const HC_EXAM = 1240; // common exam value in eV·nm
  const H_J = 6.62607015e-34;
  const C_MS = 2.99792458e8;
  const E_CHARGE = 1.60217662e-19;

  const LASER = {
    ruby: {
      name: 'Ruby laser',
      medium: 'ruby crystal (Al2O3 doped with Cr3+)',
      state: 'solid state',
      levels: '3-level',
      pumping: 'optical pumping by a xenon flash lamp',
      output: 'pulsed',
      wavelength_nm: 694.3,
      colour: 'red',
      resonator: 'ends of the ruby rod are silvered (one fully, one partially reflecting)'
    },
    hene: {
      name: 'He-Ne laser',
      medium: 'helium-neon gas mixture',
      state: 'gas',
      levels: '4-level',
      pumping: 'electrical discharge',
      output: 'continuous (CW)',
      wavelength_nm: 632.8,
      colour: 'red',
      resonator: 'mirrors mounted outside the discharge tube'
    }
  };

  function photon(wavelengthNm, energyJoule) {
    const lam = Number(wavelengthNm);
    if (!(lam > 0) || !Number.isFinite(lam)) fail('Wavelength must be a positive number of nm');
    const E_eV_exam = HC_EXAM / lam;
    const E_eV = HC_EV_NM / lam;
    const E_J = (H_J * C_MS) / (lam * 1e-9);
    let nPhotons = null;
    if (energyJoule !== '' && energyJoule != null) {
      const U = Number(energyJoule);
      if (!(U >= 0) || !Number.isFinite(U)) fail('Pulse energy must be a non-negative number of joules');
      nPhotons = U / E_J;
    }
    return {
      wavelength_nm: lam,
      frequency_hz: C_MS / (lam * 1e-9),
      energy_eV_exam: E_eV_exam,
      energy_eV: E_eV,
      energy_J: E_J,
      nPhotons
    };
  }

  function compareRow(field) {
    return { ruby: LASER.ruby[field], hene: LASER.hene[field] };
  }

  const las = { photon, LASER, compareRow, HC_EXAM, HC_EV_NM };

  // ===================== PPS string operations =====================
  function isVowel(ch) { return 'aeiouAEIOU'.includes(ch); }
  function isLetter(ch) { return /[A-Za-z]/.test(ch); }
  function isDigit(ch) { return ch >= '0' && ch <= '9'; }

  function strOps(s, other) {
    if (s == null) fail('Enter a string');
    s = String(s);
    // length without relying on counting UTF-16 surprises: use JS length (exam is ASCII)
    const length = s.length;
    let rev = '';
    for (let i = length - 1; i >= 0; i--) rev += s[i];
    const palindrome = s === rev;
    let vowels = 0, consonants = 0, digits = 0, spaces = 0, others = 0;
    for (let i = 0; i < length; i++) {
      const ch = s[i];
      if (isVowel(ch)) vowels++;
      else if (isLetter(ch)) consonants++;
      else if (isDigit(ch)) digits++;
      else if (ch === ' ') spaces++;
      else others++;
    }
    // words: sequences of non-space
    const words = s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
    let cmp = null;
    if (other != null) {
      const t = String(other);
      if (s === t) cmp = { result: 0, text: 'equal' };
      else if (s < t) cmp = { result: -1, text: 'first < second (ASCII / dictionary order)' };
      else cmp = { result: 1, text: 'first > second (ASCII / dictionary order)' };
    }
    return { length, reverse: rev, palindrome, vowels, consonants, digits, spaces, others, words, compare: cmp };
  }

  const str = { ops: strOps };

  return { sca, anl, las, str, _frac: { Fr, fadd, fstr, feq } };
});
