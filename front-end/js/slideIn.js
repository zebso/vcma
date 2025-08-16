'use strict';

const closeNav = () => {
  const sideNav = document.querySelector('nav.side-nav');
  const closeNavDiv = document.getElementById('close-nav');
  sideNav.classList.remove('show');
  closeNavDiv.style.display = 'none';
};

document.querySelector('header svg').addEventListener('click', () => {
  const sideNav = document.querySelector('nav.side-nav');
  const closeNav = document.getElementById('close-nav');
  sideNav.classList.add('show');
  closeNav.style.display = 'block';
});

document.querySelector('nav.side-nav .flex-content svg').addEventListener('click', closeNav);
document.getElementById('close-nav').addEventListener('click', closeNav);

