
// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.querySelector('.add-btn');
  const subtractButton = document.querySelector('.subtract-btn');
  const amountInput = document.querySelector('#amount');

  if (addButton) {
    addButton.addEventListener('click', () => {
      const amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount <= 0) {
        alert('有効な金額を入力してください。');
        return;
      }
      updateBalance('deposit', amount);
    });
  }

  if (subtractButton) {
    subtractButton.addEventListener('click', () => {
      const amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount <= 0) {
        alert('有効な金額を入力してください。');
        return;
      }
      updateBalance('withdraw', amount);
    });
  }
});