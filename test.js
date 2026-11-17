const F = require('./calc.js');
const eq = (x, y, msg) => {
  if (JSON.stringify(x) !== JSON.stringify(y)) {
    throw Error((msg ? msg + ': ' : '') + JSON.stringify(x) + ' vs ' + JSON.stringify(y));
  }
};
const near = (a, b, eps, msg) => {
  if (Math.abs(a - b) > (eps == null ? 1e-9 : eps)) {
    throw Error((msg || 'near') + ': ' + a + ' vs ' + b);
  }
};
const throws = (fn) => { try { fn(); } catch (e) { return; } throw Error('expected an error'); };

// ----- EGD diagonal / plain scale (own practice values) -----
// RF 1:50, max 5 m -> length = (1/50)*5000 mm = 100 mm, 5 main parts of 20 mm
let p = F.sca.plan('1:50', 5, 'm', 'diagonal');
near(p.lengthMM, 100); eq(p.mainCount, 5); near(p.mainMM, 20); eq(p.kind, 'diagonal');
eq(p.rfText, '1 : 50'); eq(p.secondaryName, 'decimetres');

// 1 cm represents 2.5 m -> RF = 10 mm / 2500 mm = 1:250
let rf = F.sca.fromStatement(1, 'cm', 2.5, 'm');
eq(rf.text, '1 : 250'); near(rf.dec, 1 / 250);

// RF 1:4000, max 500 m -> (1/4000)*500000 mm = 125 mm
p = F.sca.plan('1/4000', 500, 'm', 'plain');
near(p.lengthMM, 125); eq(p.kind, 'plain'); eq(p.tertiaryParts, 0);

// RF 1:400, max 6 m -> 15 mm (short warning)
p = F.sca.plan('1:400', 6, 'm', 'diagonal');
near(p.lengthMM, 15); if (!p.warning) throw Error('expected a short-scale warning');

// RF 1:20, max 5 m -> 250 mm (long warning)
p = F.sca.plan('1:20', 5, 'm', 'plain');
near(p.lengthMM, 250); if (!p.warning) throw Error('expected a long-scale warning');

throws(() => F.sca.plan('50:1', 5, 'm', 'plain'));
throws(() => F.sca.plan('0', 5, 'm', 'plain'));
throws(() => F.sca.parseRF(''));

// ----- Analytic function from u(x,y) -----
// u = x^2 - y^2  -> harmonic, v = 2xy + c, f = z^2 + i c, f' = 2z
let a = F.anl.fromU('x^2-y^2');
eq(a.harmonic, true);
eq(a.u, 'x^2 - y^2');
eq(a.ux, '2x'); eq(a.uy, '-2y');
eq(a.uxx, '2'); eq(a.uyy, '-2');
eq(a.v, '2xy + c');
eq(a.f, 'z^2 + i c');
eq(a.fp, '2z');
// CR check at a point: v_x = 2y = -u_y, v_y = 2x = u_x
near(F.anl.peval(a._v, 3, 4), 2 * 3 * 4);

// u = x^3 - 3xy^2  (Re(z^3)) -> v = 3x^2 y - y^3 + c, f' = 3z^2
a = F.anl.fromU('x^3-3*x*y^2');
eq(a.harmonic, true);
eq(a.v, '3x^2y - y^3 + c');
eq(a.f, 'z^3 + i c');
eq(a.fp, '3z^2');

// u = 2xy  (Im(z^2) used as a real part: Re(-i z^2) = 2xy) -> v = y^2 - x^2 + c
a = F.anl.fromU('2*x*y');
eq(a.harmonic, true);
eq(a.v, '-x^2 + y^2 + c');
// f' = u_x(z,0) - i u_y(z,0) = 2y|(y=0) - i (2x at y=0) = 0 - i (2z) = -2 i z
// f = -i z^2 + i c
eq(a.fp, '-i (2z)');
eq(a.f, '- i (z^2) + i c');

// not harmonic: u = x^2
a = F.anl.fromU('x^2');
eq(a.harmonic, false);
if (!a.note.includes('not harmonic')) throw Error('expected not-harmonic note');

// special: exp(x)*cos(y)
a = F.anl.fromU('exp(x)*cos(y)');
eq(a.harmonic, true);
eq(a.f, 'e^z + i c');
eq(a.fp, 'e^z');
eq(a.v, 'e^x sin(y) + c');

a = F.anl.fromU('e^x * sin(y)');
eq(a.harmonic, true);
eq(a.f, '-i e^z + i c');

throws(() => F.anl.fromU(''));
throws(() => F.anl.fromU('sin(z)'));

// ----- Laser photon energy (own practice values) -----
// Ruby 694.3 nm with exam constant 1240 eV·nm: 1240/694.3 ≈ 1.78597 eV
let ph = F.las.photon(694.3);
near(ph.energy_eV_exam, 1240 / 694.3, 1e-12);
near(ph.energy_eV, 1239.84193 / 694.3, 1e-12);
near(ph.frequency_hz, 2.99792458e8 / (694.3e-9), 1);

// He-Ne 632.8 nm
ph = F.las.photon(632.8);
near(ph.energy_eV_exam, 1240 / 632.8, 1e-12);

// 10 mJ pulse at 694.3 nm: n = U / E
ph = F.las.photon(694.3, 0.01);
near(ph.nPhotons, 0.01 / ph.energy_J, 1e-6);
if (!(ph.nPhotons > 1e15)) throw Error('photon count should be huge');

eq(F.las.LASER.ruby.levels, '3-level');
eq(F.las.LASER.hene.levels, '4-level');
eq(F.las.LASER.ruby.wavelength_nm, 694.3);
eq(F.las.LASER.hene.wavelength_nm, 632.8);
throws(() => F.las.photon(0));
throws(() => F.las.photon(-10));

// ----- PPS string operations -----
let s = F.str.ops('GTU Hero');
eq(s.length, 8);
eq(s.reverse, 'oreH UTG');
eq(s.palindrome, false);
eq(s.vowels, 3); // U, e, o
eq(s.consonants, 4); // G T H r
eq(s.digits, 0);
eq(s.spaces, 1);
eq(s.words, 2);

s = F.str.ops('level');
eq(s.palindrome, true);
eq(s.reverse, 'level');
eq(s.vowels, 2); eq(s.consonants, 3);

s = F.str.ops('A1 b2');
eq(s.length, 5); eq(s.digits, 2); eq(s.spaces, 1); eq(s.vowels, 1); eq(s.consonants, 1);

s = F.str.ops('cat', 'dog');
eq(s.compare.result, -1);
s = F.str.ops('dog', 'cat');
eq(s.compare.result, 1);
s = F.str.ops('GTU', 'GTU');
eq(s.compare.result, 0);

s = F.str.ops('   ');
eq(s.words, 0); eq(s.spaces, 3); eq(s.length, 3);

s = F.str.ops('Programming');

eq(s.length, 11); eq(s.vowels, 3); eq(s.consonants, 8);

console.log('All checks passed');
