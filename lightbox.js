/* Sitting Pretty Collective photo viewer — click a photo to open, ‹ › to toggle, click away to close.
   "View on wall" shows the photo as a framed print in a scaled room (sofa = 84in). */
(function () {
  var css = [
    '#bc-lb { position:fixed; inset:0; background:rgba(27,42,68,.94); z-index:1000;',
    '  display:none; align-items:center; justify-content:center; flex-direction:column; }',
    '#bc-lb.open { display:flex; }',
    '#bc-lb .lb-frame { background:#f6f0e3; padding:10px; border:1px solid #a8853c;',
    '  max-width:88vw; max-height:70vh; box-shadow:0 12px 48px rgba(0,0,0,.5); }',
    '#bc-lb .lb-frame img { display:block; max-width:calc(88vw - 22px); max-height:calc(70vh - 22px); }',
    '#bc-lb .lb-caption { color:#ece2cc; font-family:Georgia,serif; font-style:italic;',
    '  margin-top:14px; font-size:1.05rem; text-align:center; max-width:80vw; }',
    '#bc-lb .lb-count { color:#a8853c; font-size:.8rem; letter-spacing:.2em; margin-top:6px;',
    '  font-family:Georgia,serif; }',
    '#bc-lb button { background:none; border:1px solid #a8853c; color:#f6f0e3;',
    '  font-size:1.6rem; line-height:1; padding:10px 16px; cursor:pointer; font-family:Georgia,serif; }',
    '#bc-lb button:hover { background:#a8853c; color:#1b2a44; }',
    '#bc-lb .lb-prev { position:absolute; left:18px; top:50%; transform:translateY(-50%); }',
    '#bc-lb .lb-next { position:absolute; right:18px; top:50%; transform:translateY(-50%); }',
    '#bc-lb .lb-close { position:absolute; top:16px; right:18px; font-size:1.1rem; }',
    '#bc-lb .lb-wall-btn { position:absolute; top:16px; left:18px; font-size:.85rem; letter-spacing:.12em; }',
    '.bc-lb-target { cursor:zoom-in; }',
    /* ---- room scene: photo backdrops, calibrated per room in ROOMS below ---- */
    '#bc-lb .lb-room { display:none; position:relative; width:min(88vw,64vh,620px);',
    '  overflow:hidden; border:1px solid #a8853c; box-shadow:0 12px 48px rgba(0,0,0,.5);',
    '  background:center/cover no-repeat; }',
    '#bc-lb.wall .lb-room { display:block; }',
    '#bc-lb.wall .lb-frame, #bc-lb.wall .lb-caption { display:none; }',
    '#bc-lb .room-print { position:absolute; left:50%; transform:translateX(-50%);',
    '  background:#f8f4e8; border:4px solid #3a2c1c; outline:1px solid #a8853c; padding:5px;',
    '  box-shadow:0 10px 22px rgba(60,40,15,.45), 0 3px 6px rgba(60,40,15,.3); }',
    '#bc-lb .room-print img { display:block; width:100%; height:100%; object-fit:cover; }',
    '#bc-lb .room-tag { position:absolute; left:14px; bottom:10px; color:#fff; font-family:Georgia,serif;',
    '  font-style:italic; font-size:.8rem; opacity:.9; text-shadow:0 1px 3px rgba(0,0,0,.6); }',
    '#bc-lb .lb-sizes { display:none; margin-top:14px; gap:10px; }',
    '#bc-lb.wall .lb-sizes { display:flex; }',
    '#bc-lb .lb-sizes button { font-size:.85rem; letter-spacing:.1em; padding:8px 14px; }',
    '#bc-lb .lb-sizes button.on { background:#a8853c; color:#1b2a44; }',
    '#bc-lb .lb-sizes button:disabled { opacity:.3; cursor:not-allowed; }',
    '#bc-lb .lb-sizes button:disabled:hover { background:none; color:#f6f0e3; }',
    '#bc-lb .lb-pin { position:absolute; top:16px; left:200px; font-size:.85rem; letter-spacing:.12em; }',
    '#bc-lb a.lb-buy { display:inline-block; margin-top:14px; background:#a8853c; color:#1b2a44;',
    '  border:1px solid #f6f0e3; padding:11px 28px; font-size:.85rem; letter-spacing:.16em;',
    '  font-family:Georgia,serif; text-decoration:none; font-weight:600; }',
    '#bc-lb a.lb-buy:hover { background:#f6f0e3; }'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Collect photos: framed background divs and real <img> tags
  var items = [];
  document.querySelectorAll('.photo, .pimg, .pin-thumb, img').forEach(function (el) {
    var url = null, caption = '';
    if (el.tagName === 'IMG') {
      if (el.closest('#bc-lb')) return;
      url = el.getAttribute('src');
      caption = el.getAttribute('alt') || '';
    } else {
      var bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage;
      var m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) url = m[1];
    }
    if (!url) return; // skip gradient placeholders
    var fig = el.closest('figure');
    if (fig) {
      var fc = fig.querySelector('figcaption');
      if (fc) caption = fc.textContent.trim();
    }
    if (!caption) {
      var card = el.closest('.entry, .card, .pin, .story');
      if (card) {
        var h = card.querySelector('h2, h3, h4, .ptitle');
        if (h) caption = h.textContent.trim();
      }
    }
    items.push({ url: url, caption: caption });
    el.classList.add('bc-lb-target');
    el.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      open(items.findIndex(function (i) { return i.url === url; }));
    });
  });
  if (!items.length) return;

  // Pinterest: turn every “Pin it” button into a real share link
  function pinShareUrl(imgUrl, description) {
    var absMedia = new URL(imgUrl, location.href).href;
    return 'https://www.pinterest.com/pin/create/button/' +
      '?url=' + encodeURIComponent(location.href) +
      '&media=' + encodeURIComponent(absMedia) +
      '&description=' + encodeURIComponent((description ? description + ' — ' : '') + 'Sitting Pretty Collective');
  }
  document.querySelectorAll('a.pinit').forEach(function (a) {
    var holder = a.closest('.frame');
    var ph = holder ? holder.querySelector('.photo') : null;
    if (!ph) return;
    var bg = ph.style.backgroundImage || getComputedStyle(ph).backgroundImage;
    var m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (!m) return;
    var cap = '';
    var fig = a.closest('figure');
    if (fig) { var fc = fig.querySelector('figcaption'); if (fc) cap = fc.textContent.trim(); }
    a.href = pinShareUrl(m[1], cap);
    a.target = '_blank'; a.rel = 'noopener';
  });

  var lb = document.createElement('div');
  lb.id = 'bc-lb';
  lb.innerHTML =
    '<div class="lb-frame"><img alt=""></div>' +
    '<div class="lb-room">' +
    '  <div class="room-print"><img alt=""></div>' +
    '  <div class="room-tag">sofa shown: 7 ft — prints to scale</div>' +
    '</div>' +
    '<div class="lb-caption"></div><div class="lb-count"></div>' +
    '<div class="lb-sizes">' +
    '  <button data-in="12">12&Prime; &middot; $45</button><button data-in="18">18&Prime; &middot; $70</button>' +
    '  <button data-in="24" class="on">24&Prime; &middot; $95</button><button data-in="36">36&Prime; &middot; $145</button>' +
    '</div>' +
    '<div class="lb-rooms lb-sizes">' +
    '  <button data-room="0" class="on">LIVING ROOM</button><button data-room="1">BEDROOM</button>' +
    '  <button data-room="2">BATH</button><button data-room="3">DESK</button>' +
    '</div>' +
    '<a class="lb-buy" href="' + SHOP_URL + '" target="_blank" rel="noopener">PURCHASE THIS PRINT ↗</a>' +
    '<button class="lb-prev" title="Previous">&lsaquo;</button>' +
    '<button class="lb-next" title="Next">&rsaquo;</button>' +
    '<button class="lb-close" title="Close">CLOSE &times;</button>' +
    '<button class="lb-wall-btn">VIEW ON WALL</button>' +
    '<button class="lb-pin" title="Save to Pinterest">&#128204; PIN</button>';
  document.body.appendChild(lb);

  var idx = 0, wallMode = false, sizeIn = 24, roomIdx = 0;
  var PRICES = { 12: 45, 18: 70, 24: 95, 36: 145 }; // mock pricing until the shop is real
  var SHOP_URL = 'https://www.etsy.com/shop/sittingprettycollective';
  // per-photo Etsy listings — add 'images/<file>.jpg': 'https://www.etsy.com/listing/…' as prints go up;
  // photos without an entry link to the shop front
  var LISTINGS = {};
  var IMGBASE = location.pathname.indexOf('/journal/') >= 0 ? '../images/' : 'images/';
  // Per-room calibration: sofaFraction = sofa width as share of image width,
  // sofaInches = the real sofa size, wallY = vertical center of the hanging zone.
  // sofaTopY = where the sofa back begins (share of image height); prints must hang above it
  // sizes = print long-edges offered in that scene; boost = per-scene presentation multiplier
  var ROOMS = [
    { file: 'room-linen.jpg',   name: 'LIVING ROOM', ar: '1448 / 1086', wallY: 0.32, sofaTopY: 0.58, sizes: [12, 18, 24, 36], boost: 1.0,  tag: 'sofa shown: 8 ft' },
    { file: 'room-bedroom.jpg', name: 'BEDROOM',     ar: '1024 / 767',  wallY: 0.15, sofaTopY: 0.29, sizes: [12, 18, 24],     boost: 1.0,  tag: 'queen headboard shown: 5 ft' },
    { file: 'room-bath.jpg',    name: 'BATH',        ar: '1024 / 726',  wallY: 0.28, sofaTopY: 0.50, sizes: [12, 18, 24],     boost: 1.0,  tag: 'tub shown: 5½ ft' },
    { file: 'room-desk.jpg',    name: 'DESK',        ar: '1024 / 683',  wallY: 0.24, sofaTopY: 0.46, sizes: [12, 18, 24],     boost: 0.85, tag: 'desk shown: 5½ ft' }
  ];
  // presentation sizing: print long edge as a share of room width (reads the way prints feel in person)
  var SIZE_FRAC = { 12: 0.22, 18: 0.29, 24: 0.36, 36: 0.48 };

  function applyRoom() {
    var R = ROOMS[roomIdx];
    var room = lb.querySelector('.lb-room');
    room.style.backgroundImage = 'url("' + IMGBASE + R.file + '")';
    room.style.aspectRatio = R.ar;
    lb.querySelector('.room-tag').textContent = R.tag;
    lb.querySelectorAll('.lb-rooms button').forEach(function (b, i) {
      b.classList.toggle('on', i === roomIdx);
    });
    // only offer sizes that physically fit this scene
    if (R.sizes.indexOf(sizeIn) < 0) sizeIn = R.sizes[R.sizes.length - 1];
    lb.querySelectorAll('.lb-sizes button[data-in]').forEach(function (b) {
      var v = parseInt(b.getAttribute('data-in'), 10);
      b.disabled = R.sizes.indexOf(v) < 0;
      b.classList.toggle('on', v === sizeIn);
    });
  }

  function fitPrint() {
    var img = lb.querySelector('.room-print img');
    var R = ROOMS[roomIdx];
    var probe = new Image();
    probe.onload = function () {
      var room = lb.querySelector('.lb-room');
      var ar = probe.naturalWidth / probe.naturalHeight;
      // if the LARGEST size offered would overflow this room's wall zone, scale the whole
      // size ladder down together — keeps every size visibly distinct instead of capping flat
      var zone = room.clientHeight * R.sofaTopY - 20;
      var maxLong = room.clientWidth * SIZE_FRAC[R.sizes[R.sizes.length - 1]] * (R.boost || 1);
      var maxH = ar >= 1 ? maxLong / ar : maxLong;
      var fit = maxH > zone ? zone / maxH : 1;
      var longEdgePx = room.clientWidth * SIZE_FRAC[sizeIn] * (R.boost || 1) * fit;
      var w, h, wIn, hIn;
      if (ar >= 1) { w = longEdgePx; h = w / ar; wIn = sizeIn; hIn = Math.round(sizeIn / ar); }
      else { h = longEdgePx; w = h * ar; hIn = sizeIn; wIn = Math.round(sizeIn * ar); }
      var print = lb.querySelector('.room-print');
      print.style.width = Math.round(w) + 'px';
      print.style.height = Math.round(h) + 'px';
      var top = room.clientHeight * R.wallY - h / 2;
      // never let the print reach the sofa: keep its bottom edge above the sofa back
      var maxTop = room.clientHeight * R.sofaTopY - h - 12;
      top = Math.min(top, maxTop);
      print.style.top = Math.max(8, Math.round(top)) + 'px';
      lb.querySelector('.lb-count').textContent =
        wIn + '″ × ' + hIn + '″ PRINT · $' + PRICES[sizeIn] + ' · ' + (idx + 1) + ' OF ' + items.length;
    };
    probe.src = img.src;
  }

  function show() {
    var it = items[idx];
    lb.querySelector('.lb-frame img').src = it.url;
    lb.querySelector('.room-print img').src = it.url;
    lb.querySelector('.lb-caption').textContent = it.caption;
    lb.querySelector('.lb-buy').href = LISTINGS[it.url] || SHOP_URL;
    if (wallMode) { fitPrint(); }
    else { lb.querySelector('.lb-count').textContent = (idx + 1) + ' OF ' + items.length; }
  }
  function open(i) { idx = i < 0 ? 0 : i; setWall(false); show(); lb.classList.add('open'); }
  function close() { lb.classList.remove('open'); }
  function step(d) { idx = (idx + d + items.length) % items.length; show(); }
  function setWall(on) {
    wallMode = on;
    lb.classList.toggle('wall', on);
    lb.querySelector('.lb-wall-btn').textContent = on ? 'BACK TO PHOTO' : 'VIEW ON WALL';
    if (on) applyRoom();
    show();
  }

  lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.querySelector('.lb-close').addEventListener('click', function (e) { e.stopPropagation(); close(); });
  lb.querySelector('.lb-wall-btn').addEventListener('click', function (e) { e.stopPropagation(); setWall(!wallMode); });
  lb.querySelector('.lb-pin').addEventListener('click', function (e) {
    e.stopPropagation();
    var it = items[idx];
    window.open(pinShareUrl(it.url, it.caption), '_blank', 'noopener,width=750,height=650');
  });
  lb.querySelectorAll('.lb-sizes button[data-in]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      sizeIn = parseInt(b.getAttribute('data-in'), 10);
      lb.querySelectorAll('.lb-sizes button[data-in]').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      fitPrint();
    });
  });
  lb.querySelectorAll('.lb-rooms button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      roomIdx = parseInt(b.getAttribute('data-room'), 10);
      applyRoom();
      fitPrint();
    });
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
})();
