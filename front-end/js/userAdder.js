// userAdder.js - 設定画面: ユーザー追加フォーム制御
(function(){
  const form = document.getElementById('userAddForm');
  if(!form) return; // 他ページでは何もしない
  const idInput = document.getElementById('newUserId');
  const balInput = document.getElementById('newUserBalance');
  const btn = document.getElementById('createUserBtn');
  const msg = document.getElementById('userAddMessage');

  const setMsg = (text, type='info') => {
    msg.textContent = text || '';
    msg.className = 'inline-message ' + type;
  };

  const validate = () => {
    const bal = Number(balInput.value);
    const okBal = !isNaN(bal) && bal >= 0;
    const idOk = !idInput.value || /^[A-Za-z0-9\-_.]{3,32}$/.test(idInput.value);
    btn.disabled = !(okBal && idOk);
  };

  idInput.addEventListener('input', validate);
  balInput.addEventListener('input', validate);
  validate();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    setMsg('作成中...','info');
    try {
      const payload = {};
      if(idInput.value.trim()) payload.id = idInput.value.trim();
      const b = Number(balInput.value);
      if(!isNaN(b) && b >= 0) payload.balance = b;
      const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'error'}));
        if(res.status === 409){
          setMsg('ID が既に存在します。別の ID を指定してください。','error');
        } else {
          setMsg('作成失敗: ' + (err.error || res.status),'error');
        }
        validate();
        return;
      }
      const data = await res.json();
      setMsg(`作成成功: ${data.user.id} (残高 ${data.user.balance})`,'success');
      idInput.value='';
      balInput.value='100';
      validate();
    } catch(err){
      console.error(err);
      setMsg('通信エラー','error');
      validate();
    }
  });
})();
