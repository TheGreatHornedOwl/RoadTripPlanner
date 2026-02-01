function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal.active')
    .forEach(m => m.classList.remove('active'));
}

/* Escape key support */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

/* Click-outside support */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal
