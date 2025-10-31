// Obsługa wysuwanego menu
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function openMenu() {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    overlay.hidden = false;
    document.documentElement.classList.add('no-scroll');
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    overlay.hidden = true;
    document.documentElement.classList.remove('no-scroll');
  }

  menuToggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeMenu() : openMenu();
  });

  menuClose.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeMenu();
  });

  // Ustaw aktywną stronę w nagłówku
  const activeLink = document.querySelector('.nav-list .active');
  const output = document.getElementById('active-page');
  if (activeLink && output) {
    output.textContent = activeLink.textContent;
  }
});
