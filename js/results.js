// ===================================================
// Results Page Logic
// ===================================================

let currentLeague = 'K1';
let currentMatchday = null;
let allMatchdays = [];
let allMatches = [];

async function loadResults(league, matchday) {
  const list = document.getElementById('matchList');
  list.innerHTML = `
    <div class="skeleton skeleton-row"></div>
    <div class="skeleton skeleton-row"></div>
    <div class="skeleton skeleton-row"></div>
    <div class="skeleton skeleton-row"></div>`;

  try {
    const data = await API.getMatches(league, matchday);
    allMatches = data.matches || [];

    // Build matchday chips from data if first load
    if (!matchday && allMatches.length) {
      buildMatchdayChips(allMatches);
    }

    renderMatches(allMatches);
  } catch (e) {
    list.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚽</div>
        <p>ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการตั้งค่า API</p>
      </div>`;
  }
}

function buildMatchdayChips(matches) {
  const matchdays = [...new Set(matches.map(m => m.matchday).filter(Boolean))].sort((a, b) => a - b);
  allMatchdays = matchdays;

  const container = document.getElementById('matchdayChips');
  if (!matchdays.length) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">ไม่มีข้อมูลนัดที่</span>';
    return;
  }

  const allChip = `<button class="matchday-chip active" data-md="all" onclick="selectMatchday(null, this)">ทั้งหมด</button>`;
  const chips = matchdays.map(md =>
    `<button class="matchday-chip" data-md="${md}" onclick="selectMatchday(${md}, this)">นัดที่ ${md}</button>`
  ).join('');
  container.innerHTML = allChip + chips;
}

function selectMatchday(matchday, btn) {
  currentMatchday = matchday;
  document.querySelectorAll('.matchday-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  const title = document.getElementById('resultsTitle');
  title.textContent = matchday ? `นัดที่ ${matchday}` : 'ผลการแข่งขันทั้งหมด';

  const filtered = matchday ? allMatches.filter(m => m.matchday == matchday) : allMatches;
  renderMatches(filtered);
}

function renderMatches(matches) {
  const list = document.getElementById('matchList');

  if (!matches.length) {
    list.innerHTML = `
      <div class="error-state">
        <div class="error-icon">📋</div>
        <p>ไม่มีข้อมูลการแข่งขัน</p>
      </div>`;
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
      html += `<div class="match-day-header">${formatDate(date)} — ${ms.length} นัด</div>`;
      ms.forEach(m => { html += renderMatchCard(m); });
    });

  list.innerHTML = html;
}

function switchLeague(league, btn) {
  currentLeague = league;
  currentMatchday = null;
  document.querySelectorAll('.league-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Reset matchday chips
  document.getElementById('matchdayChips').innerHTML = '<span style="color:var(--text-muted);font-size:13px;">กำลังโหลด...</span>';
  document.getElementById('resultsTitle').textContent = 'ผลการแข่งขันทั้งหมด';

  loadResults(league);
}

loadResults('K1');
