// ===================================================
// Utility Functions
// ===================================================

// แปลง date string หลาย format → Date object ที่ไม่มีปัญหา timezone
// รองรับ: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss', Google Sheets date string ฯลฯ
function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;

  // ดึงเฉพาะส่วน YYYY-MM-DD ก่อน (ถ้ามี)
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    // สร้างด้วย local date เพื่อหลีกเลี่ยง UTC timezone shift
    return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  }

  // fallback: ให้ browser parse เอง (อาจผิด timezone แต่ดีกว่า NaN)
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function formatDate(dateStr) {
  const d = parseDateSafe(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = parseDateSafe(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // ดึงเวลาจาก ISO string (HH:mm ส่วน T...)
  const timeMatch = s.match(/T(\d{2}:\d{2})/);
  if (timeMatch) return timeMatch[1];
  const d = new Date(s);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function getPositionClass(pos) {
  const map = { 'GK': 'pos-GK', 'DF': 'pos-DF', 'MF': 'pos-MF', 'FW': 'pos-FW' };
  return map[pos] || '';
}

function getPositionTh(pos) {
  const map = { 'GK': 'ผู้รักษาประตู', 'DF': 'กองหลัง', 'MF': 'กองกลาง', 'FW': 'กองหน้า' };
  return map[pos] || pos;
}

function getRankClass(rank, league) {
  if (league === 'K1') {
    if (rank === 1) return 'champ';
    if (rank <= 3) return 'acl';
    if (rank <= 6) return 'acl2';
    if (rank === 10) return 'playoff';
    if (rank >= 11) return 'relegation';
  }
  if (league === 'K2') {
    if (rank === 1) return 'champ';
    if (rank === 2) return 'acl';
    if (rank === 3) return 'playoff';
    if (rank >= 10) return 'relegation';
  }
  return '';
}

function clubLogoHtml(club, size = 28) {
  if (club.logo_url) {
    return `<img src="${club.logo_url}" alt="${club.name_th}" class="club-logo" style="width:${size}px;height:${size}px;" onerror="this.style.display='none'">`;
  }
  const initials = (club.name_th || club.name_en || '?').substring(0, 2);
  return `<div class="club-logo-placeholder" style="width:${size}px;height:${size}px;">${initials}</div>`;
}

function matchStatusHtml(status, date) {
  if (status === 'live') return '<span class="match-status live">LIVE</span>';
  if (status === 'completed') return `<span class="match-status completed">${formatDateShort(date)}</span>`;
  return `<span class="match-status scheduled">${formatDate(date)}</span>`;
}

function renderMatchCard(m) {
  const homeWin = m.status === 'completed' && m.home_score > m.away_score;
  const awayWin = m.status === 'completed' && m.away_score > m.home_score;
  const homeStyle = homeWin ? 'font-weight:800;' : awayWin ? 'opacity:0.6;' : '';
  const awayStyle = awayWin ? 'font-weight:800;' : homeWin ? 'opacity:0.6;' : '';

  const scoreHtml = m.status === 'completed' || m.status === 'live'
    ? `<div class="match-score">${m.home_score} - ${m.away_score}</div>`
    : `<div class="match-score-vs">vs</div>`;

  const leagueBadge = `<span style="font-size:10px;color:var(--text-muted);">${m.league || ''}</span>`;

  return `
    <div class="match-card" onclick="location.href='results.html'">
      <div class="match-team home" style="${homeStyle}">
        ${clubLogoHtml(m.home_club || { name_th: m.home_club_name })}
        <span>${m.home_club_name || '—'}</span>
      </div>
      <div class="match-score-box">
        ${scoreHtml}
        <div class="match-meta">
          ${matchStatusHtml(m.status, m.date)}
          ${leagueBadge}
        </div>
      </div>
      <div class="match-team away" style="${awayStyle}">
        <span>${m.away_club_name || '—'}</span>
        ${clubLogoHtml(m.away_club || { name_th: m.away_club_name })}
      </div>
    </div>`;
}

function renderStandingsRow(row, rank, league) {
  const cls = getRankClass(rank, league);
  const formHtml = (row.form || '').split('').map(f =>
    `<span class="form-badge ${f}">${f}</span>`
  ).join('');

  return `
    <tr>
      <td class="rank-cell">
        <span class="rank-indicator ${cls}">${rank}</span>
      </td>
      <td>
        <div class="club-name-cell">
          ${clubLogoHtml(row)}
          <a href="club-detail.html?id=${row.club_id}">${row.name_th || row.name_en || '—'}</a>
        </div>
      </td>
      <td class="center">${row.played ?? '—'}</td>
      <td class="center">${row.won ?? '—'}</td>
      <td class="center">${row.drawn ?? '—'}</td>
      <td class="center">${row.lost ?? '—'}</td>
      <td class="center">${row.gf ?? '—'}</td>
      <td class="center">${row.ga ?? '—'}</td>
      <td class="center">${row.gd >= 0 ? '+' + row.gd : row.gd}</td>
      <td class="center points-cell">${row.points ?? '—'}</td>
      <td><div class="form-badges">${formHtml}</div></td>
    </tr>`;
}

function renderMiniStandingsRow(row, rank) {
  return `
    <tr>
      <td class="rank-cell"><span style="font-weight:700;">${rank}</span></td>
      <td>
        <div class="club-name-cell">
          ${clubLogoHtml(row, 22)}
          <a href="club-detail.html?id=${row.club_id}" style="font-size:13px;">${row.name_th || row.name_en || '—'}</a>
        </div>
      </td>
      <td class="center" style="font-size:13px;">${row.played ?? '—'}</td>
      <td class="center points-cell" style="font-size:14px;">${row.points ?? '—'}</td>
    </tr>`;
}

// Navbar toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
});
