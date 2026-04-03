// ===================================================
// API Helper — ดึงข้อมูลจาก Google Apps Script
// ===================================================

async function fetchData(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('season', CONFIG.SEASON);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const API = {
  getStandings: (league) => fetchData('standings', { league }),
  getMatches: (league, matchday) => fetchData('matches', { league, ...(matchday ? { matchday } : {}) }),
  getRecentMatches: (limit = 10) => fetchData('recentMatches', { limit }),
  getClubs: (league) => fetchData('clubs', { ...(league ? { league } : {}) }),
  getClub: (clubId) => fetchData('club', { clubId }),
  getPlayers: (clubId) => fetchData('players', { clubId }),
};
