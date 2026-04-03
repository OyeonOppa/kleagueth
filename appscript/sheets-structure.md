# โครงสร้าง Google Sheets

สร้าง Google Sheets 1 ไฟล์ แล้วสร้าง Sheet tab ทั้ง 4 นี้:

---

## Sheet 1: `Clubs`

| column | ตัวอย่าง | คำอธิบาย |
|--------|---------|---------|
| club_id | jbh | รหัสสโมสร (ตัวย่อ) |
| name_th | จอนบุก ฮุนได มอเตอร์ส | ชื่อภาษาไทย |
| name_en | Jeonbuk Hyundai Motors | ชื่อภาษาอังกฤษ |
| name_ko | 전북 현대 모터스 | ชื่อภาษาเกาหลี |
| league | K1 | K1 หรือ K2 |
| stadium_th | สนามจอนบุก | ชื่อสนามภาษาไทย |
| stadium_en | Jeonju World Cup Stadium | ชื่อสนามภาษาอังกฤษ |
| capacity | 42477 | ความจุสนาม |
| city | จอนจู | เมือง (ภาษาไทย) |
| founded | 1994 | ปีก่อตั้ง (ค.ศ.) |
| logo_url | https://... | URL รูปโลโก้ (ถ้ามี) |
| website | https://... | เว็บไซต์สโมสร |

---

## Sheet 2: `Players`

| column | ตัวอย่าง | คำอธิบาย |
|--------|---------|---------|
| player_id | jbh_001 | รหัสผู้เล่น |
| club_id | jbh | รหัสสโมสร (ตรงกับ Clubs) |
| number | 9 | เบอร์เสื้อ |
| name_th | ลิม ซอน มิน | ชื่อภาษาไทย |
| name_ko | 임선민 | ชื่อภาษาเกาหลี |
| name_en | Lim Sun-min | ชื่อภาษาอังกฤษ |
| position | FW | GK / DF / MF / FW |
| nationality | เกาหลีใต้ | สัญชาติ (ภาษาไทย) |
| flag | 🇰🇷 | ธงชาติ (emoji) |
| dob | 1995-03-15 | วันเกิด (YYYY-MM-DD) |

---

## Sheet 3: `Matches`

| column | ตัวอย่าง | คำอธิบาย |
|--------|---------|---------|
| match_id | k1_2025_001 | รหัสนัด |
| league | K1 | K1 หรือ K2 |
| season | 2025 | ฤดูกาล |
| matchday | 1 | นัดที่ |
| date | 2025-03-01T14:00:00 | วันเวลา (ISO 8601) |
| status | completed | scheduled / completed / live |
| home_club_id | jbh | รหัสทีมเหย้า |
| home_club_name | จอนบุก ฮุนได | ชื่อทีมเหย้า (ภาษาไทย) |
| home_logo_url | https://... | โลโก้ทีมเหย้า |
| home_score | 2 | ประตูทีมเหย้า (ว่างถ้ายังไม่แข่ง) |
| away_club_id | ulsan | รหัสทีมเยือน |
| away_club_name | อุลซาน เอชดี | ชื่อทีมเยือน (ภาษาไทย) |
| away_logo_url | https://... | โลโก้ทีมเยือน |
| away_score | 1 | ประตูทีมเยือน |
| stadium | สนามจอนจู | สนาม |

---

## Sheet 4: `Standings`

| column | ตัวอย่าง | คำอธิบาย |
|--------|---------|---------|
| league | K1 | K1 หรือ K2 |
| season | 2025 | ฤดูกาล |
| rank | 1 | อันดับ |
| club_id | ulsan | รหัสสโมสร |
| name_th | อุลซาน เอชดี | ชื่อภาษาไทย |
| name_en | Ulsan HD | ชื่อภาษาอังกฤษ |
| logo_url | https://... | URL โลโก้ |
| played | 10 | แข่งแล้ว |
| won | 7 | ชนะ |
| drawn | 2 | เสมอ |
| lost | 1 | แพ้ |
| gf | 22 | ประตูได้ |
| ga | 8 | ประตูเสีย |
| gd | 14 | ต่างประตู |
| points | 23 | คะแนน |
| form | WWDWL | ฟอร์ม 5 นัดล่าสุด (W=ชนะ, D=เสมอ, L=แพ้) |
