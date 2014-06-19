function hslToHex(h, s, l) {
  var r, g, b;
  var v, min, sv, sextant, fract, vsf;

  if (l <= 0.5) {
    v = l * (1 + s);
  } else {
    v = l + s - l * s;
  }

  if (v === 0) {
    return '#000';
  } else {
    min = 2 * l - v;
    sv = (v - min) / v;
    h = 6 * h;
    sextant = Math.floor(h);
    fract = h - sextant;
    vsf = v * sv * fract;
    if (sextant === 0 || sextant === 6) {
      r = v;
      g = min + vsf;
      b = min;
    } else if (sextant === 1) {
      r = v - vsf;
      g = v;
      b = min;
    } else if (sextant === 2) {
      r = min;
      g = v;
      b = min + vsf;
    } else if (sextant === 3) {
      r = min;
      g = v - vsf;
      b = v;
    } else if (sextant === 4) {
      r = min + vsf;
      g = min;
      b = v;
    } else {
      r = v;
      g = min;
      b = v - vsf;
    }
    return parseInt('0x' + componentToHex(r) + componentToHex(g) + componentToHex(b), 16);
  }
}

function componentToHex(c) {
  c = Math.round(c * 255).toString(16);
  return c.length === 1 ? "0" + c : c;
}

function hslToHex2(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}