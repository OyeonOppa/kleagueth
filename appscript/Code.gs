// ===================================================
// K-League Thai — Google Apps Script Backend
// ===================================================
// วิธีใช้:
//   1. เปิด Google Sheets แล้วไปที่ Extensions > Apps Script
//   2. วางโค้ดนี้ลงไป แล้วกด Save
//   3. Deploy > New deployment > Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. คัดลอก URL มาใส่ใน js/config.js
// ===================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ชื่อ Sheet ใน Google Sheets (ไม่มี Standings แล้ว — คำนวณจาก Matches อัตโนมัติ)
const SHEETS = {
  CLUBS:   'Clubs',
  PLAYERS: 'Players',
  MATCHES: 'Matches',
};

// ===================================================
// MAIN HANDLER
// ===================================================

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';
  const season = params.season || '2026';

  let result;
  try {
    switch (action) {
      case 'standings':
        result = getStandings(params.league, season);
        break;
      case 'matches':
        result = getMatches(params.league, params.matchday, season);
        break;
      case 'recentMatches':
        result = getRecentMatches(parseInt(params.limit) || 20, season);
        break;
      case 'clubs':
        result = getClubs(params.league);
        break;
      case 'club':
        result = getClub(params.clubId);
        break;
      case 'players':
        result = getPlayers(params.clubId);
        break;
      default:
        result = { ok: true, message: 'K-League Thai API พร้อมใช้งาน' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================================================
// HELPER: อ่านข้อมูลจาก Sheet
// ===================================================

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim().toLowerCase().replace(/ /g, '_'));
  return values.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; });
      return obj;
    });
}

// HELPER: สร้าง map { club_id -> clubData } จาก Clubs sheet
// ใช้ join ข้อมูลให้ Standings และ Matches โดยอัตโนมัติ
// → แก้ชื่อ/โลโก้ที่ Clubs ชีตเดียว ทุกหน้าอัปเดตพร้อมกันทันที
function getClubsMap() {
  const rows = getSheetData(SHEETS.CLUBS);
  const map = {};
  rows.forEach(r => {
    if (r.club_id) map[r.club_id] = r;
  });
  return map;
}

// ===================================================
// STANDINGS — คำนวณอัตโนมัติจากผลการแข่งขันใน Matches sheet
// แค่กรอกผลแมตช์ (home_score / away_score) แล้ว status = 'completed'
// ตารางคะแนนจะอัปเดตให้เองทันที โดยไม่ต้องแก้ Standings sheet
// ===================================================

