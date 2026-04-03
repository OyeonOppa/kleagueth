// ===================================================
// Clubs Page Logic
// ===================================================

let allClubs = { K1: [], K2: [] };

async function loadClubs() {
  await Promise.all([loadLeagueClubs('K1'), loadLeagueClubs('K2')]);
}

async function loadLeagueClubs(league) {
  const grid = document.getElementById(`clubsGrid${league}`);
  try {
    const data = await API.getClubs(league);
    allClubs[league] = data.clubs || [];
    renderClubGrid(league, allClubs[league]);
  } catch (e) {
    if (grid) grid.innerHTML = `<div class="error-state"><div class="error-icon">⚽</div><p>ไม่สามารถโหลดข้อมูลได้</p></div>`;
  }
}

function renderClubGrid(league, clubs) {
  const grid = document.getElementById(`clubsGrid${league}`);
  if (!grid) return;

  if (!clubs.length) {
    grid.innerHTML = `<div class="error-state"><div class="error-icon">🏟️</div><p>ยังไม่มีข้อมูลสโมสร</p></div>`;
    return;
  }

  grid.innerHTML = clubs.map(club => `
    <a href="club-detail.html?id=${club.club_id}" style="text-decoration:none;color:inherit;">
      <div class="club-card">
        ${club.logo_url
          ? `<img src="${club.logo_url}" alt="${club.name_th}" class="club-card-logo" onerror="this.style.display='none'">`
          : `<div class="club-card-logo-placeholder">${(club.name_th || club.name_en || '?').substring(0, 2)}</div>`
        }
        <h3>${club.name_th || '—'}</h3>
        <p>${club.name_en || ''}</p>
        ${club.city ? `<p style="margin-top:4px;">${club.city}</p>` : ''}
        <span class="league-badge ${league}">${league}</span>
      </div>
    </a>
  `).join('');
}

function filterClubs(league, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const k1section = document.getElementById('clubsSectionK1');
  const k2section = document.getElementById('clubsSectionK2');

  if (league === 'all') {
    k1section.style.display = '';
    k2section.style.display = '';
  } else if (league === 'K1') {
    k1section.style.display = '';
    k2section.style.display = 'none';
  } else {
    k1section.style.display = 'none';
    k2section.style.display = '';
  }
}

loadClubs();
