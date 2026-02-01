function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(el => {
    el.classList.remove('active');
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});