function getStandings(league, season) {
  const matches  = getSheetData(SHEETS.MATCHES);
  const clubsMap = getClubsMap();

  // กรอง: เฉพาะนัดที่จบแล้ว (completed) ในฤดูกาลและลีกที่ต้องการ
  let completed = matches.filter(r =>
    r.season === season && r.status === 'completed'
  );
  if (league) completed = completed.filter(r => r.league === league);

  // สะสมสถิติของแต่ละสโมสร
  const stats = {}; // { club_id: { league, played, won, drawn, lost, gf, ga, matchDates[] } }

  completed.forEach(r => {
    const hScore = parseInt(r.home_score);
    const aScore = parseInt(r.away_score);
    if (isNaN(hScore) || isNaN(aScore)) return; // ข้ามถ้าคะแนนไม่ถูกต้อง

    const hId = r.home_club_id;
    const aId = r.away_club_id;

    if (!stats[hId]) stats[hId] = { league: r.league, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, matches: [] };
    if (!stats[aId]) stats[aId] = { league: r.league, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, matches: [] };

    // เพิ่มสถิติ
    stats[hId].played++; stats[hId].gf += hScore; stats[hId].ga += aScore;
    stats[aId].played++; stats[aId].gf += aScore; stats[aId].ga += hScore;

    if (hScore > aScore) {
      stats[hId].won++;  stats[hId].matches.push({ date: r.date, result: 'W' });
      stats[aId].lost++; stats[aId].matches.push({ date: r.date, result: 'L' });
    } else if (hScore === aScore) {
      stats[hId].drawn++; stats[hId].matches.push({ date: r.date, result: 'D' });
      stats[aId].drawn++; stats[aId].matches.push({ date: r.date, result: 'D' });
    } else {
      stats[hId].lost++; stats[hId].matches.push({ date: r.date, result: 'L' });
      stats[aId].won++;  stats[aId].matches.push({ date: r.date, result: 'W' });
    }
  });

  // ถ้า league ระบุ — ดึงสโมสรทั้งหมดในลีกนั้นจาก Clubs sheet
  // เพื่อให้ทีมที่ยังไม่ได้แข่งปรากฏในตารางด้วย (0 แต้ม)
  const allClubs = getSheetData(SHEETS.CLUBS);
  const leagueClubs = league
    ? allClubs.filter(c => c.league === league)
    : allClubs;

  leagueClubs.forEach(c => {
    if (!stats[c.club_id]) {
      stats[c.club_id] = { league: c.league, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, matches: [] };
    }
  });

  // แปลงเป็น array แล้วเรียงตามกฎตารางคะแนน
  // 1. แต้ม (W=3, D=1) → 2. ผลต่างประตู → 3. ประตูได้ → 4. ชื่อ A-Z
  const standings = Object.entries(stats)
    .map(([clubId, s]) => {
      const club    = clubsMap[clubId] || {};
      const points  = s.won * 3 + s.drawn;
      const gd      = s.gf - s.ga;
      // form: 5 นัดล่าสุด เรียงจากล่าสุดก่อน
      const form = s.matches
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map(m => m.result)
        .join('');

      return {
        club_id:  clubId,
        name_th:  club.name_th  || clubId,
        name_en:  club.name_en  || '',
        logo_url: club.logo_url || '',
        league:   s.league,
        played:   s.played,
        won:      s.won,
        drawn:    s.drawn,
        lost:     s.lost,
        gf:       s.gf,
        ga:       s.ga,
        gd:       gd,
        points:   points,
        form:     form,
      };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.gd     - a.gd     ||
      b.gf     - a.gf     ||
      a.name_en.localeCompare(b.name_en)
    )
    .map((row, i) => ({ rank: i + 1, ...row })); // ใส่ลำดับอัตโนมัติ

  return { standings, updated_at: new Date().toISOString() };
}

// ===================================================
// MATCHES
// ===================================================

function getMatches(league, matchday, season) {
  const rows = getSheetData(SHEETS.MATCHES);
  const clubsMap = getClubsMap();

  let filtered = rows.filter(r => r.season === season);
  if (league) filtered = filtered.filter(r => r.league === league);
  if (matchday) filtered = filtered.filter(r => r.matchday === String(matchday));

  const matches = filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(r => formatMatch(r, clubsMap));

  return { matches };
}

function getRecentMatches(limit, season) {
  const rows = getSheetData(SHEETS.MATCHES);
  const clubsMap = getClubsMap();

  const completed = rows
    .filter(r => r.season === season && (r.status === 'completed' || r.status === 'live'))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map(r => formatMatch(r, clubsMap));

  return { matches: completed };
}

function formatMatch(r, clubsMap) {
  clubsMap = clubsMap || getClubsMap();
  const home = clubsMap[r.home_club_id] || {};
  const away = clubsMap[r.away_club_id] || {};

  return {
    match_id:       r.match_id,
    league:         r.league,
    season:         r.season,
    matchday:       r.matchday ? parseInt(r.matchday) : null,
    date:           r.date,
    status:         r.status || 'scheduled',
    home_club_id:   r.home_club_id,
    home_club_name: home.name_th || r.home_club_name || r.home_club_id, // join อัตโนมัติ
    away_club_id:   r.away_club_id,
    away_club_name: away.name_th || r.away_club_name || r.away_club_id,
    home_score:     r.home_score !== '' ? parseInt(r.home_score) : null,
    away_score:     r.away_score !== '' ? parseInt(r.away_score) : null,
    home_club:      { name_th: home.name_th || r.home_club_name || '', logo_url: home.logo_url || '' },
    away_club:      { name_th: away.name_th || r.away_club_name || '', logo_url: away.logo_url || '' },
    stadium:        r.stadium || '',
  };
}

// ===================================================
// CLUBS
// ===================================================

function getClubs(league) {
  const rows = getSheetData(SHEETS.CLUBS);
  const filtered = league ? rows.filter(r => r.league === league) : rows;
  const clubs = filtered.map(formatClub);
  return { clubs };
}

function getClub(clubId) {
  const rows = getSheetData(SHEETS.CLUBS);
  const row = rows.find(r => r.club_id === clubId);
  if (!row) return { club: null };
  return { club: formatClub(row) };
}

function formatClub(r) {
  return {
    club_id:     r.club_id,
    name_th:     r.name_th,
    name_en:     r.name_en,
    name_ko:     r.name_ko || '',
    league:      r.league,
    stadium_th:  r.stadium_th,
    stadium_en:  r.stadium_en || '',
    capacity:    r.capacity ? parseInt(r.capacity) : null,
    city:        r.city || '',
    founded:     r.founded || '',
    logo_url:    r.logo_url || '',
    website:     r.website || '',
  };
}

// ===================================================
// PLAYERS
// ===================================================

function getPlayers(clubId) {
  const rows = getSheetData(SHEETS.PLAYERS);
  const filtered = clubId ? rows.filter(r => r.club_id === clubId) : rows;
  const players = filtered.map(r => ({
    player_id:   r.player_id,
    club_id:     r.club_id,
    number:      r.number || '',
    name_th:     r.name_th,
    name_ko:     r.name_ko || '',
    name_en:     r.name_en || '',
    position:    r.position || '',
    nationality: r.nationality || '',
    flag:        r.flag || '',
    dob:         r.dob || '',
  }));
  return { players };
}

// ===================================================
// SETUP — รันครั้งเดียวเพื่อสร้าง Sheet + ข้อมูลเริ่มต้น
// วิธีใช้: เปิด Apps Script แล้วกด Run > setup
// ===================================================

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // สร้าง temp sheet ค้างไว้ก่อน เพื่อป้องกัน error "ลบชีตใบสุดท้ายไม่ได้"
  const tempSheet = ss.insertSheet('_setup_temp_');

  // ลบชีตเดิม (ถ้ามี) — ไม่รวม Standings เพราะคำนวณจาก Matches แล้ว
  const sheetNames = [SHEETS.CLUBS, SHEETS.PLAYERS, SHEETS.MATCHES];
  sheetNames.forEach(name => {
    const existing = ss.getSheetByName(name);
    if (existing) ss.deleteSheet(existing);
  });

  // ลบชีต default ที่อาจมี (Sheet1, แผ่น1 ฯลฯ)
  ['Sheet1', 'แผ่น1', 'Sheet 1'].forEach(name => {
    const s = ss.getSheetByName(name);
    if (s) ss.deleteSheet(s);
  });

  // สร้างชีตใหม่ทั้งหมด (ไม่ต้องสร้าง Standings sheet แล้ว)
  setupClubs(ss);
  setupPlayers(ss);
  setupMatches(ss);

  // ลบ temp sheet ออก
  ss.deleteSheet(ss.getSheetByName('_setup_temp_'));

  SpreadsheetApp.getUi().alert('✅ Setup เสร็จแล้ว!\n\nสร้างชีตและข้อมูลตัวอย่างครบ:\n• Clubs (22 สโมสร)\n• Players (ตัวอย่าง 5 คน)\n• Matches (ตัวอย่าง 10 นัด)\n\n💡 ตารางคะแนนคำนวณอัตโนมัติจาก Matches sheet\n   แค่กรอก home_score / away_score แล้วตั้ง status = completed\n   ระบบจัดอันดับให้เองโดยไม่ต้องแก้ Standings sheet\n\nตอนนี้สามารถ Deploy เป็น Web App ได้เลย!');
}

