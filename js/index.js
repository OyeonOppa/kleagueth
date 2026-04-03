// ===================================================
// Homepage Logic
// ===================================================

let allRecentMatches = [];

async function loadHomePage() {
  await Promise.all([
    loadRecentMatches(),
    loadMiniStandings('K1'),
    loadMiniStandings('K2'),
  ]);
}

async function loadRecentMatches() {
  try {
    const data = await API.getRecentMatches(20);
    allRecentMatches = data.matches || [];
    renderRecentMatches(allRecentMatches);

    // Update hero stats
    const completed = allRecentMatches.filter(m => m.status === 'completed');
    const totalGoals = completed.reduce((s, m) => s + (parseInt(m.home_score) || 0) + (parseInt(m.away_score) || 0), 0);
    document.getElementById('statMatches').textContent = completed.length;
    document.getElementById('statGoals').textContent = totalGoals;
  } catch (e) {
    document.getElementById('recentMatchesList').innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚽</div>
        <p>ยังไม่ได้ตั้งค่า API หรือไม่มีข้อมูล</p>
      </div>`;
  }
}

function renderRecentMatches(matches) {
  const el = document.getElementById('recentMatchesList');
  if (!matches.length) {
    el.innerHTML = '<div class="error-state"><div class="error-icon">📋</div><p>ไม่มีข้อมูลการแข่งขัน</p></div>';
    return;
  }

  // Group by date
  const groups = {};
  matches.forEach(m => {
    const key = m.date ? m.date.split('T')[0] : 'ไม่ระบุวันที่';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  let html = '';
  Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([date, ms]) => {
      html += `<div class="match-day-header">${formatDate(date)}</div>`;
      ms.forEach(m => { html += renderMatchCard(m); });
    });

  el.innerHTML = html;
}

function filterHomeMatches(league, btn) {
  document.querySelectorAll('.league-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filtered = league === 'all'
    ? allRecentMatches
    : allRecentMatches.filter(m => m.league === league);
  renderRecentMatches(filtered);
}

async function loadMiniStandings(league) {
  const bodyId = `miniStandings${league}Body`;
  try {
    const data = await API.getStandings(league);
    const rows = (data.standings || []).slice(0, 6);
    const body = document.getElementById(bodyId);
    if (!body) return;

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted);">ยังไม่มีข้อมูล</td></tr>';
      return;
    }

    body.innerHTML = rows.map((r, i) => renderMiniStandingsRow(r, i + 1)).join('');

    // Update club stat in hero
    if (league === 'K1') {
      document.getElementById('statClubs').textContent = (data.standings || []).length * 2;
    }
  } catch (e) {
    const body = document.getElementById(bodyId);
    if (body) body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted);">ยังไม่มีข้อมูล</td></tr>';
  }
}

loadHomePage();
