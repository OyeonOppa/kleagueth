// ===================================================
// Standings Page Logic
// ===================================================

let currentLeague = 'K1';

async function loadStandings(league) {
  const bodyId = `standings${league}Body`;
  const body = document.getElementById(bodyId);
  if (!body) return;

  try {
    const data = await API.getStandings(league);
    const rows = data.standings || [];

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีข้อมูลตารางคะแนน</td></tr>`;
      return;
    }

    body.innerHTML = rows.map((r, i) => renderStandingsRow(r, i + 1, league)).join('');

    const updatedEl = document.getElementById(`${league.toLowerCase()}UpdatedAt`);
    if (updatedEl && data.updated_at) {
      updatedEl.textContent = `อัปเดต: ${formatDate(data.updated_at)}`;
    }
  } catch (e) {
    body.innerHTML = `<tr><td colspan="11"><div class="error-state"><div class="error-icon">⚽</div><p>ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการตั้งค่า API</p></div></td></tr>`;
  }
}

function switchLeague(league, btn) {
  currentLeague = league;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('standingsK1').style.display = league === 'K1' ? '' : 'none';
  document.getElementById('standingsK2').style.display = league === 'K2' ? '' : 'none';

  loadStandings(league);
}

// Read URL param
const urlParams = new URLSearchParams(window.location.search);
const leagueParam = urlParams.get('league');
if (leagueParam === 'K2') {
  const k2btn = document.querySelector('[data-league="K2"]');
  if (k2btn) switchLeague('K2', k2btn);
  else loadStandings('K2');
} else {
  loadStandings('K1');
}
