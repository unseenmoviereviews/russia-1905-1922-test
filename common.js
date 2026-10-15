/* Общие функции: банк вопросов, код-проверка, строка результата */
(function () {
  var KEY = 'ЧИПС-УрГУПС-1905';
  var SALT = 'rev-1905-1922-v1';

  function utf8Bytes(s) { return new TextEncoder().encode(s); }

  function loadBank() {
    var bin = atob(window.__QB);
    var key = utf8Bytes(KEY);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ key[i % key.length];
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  // Нормализация фамилии: регистр, ё/е, пробелы и дефисы
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–—.]+/g, '');
  }

  // 53-битный строковый хеш (cyrb53)
  function hash53(str, seed) {
    var h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  // 5-значный код из фамилии и баллов
  function makeCode(surname, score) {
    var h = hash53(norm(surname) + '|' + score + '|' + SALT, 7);
    var n = (h % 90000) + 10000;
    return String(n);
  }

  function gradeFor(score, total) {
    var p = score / total * 100;
    if (p >= 90) return 5;
    if (p >= 75) return 4;
    if (p >= 50) return 3;
    return 2;
  }

  // Строка результата: JSON → base64url
  function toB64(obj) {
    var bytes = utf8Bytes(JSON.stringify(obj));
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(str) {
    var s = String(str || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function packResult(r) {
    // r: {sn, nm, sc, ex, tm, an:{id:idx}}
    var an = '';
    for (var i = 0; i < 40; i++) an += (r.an[i] === undefined || r.an[i] === null) ? '-' : r.an[i];
    var body = { v: 1, sn: r.sn, nm: r.nm, sc: r.sc, ex: r.ex, tm: r.tm, an: an, cd: makeCode(r.sn, r.sc) };
    body.ck = hash53(JSON.stringify([body.sn, body.nm, body.sc, body.ex, body.tm, body.an, body.cd]) + SALT, 11).toString(36);
    return toB64(body);
  }

  function unpackResult(str) {
    var b = fromB64(str);
    var ck = hash53(JSON.stringify([b.sn, b.nm, b.sc, b.ex, b.tm, b.an, b.cd]) + SALT, 11).toString(36);
    b.integrity = (ck === b.ck);
    b.codeOk = (makeCode(b.sn, b.sc) === b.cd);
    return b;
  }

  async function sha256hex(s) {
    var buf = await crypto.subtle.digest('SHA-256', utf8Bytes(s));
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  window.REV = {
    loadBank: loadBank, norm: norm, makeCode: makeCode, gradeFor: gradeFor,
    packResult: packResult, unpackResult: unpackResult, sha256hex: sha256hex, TOTAL: 40
  };
})();
