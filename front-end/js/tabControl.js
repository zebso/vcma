
const tabControllerButtons = document.querySelectorAll('.tab-controller button');
tabControllerButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove 'current-tab' class from all buttons
    tabControllerButtons.forEach(btn => btn.classList.remove('current-tab'));
    
    // Add 'current-tab' class to the clicked button
    button.classList.add('current-tab');
    
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Show the corresponding tab content
    const index = Array.from(tabControllerButtons).indexOf(button);
    tabContents[index].classList.remove('hidden');
  });
});