// ===================================================
// Club Detail Page Logic
// ===================================================

let allPlayers = [];

const params = new URLSearchParams(window.location.search);
const clubId = params.get('id');

if (!clubId) {
  location.href = 'clubs.html';
}

async function loadClubDetail() {
  await Promise.all([loadClubInfo(), loadPlayers()]);
}

async function loadClubInfo() {
  try {
    const data = await API.getClub(clubId);
    const club = data.club;
    if (!club) { location.href = 'clubs.html'; return; }

    document.title = `${club.name_th || club.name_en} — K-League Thai`;

    // Hero
    document.getElementById('clubNameTh').textContent = club.name_th || '—';
    document.getElementById('clubNameEn').textContent = club.name_en || '';

    const logoEl = document.getElementById('clubHeroLogo');
    if (club.logo_url) {
      logoEl.innerHTML = `<img src="${club.logo_url}" alt="${club.name_th}" class="club-hero-logo" onerror="this.style.display='none'">`;
    }

    const tags = [];
    if (club.league) tags.push(`<span class="meta-tag">${club.league}</span>`);
    if (club.city) tags.push(`<span class="meta-tag">📍 ${club.city}</span>`);
    if (club.founded) tags.push(`<span class="meta-tag">ก่อตั้ง ${club.founded}</span>`);
    document.getElementById('clubMetaTags').innerHTML = tags.join('');

    // Info grid
    const infoItems = [
      { label: 'สนามเหย้า', value: club.stadium_th || club.stadium_en || '—' },
      { label: 'ความจุ', value: club.capacity ? Number(club.capacity).toLocaleString('th-TH') + ' คน' : '—' },
      { label: 'เมือง', value: club.city || '—' },
      { label: 'ลีก', value: club.league || '—' },
      { label: 'ก่อตั้ง', value: club.founded ? `ปี ${club.founded}` : '—' },
      { label: 'เว็บไซต์', value: club.website ? `<a href="${club.website}" target="_blank" rel="noopener">${club.website}</a>` : '—' },
    ].filter(i => i.value !== '—' || i.label === 'สนามเหย้า');

    document.getElementById('clubInfoGrid').innerHTML = infoItems.map(item => `
      <div class="info-item">
        <label>${item.label}</label>
        <span>${item.value}</span>
      </div>
    `).join('');

  } catch (e) {
    document.getElementById('clubNameTh').textContent = 'ไม่พบข้อมูลสโมสร';
  }
}

async function loadPlayers() {
  const body = document.getElementById('playerTableBody');
  try {
    const data = await API.getPlayers(clubId);
    allPlayers = data.players || [];

    document.getElementById('squadCount').textContent = `${allPlayers.length} คน`;

    renderPlayers(allPlayers);
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6"><div class="error-state"><div class="error-icon">👤</div><p>ไม่สามารถโหลดรายชื่อผู้เล่นได้</p></div></td></tr>`;
  }
}

function renderPlayers(players) {
  const body = document.getElementById('playerTableBody');

  if (!players.length) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีรายชื่อผู้เล่น</td></tr>`;
    return;
  }

  // Sort: GK → DF → MF → FW, then by number
  const posOrder = { GK: 1, DF: 2, MF: 3, FW: 4 };
  const sorted = [...players].sort((a, b) => {
    const posA = posOrder[a.position] || 5;
    const posB = posOrder[b.position] || 5;
    if (posA !== posB) return posA - posB;
    return (parseInt(a.number) || 99) - (parseInt(b.number) || 99);
  });

  body.innerHTML = sorted.map(p => `
    <tr>
      <td class="player-number">${p.number || '—'}</td>
      <td>
        <div class="player-name-th">${p.name_th || '—'}</div>
      </td>
      <td>
        <div class="player-name-ko">${p.name_ko || p.name_en || '—'}</div>
      </td>
      <td>
        <span class="position-badge ${getPositionClass(p.position)}">${p.position || '—'}</span>
      </td>
      <td>
        <span class="flag-icon">${p.flag || ''}</span>
        ${p.nationality || '—'}
      </td>
      <td style="color:var(--text-muted);font-size:13px;">${p.dob ? formatDate(p.dob) : '—'}</td>
    </tr>
  `).join('');
}

function filterPlayers(pos, btn) {
  document.querySelectorAll('.pos-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filtered = pos === 'all' ? allPlayers : allPlayers.filter(p => p.position === pos);
  renderPlayers(filtered);

  const count = document.getElementById('squadCount');
  count.textContent = pos === 'all'
    ? `${allPlayers.length} คน`
    : `${filtered.length} คน (${getPositionTh(pos)})`;
}

loadClubDetail();
