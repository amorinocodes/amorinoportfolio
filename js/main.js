// =============================================
// THEME TOGGLE
// The <head> inline script already applied the
// correct theme before paint; this just wires
// the button state and handles clicks.
// =============================================
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

const ICONS = {
  // Moon shown in dark mode — clicking switches to light
  dark:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  // Sun shown in light mode — clicking switches to dark
  light: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
};

function applyTheme(isDark) {
  if (isDark) {
    html.removeAttribute('data-theme');
    themeToggle.innerHTML = ICONS.dark;
    themeToggle.setAttribute('aria-label', 'Switch to light mode');
  } else {
    html.setAttribute('data-theme', 'light');
    themeToggle.innerHTML = ICONS.light;
    themeToggle.setAttribute('aria-label', 'Switch to dark mode');
  }
}

// Sync button icon with whatever the inline script already applied
applyTheme(!html.hasAttribute('data-theme'));

themeToggle.addEventListener('click', () => {
  const goingDark = html.hasAttribute('data-theme'); // currently light → going dark
  applyTheme(goingDark);
  localStorage.setItem('theme', goingDark ? 'dark' : 'light');
});


// =============================================
// NAV: add .scrolled class once user scrolls
// This triggers the border-bottom in CSS
// =============================================
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true }); // passive: true = browser doesn't wait for JS before scrolling. Perf win.


// =============================================
// SCROLL REVEAL
// IntersectionObserver watches elements with
// class="reveal" and adds "visible" when they
// enter the viewport. CSS handles the animation.
// Way more performant than scroll event listeners.
// =============================================
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // stop watching once revealed
    }
  });
}, {
  threshold: 0.12, // trigger when 12% of element is visible
  rootMargin: '0px 0px -40px 0px' // trigger slightly before element fully enters
});

revealEls.forEach(el => observer.observe(el));


// =============================================
// SMOOTH NAV ACTIVE STATE
// Highlights nav link matching current section
// =============================================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.style.color = 'var(--accent)';
        }
      });
    }
  });
}, {
  threshold: 0.4
});

sections.forEach(s => sectionObserver.observe(s));


// =============================================
// HERO GRID — cursor force field
// Canvas redraws the grid every frame. Each point
// sampled along a grid line is pushed radially
// away from the cursor within RADIUS px.
// Quadratic falloff keeps the warp subtle at
// the edges and strongest at the centre.
// =============================================
const heroBg  = document.querySelector('.hero__bg');
const heroEl  = document.getElementById('hero');

const gridCanvas = document.createElement('canvas');
gridCanvas.setAttribute('aria-hidden', 'true');
gridCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';
if (heroBg) heroBg.appendChild(gridCanvas);
const gCtx = gridCanvas.getContext('2d');

function resizeGrid() {
  if (!heroEl) return;
  gridCanvas.width  = heroEl.offsetWidth;
  gridCanvas.height = heroEl.offsetHeight;
}
resizeGrid();
window.addEventListener('resize', resizeGrid, { passive: true });

const CELL     = 60;  // matches the original grid spacing
const RADIUS   = 160; // px — how far the force field reaches
const STRENGTH = 28;  // max displacement in px at cursor centre
const STEP     = 3;   // px between sampled points on each line

// Lerped cursor position relative to the hero element
let mx = -999, my = -999, tmx = -999, tmy = -999;

heroEl && heroEl.addEventListener('mousemove', (e) => {
  const r = heroEl.getBoundingClientRect();
  tmx = e.clientX - r.left;
  tmy = e.clientY - r.top;
}, { passive: true });

heroEl && heroEl.addEventListener('mouseleave', () => {
  tmx = -999; tmy = -999; // push influence off-canvas so grid springs back
});

// Returns the displaced position of point (px,py) given cursor at (cx,cy)
function warp(px, py, cx, cy) {
  const dx = px - cx, dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist > RADIUS) return [px, py];
  const t     = 1 - dist / RADIUS;
  const force = STRENGTH * t * t; // quadratic: gentle at edge, strong at centre
  return [px + (dx / dist) * force, py + (dy / dist) * force];
}

function drawGrid() {
  const W = gridCanvas.width, H = gridCanvas.height;
  gCtx.clearRect(0, 0, W, H);

  // Read the current theme's grid colour directly from CSS tokens
  const colour = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-grid').trim();
  gCtx.strokeStyle = colour;
  gCtx.lineWidth = 1;

  // Horizontal lines
  for (let y = CELL; y < H; y += CELL) {
    gCtx.beginPath();
    for (let x = 0; x <= W; x += STEP) {
      const [wx, wy] = warp(x, y, mx, my);
      x === 0 ? gCtx.moveTo(wx, wy) : gCtx.lineTo(wx, wy);
    }
    gCtx.stroke();
  }

  // Vertical lines
  for (let x = CELL; x < W; x += CELL) {
    gCtx.beginPath();
    for (let y = 0; y <= H; y += STEP) {
      const [wx, wy] = warp(x, y, mx, my);
      y === 0 ? gCtx.moveTo(wx, wy) : gCtx.lineTo(wx, wy);
    }
    gCtx.stroke();
  }
}

function tickGrid() {
  mx += (tmx - mx) * 0.1;
  my += (tmy - my) * 0.1;
  drawGrid();
  requestAnimationFrame(tickGrid);
}

tickGrid();


// =============================================
// LANYARD FLIP
// Click (or Enter/Space) toggles is-flipped on
// the inner, triggering the CSS 3D rotation.
// =============================================
const lanyardFlip = document.getElementById('lanyard-flip');
if (lanyardFlip) {
  const inner = lanyardFlip.querySelector('.lanyard__flip-inner');

  lanyardFlip.addEventListener('click', () => {
    inner.classList.toggle('is-flipped');
  });

  lanyardFlip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inner.classList.toggle('is-flipped');
    }
  });
}