// Header scroll effect
const header = document.querySelector('.site-header');
const scrollThreshold = 4;

window.addEventListener('scroll', () => {
  if (window.scrollY > scrollThreshold) {
    header?.classList.add('scrolled');
  } else {
    header?.classList.remove('scrolled');
  }
});

// Mobile navigation toggle
const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('[data-nav-menu]');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    // ✅ dùng 'open' để khớp CSS (.nav-menu.open)
    navMenu.classList.toggle('open');
  });
}

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;
    e.preventDefault();
    targetElement.scrollIntoView({ behavior: 'smooth' });
  });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (navMenu?.classList.contains('open') &&
      !navMenu.contains(e.target) &&
      !navToggle.contains(e.target)) {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* Game placeholder hook */
function initTeamGame(container, options = {}) {
  // To be implemented by the team
  console.log('Game initialization placeholder');
}
