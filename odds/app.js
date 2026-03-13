(() => {
  const copyBtn = document.getElementById('copy');
  const input = document.getElementById('ex');
  const toast = document.getElementById('toast');

  function showToast(message) {
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => { toast.hidden = true; }, 1500);
  }

  copyBtn?.addEventListener('click', async () => {
    const value = input?.value || '';
    try {
      await navigator.clipboard.writeText(value);
      showToast('예시 배당이 복사됐습니다. 텔레그램 DM에 붙여넣어 테스트하세요.');
    } catch {
      showToast('복사 실패: 브라우저 권한을 확인하세요.');
    }
  });
})();