function setupClubs(ss) {
  const sheet = ss.insertSheet(SHEETS.CLUBS);
  const headers = ['club_id','name_th','name_en','name_ko','league','stadium_th','stadium_en','capacity','city','founded','logo_url','website'];

  // K리그1 (12 สโมสร)
  const k1clubs = [
    ['ulsan',  'อุลซาน เอชดี เอฟซี',       'Ulsan HD FC',               '울산 HD FC',       'K1', 'สนามฟุตบอลมุนซู อุลซาน',   'Ulsan Munsu Football Stadium', 44102, 'อุลซาน',  1983, '', 'https://www.ulsan-hd.com'],
    ['jbh',    'จอนบุก ฮุนได มอเตอร์ส',     'Jeonbuk Hyundai Motors FC', '전북 현대 모터스', 'K1', 'สนามเวิลด์คัพ จอนจู',       'Jeonju World Cup Stadium',     42477, 'จอนจู',   1994, '', 'https://www.jeonbukfc.com'],
    ['fcs',    'เอฟซี โซล',                  'FC Seoul',                  'FC 서울',          'K1', 'สนามเวิลด์คัพ โซล',          'Seoul World Cup Stadium',       66704, 'โซล',     1983, '', 'https://www.fcseoul.com'],
    ['poh',    'โพฮัง สตีลเลอร์ส',           'Pohang Steelers',           '포항 스틸러스',    'K1', 'โพฮัง สตีลยาร์ด',            'Pohang Steelyard',              17443, 'โพฮัง',   1973, '', 'https://www.steelers.co.kr'],
    ['ich',    'อินชอน ยูไนเต็ด เอฟซี',     'Incheon United FC',         '인천 유나이티드', 'K1', 'สนามฟุตบอลอินชอน',           'Incheon Football Stadium',      20891, 'อินชอน',  2003, '', 'https://www.incheonutd.com'],
    ['gwfc',   'คังวอน เอฟซี',               'Gangwon FC',                '강원 FC',          'K1', 'สนามคังวอน',                  'Gangwon Football Center',       18000, 'ชุนชอน',  2009, '', 'https://www.gangwon-fc.com'],
    ['gjfc',   'กวังจู เอฟซี',               'Gwangju FC',                '광주 FC',          'K1', 'สนามเวิลด์คัพ กวังจู',       'Gwangju World Cup Stadium',     40245, 'กวังจู',  2011, '', 'https://www.gwangjufc.com'],
    ['djh',    'แทจอน ฮานา ซิติเซน',         'Daejeon Hana Citizen',      '대전 하나 시티즌', 'K1', 'สนามเวิลด์คัพ แทจอน',       'Daejeon World Cup Stadium',     41295, 'แทจอน',   1997, '', 'https://www.djcitizen.com'],
    ['jeju',   'เชจู ยูไนเต็ด เอฟซี',       'Jeju United FC',            '제주 유나이티드', 'K1', 'สนามเวิลด์คัพ เชจู',         'Jeju World Cup Stadium',        35657, 'เชจู',    1982, '', 'https://www.jejuunited.com'],
    ['swfc',   'ซูวอน เอฟซี',               'Suwon FC',                  '수원 FC',          'K1', 'สนามกีฬาซูวอน',              'Suwon Sports Complex',          29200, 'ซูวอน',   2003, '', 'https://www.suwonfc.com'],
    ['dgfc',   'แทกู เอฟซี',                'Daegu FC',                  '대구 FC',          'K1', 'DGB แทกู แบงก์ พาร์ค',       'DGB Daegu Bank Park',           12000, 'แทกู',    2002, '', 'https://www.daegufc.co.kr'],
    ['gsc',    'กิมชอน ซังมู เอฟซี',         'Gimcheon Sangmu FC',        '김천 상무 FC',    'K1', 'สนามกีฬาจังหวัดกิมชอน',      'Gimcheon Stadium',              13000, 'กิมชอน',  2021, '', ''],
  ];

  // K리그2 (11 สโมสร)
  const k2clubs = [
    ['ssb',    'ซูวอน ซัมซุง บลูวิงส์',     'Suwon Samsung Bluewings',   '수원 삼성 블루윙즈','K2', 'สนามเวิลด์คัพ ซูวอน',       'Suwon World Cup Stadium',       43959, 'ซูวอน',   1995, '', 'https://www.bluewings.kr'],
    ['bfc',    'ปูซาน ไอพาร์ค',             'Busan IPark',               '부산 아이파크',    'K2', 'สนามกีฬาแอชอา ปูซาน',       'Busan Asiad Stadium',            53769, 'ปูซาน',   1983, '', 'https://www.busanipark.com'],
    ['snfc',   'ซองนัม เอฟซี',              'Seongnam FC',               '성남 FC',          'K2', 'สนามทันชอน',                  'Tancheon Sports Complex',        16146, 'ซองนัม',  2014, '', 'https://www.seongnamfc.com'],
    ['seland', 'โซล อี-แลนด์',             'Seoul E-Land FC',           '서울 E-Land',      'K2', 'สนามโอลิมปิก โซล',           'Seoul Olympic Stadium',          69950, 'โซล',     2014, '', 'https://www.seoulelfc.com'],
    ['ansan',  'อันซาน กรีนเนอร์ส',         'Ansan Greeners FC',         '안산 그리너스',    'K2', 'สนามอันซาน วาซ็อต',          'Ansan Wa Stadium',               35000, 'อันซาน',  2017, '', ''],
    ['jnam',   'จอนนัม ดราก้อนส์',          'Jeonnam Dragons',           '전남 드래곤즈',    'K2', 'สนามกีฬาควางยาง',            'Gwangyang Football Center',      13496, 'กวังยาง', 1994, '', 'https://www.dragons.co.kr'],
    ['asan',   'ชุงนัม อาซาน',              'Chungnam Asan FC',          '충남 아산',        'K2', 'สนามอาซาน อีสุนชิน',         'Asan I順臣 Stadium',             13000, 'อาซาน',   2017, '', ''],
    ['pchon',  'ปูชอน เอฟซี 1995',          'Bucheon FC 1995',           '부천 FC 1995',     'K2', 'สนามบูชอน',                   'Bucheon Stadium',                35000, 'ปูชอน',   2013, '', ''],
    ['knam',   'คย็องนัม เอฟซี',            'Gyeongnam FC',              '경남 FC',          'K2', 'สนามกีฬาชางวอน',             'Changwon Football Center',       27085, 'ชางวอน',  2006, '', ''],
    ['anyang', 'อันยาง เอฟซี',              'FC Anyang',                 'FC 안양',          'K2', 'สนามอันยาง',                  'Anyang Football Center',         17143, 'อันยาง',  2013, '', ''],
    ['chbuk',  'ชุงบุก ชองจู เอฟซี',        'Chungbuk Cheongju FC',      '충북 청주 FC',    'K2', 'สนามชองจู',                   'Cheongju Football Center',       14000, 'ชองจู',   2022, '', ''],
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, k1clubs.length, headers.length).setValues(k1clubs);
  sheet.getRange(2 + k1clubs.length, 1, k2clubs.length, headers.length).setValues(k2clubs);

  // จัด format
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#003087').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupPlayers(ss) {
  const sheet = ss.insertSheet(SHEETS.PLAYERS);
  const headers = ['player_id','club_id','number','name_th','name_ko','name_en','position','nationality','flag','dob'];

  // ตัวอย่างผู้เล่นบางส่วนของ อุลซาน HD และ จอนบุก (เพื่อดูว่าระบบทำงาน)
  const samplePlayers = [
    ['ulsan_001', 'ulsan', '1',  'โจ ฮยอน วู',    '조현우',    'Jo Hyeon-woo',    'GK', 'เกาหลีใต้', '🇰🇷', '1991-09-25'],
    ['ulsan_002', 'ulsan', '5',  'คิม กี ฮี',     '김기희',    'Kim Ki-hee',      'DF', 'เกาหลีใต้', '🇰🇷', '1989-07-13'],
    ['ulsan_003', 'ulsan', '11', 'ออม วอน ซัง',   '엄원상',    'Um Won-sang',     'FW', 'เกาหลีใต้', '🇰🇷', '1999-01-06'],
    ['jbh_001',   'jbh',   '1',  'คิม จุน ฮง',    '김준홍',    'Kim Jun-hong',    'GK', 'เกาหลีใต้', '🇰🇷', '2000-03-15'],
    ['jbh_002',   'jbh',   '9',  'กุสตาโว',        '구스타보',  'Gustavo',         'FW', 'บราซิล',    '🇧🇷', '1997-05-22'],
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (samplePlayers.length > 0) {
    sheet.getRange(2, 1, samplePlayers.length, headers.length).setValues(samplePlayers);
  }

  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#003087').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupMatches(ss) {
  const sheet = ss.insertSheet(SHEETS.MATCHES);
  const headers = [
    'match_id','league','season','matchday','date','status',
    'home_club_id','home_club_name','home_logo_url','home_score',
    'away_club_id','away_club_name','away_logo_url','away_score',
    'stadium'
  ];

  // ตัวอย่างผลการแข่งขัน K1 นัดที่ 1-2
  const sampleMatches = [
    ['k1_2026_001','K1','2026',1,'2026-03-07T14:00:00','completed','ulsan','อุลซาน เอชดี','',2,'jbh','จอนบุก ฮุนได','',1,'สนามมุนซู'],
    ['k1_2026_002','K1','2026',1,'2026-03-07T16:00:00','completed','fcs','เอฟซี โซล','',0,'poh','โพฮัง สตีลเลอร์ส','',0,'สนามเวิลด์คัพ โซล'],
    ['k1_2026_003','K1','2026',1,'2026-03-08T14:00:00','completed','ich','อินชอน ยูไนเต็ด','',1,'gwfc','คังวอน เอฟซี','',2,'สนามอินชอน'],
    ['k1_2026_004','K1','2026',1,'2026-03-08T16:00:00','completed','gjfc','กวังจู เอฟซี','',1,'djh','แทจอน ฮานา ซิติเซน','',1,'สนามเวิลด์คัพ กวังจู'],
    ['k1_2026_005','K1','2026',1,'2026-03-08T14:00:00','completed','jeju','เชจู ยูไนเต็ด','',3,'swfc','ซูวอน เอฟซี','',0,'สนามเชจู'],
    ['k1_2026_006','K1','2026',1,'2026-03-08T16:00:00','completed','dgfc','แทกู เอฟซี','',0,'gsc','กิมชอน ซังมู','',1,'DGB พาร์ค'],
    ['k1_2026_007','K1','2026',2,'2026-03-14T14:00:00','completed','jbh','จอนบุก ฮุนได','',2,'fcs','เอฟซี โซล','',2,'สนามจอนจู'],
    ['k1_2026_008','K1','2026',2,'2026-03-14T16:00:00','completed','ulsan','อุลซาน เอชดี','',3,'gwfc','คังวอน เอฟซี','',0,'สนามมุนซู'],
    ['k1_2026_009','K1','2026',3,'2026-03-21T14:00:00','scheduled','fcs','เอฟซี โซล','','','ulsan','อุลซาน เอชดี','','','สนามเวิลด์คัพ โซล'],
    ['k1_2026_010','K1','2026',3,'2026-03-21T16:00:00','scheduled','poh','โพฮัง สตีลเลอร์ส','','','jbh','จอนบุก ฮุนได','','','โพฮัง สตีลยาร์ด'],
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, sampleMatches.length, headers.length).setValues(sampleMatches);

  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#003087').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupStandings(ss) {
  const sheet = ss.insertSheet(SHEETS.STANDINGS);
  const headers = ['league','season','rank','club_id','name_th','name_en','logo_url','played','won','drawn','lost','gf','ga','gd','points','form'];

  // ตารางคะแนน K1 (อิงจาก sample matches ด้านบน)
  const k1standings = [
    ['K1','2026',1,'ulsan', 'อุลซาน เอชดี เอฟซี',      'Ulsan HD FC',           '', 2, 2, 0, 0, 5, 1,  4, 6, 'WW'],
    ['K1','2026',2,'gwfc',  'คังวอน เอฟซี',              'Gangwon FC',            '', 2, 1, 0, 1, 3, 2,  1, 3, 'WL'],
    ['K1','2026',3,'jeju',  'เชจู ยูไนเต็ด เอฟซี',      'Jeju United FC',        '', 1, 1, 0, 0, 3, 0,  3, 3, 'W'],
    ['K1','2026',4,'gsc',   'กิมชอน ซังมู เอฟซี',       'Gimcheon Sangmu FC',    '', 1, 1, 0, 0, 1, 0,  1, 3, 'W'],
    ['K1','2026',5,'jbh',   'จอนบุก ฮุนได มอเตอร์ส',   'Jeonbuk Hyundai Motors','', 2, 0, 1, 1, 3, 3,  0, 1, 'DL'],
    ['K1','2026',6,'fcs',   'เอฟซี โซล',                'FC Seoul',              '', 2, 0, 1, 1, 2, 2,  0, 1, 'DD'],
    ['K1','2026',7,'poh',   'โพฮัง สตีลเลอร์ส',         'Pohang Steelers',       '', 1, 0, 1, 0, 0, 0,  0, 1, 'D'],
    ['K1','2026',8,'gjfc',  'กวังจู เอฟซี',              'Gwangju FC',            '', 1, 0, 1, 0, 1, 1,  0, 1, 'D'],
    ['K1','2026',9,'djh',   'แทจอน ฮานา ซิติเซน',       'Daejeon Hana Citizen',  '', 1, 0, 1, 0, 1, 1,  0, 1, 'D'],
    ['K1','2026',10,'ich',  'อินชอน ยูไนเต็ด เอฟซี',   'Incheon United FC',     '', 1, 0, 0, 1, 1, 2, -1, 0, 'L'],
    ['K1','2026',11,'dgfc', 'แทกู เอฟซี',               'Daegu FC',              '', 1, 0, 0, 1, 0, 1, -1, 0, 'L'],
    ['K1','2026',12,'swfc', 'ซูวอน เอฟซี',              'Suwon FC',              '', 1, 0, 0, 1, 0, 3, -3, 0, 'L'],
  ];

  // ตารางคะแนน K2 (ยังไม่มีข้อมูล — ตัวอย่างว่างๆ ให้กรอกเอง)
  const k2standings = [
    ['K2','2026',1,'ssb',    'ซูวอน ซัมซุง บลูวิงส์',  'Suwon Samsung Bluewings','', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',2,'bfc',    'ปูซาน ไอพาร์ค',           'Busan IPark',            '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',3,'snfc',   'ซองนัม เอฟซี',            'Seongnam FC',            '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',4,'seland', 'โซล อี-แลนด์',            'Seoul E-Land FC',        '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',5,'ansan',  'อันซาน กรีนเนอร์ส',       'Ansan Greeners FC',      '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',6,'jnam',   'จอนนัม ดราก้อนส์',        'Jeonnam Dragons',        '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',7,'asan',   'ชุงนัม อาซาน',            'Chungnam Asan FC',       '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',8,'pchon',  'ปูชอน เอฟซี 1995',        'Bucheon FC 1995',        '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',9,'knam',   'คย็องนัม เอฟซี',          'Gyeongnam FC',           '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',10,'anyang','อันยาง เอฟซี',             'FC Anyang',              '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['K2','2026',11,'chbuk', 'ชุงบุก ชองจู เอฟซี',      'Chungbuk Cheongju FC',   '', 0, 0, 0, 0, 0, 0, 0, 0, ''],
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, k1standings.length, headers.length).setValues(k1standings);
  sheet.getRange(2 + k1standings.length, 1, k2standings.length, headers.length).setValues(k2standings);

  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#003087').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}
