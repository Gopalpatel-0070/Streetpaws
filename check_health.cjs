(async () => {
  try {
    const res = await fetch('http://localhost:4000/health');
    const j = await res.json();
    console.log('health:', JSON.stringify(j));
  } catch (e) {
    console.error('health check failed', e);
  }
})();
