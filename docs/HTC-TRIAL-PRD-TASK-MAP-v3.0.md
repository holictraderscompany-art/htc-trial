# HTC TRIAL — PRD & MASTER TASK MAP v3.0

**Rebased Actual Build — September–December 2026**

| Metadata | Nilai |
| --- | --- |
| Produk | Holic Traders Company — HTC Trial |
| Sumber utama | Video `1000584931.mp4`, durasi 02:01 |
| Tanggal konversi | 12 Oktober 2026 |
| Tujuan file | Memindahkan PRD dan pemetaan dalam video menjadi dokumen teks yang dapat dipakai Codex |
| Prinsip | Re-baseline dari pekerjaan nyata; gunakan kembali fondasi yang sudah dibangun |

## Cara memakai dokumen

Bagian 1–9 merekonstruksi isi PRD dan Task Map yang terlihat dalam video. Tabel lebar di video dirapikan menjadi tabel Markdown. Nama tugas dan pembagian grup dipertahankan. Ini bukan perintah membangun ulang atau mengembalikan status proyek ke waktu perekaman.

Status `CLOSED`, `NEXT`, dan `Planned` pada bagian sumber adalah **status historis dalam video**, bukan audit repositori saat ini. Pembaruan sesi saat ini dicatat terpisah pada Lampiran A.

Video menyediakan rincian fondasi, T09–T11, dan pemetaan T01–T39. Untuk T12–T39, sumber terutama berisi nama/lingkup tingkat tinggi; sumber tidak menyediakan kontrak implementasi lengkap, path file, skema baru, dependensi per tugas, atau acceptance criteria terperinci. Jangan menganggap nama tugas sebagai izin mengarang fitur. Gunakan kontrak tugas dan repositori yang tersedia untuk rincian pelaksanaan.

## 1. Product Definition

HTC Trial berlangsung September–Desember 2026 untuk membuktikan bahwa ekosistem HTC dapat berjalan stabil sebelum scale-up Januari 2027.

Trial membangun dan menguji ekosistem berikut:

| Elemen | Definisi |
| --- | --- |
| Core | Education + Learning + Knowledge + Community |
| Supporting systems | Content + Automation + Analytics + Monetization |
| Filosofi | Educate → Empower → Elevate |
| User journey | Learn → Grow → Rise |

HTC Trial bukan LMS penuh.

## 2. Trial Hard Boundaries

Sampai Desember 2026, tidak boleh ada:

- Actual lesson curriculum.
- Beginner Curriculum.
- Open curriculum.
- Learning modules.
- Quiz.
- Assessment.
- Enrollment.
- Learning progress system.
- Public learning dashboard.
- LMS behavior.

Trial hanya boleh menggunakan introductory / educational content. Official curriculum dimulai Januari 2027.

## 3. System Layers

| Layer | Fungsi |
| --- | --- |
| L1 — System Foundation | Database, auth, authorization, API security, tests, shared infrastructure |
| L2 — Public / User Application | Public content experience, media, discovery, controlled user-facing capabilities |
| L3 — Founder / Admin Application | Founder operational tools, CMS, asset management, publishing controls |
| Supporting Systems | Content operations, traffic, community, monetization, analytics, automation |
| Validation Layer | Security, recovery, E2E testing, launch, trial measurement |

**Dependency:** L2 dan L3 boleh bergantung pada Foundation. Foundation tidak boleh bergantung pada presentation layer L2/L3.

## 4. Approved Technical Baseline

| Area | Baseline dalam sumber |
| --- | --- |
| Application | Next.js |
| Database | PostgreSQL / Supabase |
| Auth | Supabase Auth + Google OAuth |
| Storage | Private Supabase Storage |
| Hosting | Vercel |
| Source control | GitHub |
| Active repository | `holictraderscompany-art/htc-trial` |
| Founder identity | Server-authorized Founder role |
| Analytics direction | First-party events + UTM + necessary data only |
| Asset upload | Server-authorized direct upload to private Supabase Storage |

Founder/admin authority tidak boleh hanya bergantung pada frontend email checks.

## 5. Actual Build Baseline — T01–T08

T01–T08 dalam sumber mengikuti pekerjaan nyata yang telah dilakukan. Fondasi ini digunakan kembali, bukan dibangun ulang.

| Task | Canonical title | Status dalam video |
| --- | --- | --- |
| T01 | Repository & System Foundation | CLOSED |
| T02 | Database & Core Data Foundation | CLOSED |
| T03 | Authentication & Role Authorization Foundation | CLOSED |
| T04 | API, Access Control & Release Foundation | CLOSED |
| T05 | Foundation Validation & Test Layer | CLOSED |
| T06 | Content Management & Release | CLOSED |
| T07 | Media & Asset Management | CLOSED |
| T08 | Content Asset & Media Foundation — Rebaseline | CLOSED |

### T07A — Asset Metadata & Storage Foundation

- `trial_assets`.
- Private `trial-assets` bucket.
- Founder-authorized direct upload.
- State `PENDING / READY / DELETING`.
- MIME / size / path controls.
- Private asset handling.
- Consistency guards.

### T07B — Content ↔ Asset Integration

- `trial_content_assets`.
- Role `PRIMARY / THUMBNAIL / ATTACHMENT`.
- READY-only attachment.
- `DRAFT / RELEASED / WITHDRAWN` visibility.
- Linked asset delete protection.
- Uniqueness and integrity controls.

### T08 Result

Sebagian besar kebutuhan Content Asset & Media Foundation telah dipenuhi T07A + T07B. T08 hanya menambah:

- Baseline documentation.
- Missing focused tests.
- Media foundation validation.

Tidak membuat schema/media architecture kedua.

## 6. Master Mapping — T01–T39

### Pembagian grup

| Grup | Nama | Rentang |
| --- | --- | --- |
| Group 01 | System Foundation | T01–T05 |
| Group 02 | Public / User Application | T06–T11 |
| Group 03 | Founder / Admin Application | T12–T17 |
| Group 04 | Content, Traffic, Community & Monetization | T18–T25 |
| Group 05 | Automation, Security & Recovery | T26–T31 |
| Group 06 | Testing, Launch & Trial Validation | T32–T39 |

### Group 01 — System Foundation

T01–T05 ditandai complete dalam sumber.

| Task | Scope |
| --- | --- |
| T01 | Repository & System Foundation |
| T02 | Database & Core Data Foundation |
| T03 | Authentication & Role Authorization Foundation |
| T04 | API, Access Control & Release Foundation |
| T05 | Foundation Validation & Test Layer |

### Group 02 — Public / User Application

| Task | Scope | Status dalam video |
| --- | --- | --- |
| T06 | Content Management & Release | Complete |
| T07 | Media & Asset Management | Complete |
| T08 | Content Asset & Media Foundation — Rebaseline | Complete |
| T09 | Public Content Delivery & Discovery Foundation | NEXT |
| T10 | Public/User Experience & Trial Access Foundation | Planned |
| T11 | Public/User Application Validation & Release Gate | Planned |

#### T09 — Public Content Delivery & Discovery Foundation

Membuat cara public menemukan dan mengonsumsi content yang sudah `RELEASED`:

- Public released-content listing.
- Content detail/read model.
- Basic content taxonomy/category jika diperlukan.
- Pagination.
- Deterministic ordering.
- Safe search/filtering bila memang diperlukan.
- Metadata untuk discovery.
- Memakai media metadata T08 tanpa membangun ulang.
- `DRAFT / WITHDRAWN` tetap tidak terlihat.

Tidak membuat curriculum/LMS.

#### T10 — Public/User Experience & Trial Access Foundation

Membentuk experience publik Trial:

- Public application shell.
- Navigation.
- Authenticated USER boundary bila diperlukan.
- Introduction/content pages.
- Safe session-aware public/user behavior.
- Empty/error/not-found states.

Bukan learning dashboard.

#### T11 — Public/User Application Validation & Release Gate

Menutup Group 02 melalui:

- E2E public flows.
- Public/user authorization regression.
- Content/media visibility.
- Accessibility baseline.
- Responsive validation.
- Error handling.
- Security regression.
- Release readiness.

### Group 03 — Founder / Admin Application

**Lingkup Grup 3 adalah T12–T17.**

| Task | Scope dari video |
| --- | --- |
| T12 | Founder/Admin Application Shell & Protected Access |
| T13 | Founder Content Management Workspace |
| T14 | Founder Media & Asset Workspace |
| T15 | Publishing & Release Operations |
| T16 | Founder Operations Dashboard & System Visibility |
| T17 | Founder/Admin Validation & Release Gate |

Founder/Admin UI dibangun pada grup ini. Admin dashboard tidak dibangun pada T01–T05.

**Batas informasi sumber:** video tidak menyertakan rincian fitur, path, model data, acceptance criteria, atau matriks uji tersendiri untuk T14–T17. Tabel di atas adalah pemetaan sah dari video, bukan kontrak teknis lengkap. Implementasi harus mengacu pada baseline T06/T07/T08, kontrak yang telah disetujui, dan keadaan repositori yang aktual. Jangan membuat fondasi content/asset kedua.

### Group 04 — Content, Traffic, Community & Monetization

| Task | Scope |
| --- | --- |
| T18 | Trial Content Strategy & Taxonomy |
| T19 | Content Production & Editorial Pipeline |
| T20 | Content Distribution & Social Publishing Foundation |
| T21 | SEO, Discoverability & Traffic Acquisition |
| T22 | Community Entry & Engagement Foundation |
| T23 | Community Operations & Moderation |
| T24 | Trial Monetization Foundation |
| T25 | Growth Analytics & Feedback Loop |

Content Engine ditempatkan setelah aplikasi Public/User dan Founder/Admin mempunyai fondasi. Content Engine tetap menjadi bagian rencana, bukan dihapus.

### Group 05 — Automation, Security & Recovery

| Task | Scope |
| --- | --- |
| T26 | Automation Foundation |
| T27 | Content & Operational Automation |
| T28 | Observability, Logging & Alerts |
| T29 | Security Hardening |
| T30 | Backup, Recovery & Incident Response |
| T31 | Resilience & Recovery Validation |

### Group 06 — Testing, Launch & Trial Validation

| Task | Scope |
| --- | --- |
| T32 | Full-System Integration Testing |
| T33 | Performance & Reliability Validation |
| T34 | Security & Privacy Validation |
| T35 | Analytics & Trial Measurement Validation |
| T36 | Launch Readiness Gate |
| T37 | HTC Trial Soft Launch |
| T38 | Trial Monitoring, Feedback & Controlled Iteration |
| T39 | Trial Closeout & January 2027 Scale-Up Readiness |

## 7. Execution Rule dari Sumber

Setiap task menggunakan urutan:

1. Existing baseline.
2. Gap analysis.
3. Implementation.
4. Tests.
5. Remote gate hanya jika perlu.
6. Runtime validation jika perlu.
7. Commit.
8. Push.
9. CLOSED.

Hindari siklus readiness panjang → readiness lagi → discovery lagi → mapping lagi.

Task berikutnya tidak mengulang readiness penuh apabila task sebelumnya CLOSED, repository clean, dan local/remote aligned. Cukup preflight singkat.

Urutan di atas adalah aturan yang terekam. Otorisasi tindakan mengikuti instruksi pengguna terbaru untuk lingkup yang sedang dikerjakan; pencantuman commit/push dalam urutan tidak memberikan izin untuk grup lain.

## 8. ECC Rule

Mulai new Codex session, ECC boleh digunakan sebagai engineering-review aid untuk:

- Repo review.
- Security review.
- Bug/race detection.
- Implementation quality.
- Scope-drift detection.
- Regression review.

**MASTER HTC PRD + current repo + explicit HTC task scope tetap source of truth.** ECC tidak boleh mengubah mapping atau memperluas scope sendiri.

## 9. Status dan Perlakuan Versi dalam Video

Pada waktu sumber direkam:

- T01–T08 = COMPLETE.
- NEXT = T09 — Public Content Delivery & Discovery Foundation.
- T09–T39 masih disebut sebagai mapping usulan sampai disetujui.

Nama final yang disarankan dalam sumber:

**HTC TRIAL — PRD & MASTER TASK MAP v3.0 — REBASED ACTUAL BUILD**

Perlakuan versi yang dijelaskan dalam sumber:

| Versi | Perlakuan dalam sumber |
| --- | --- |
| Mapping lama | Superseded / reference only |
| MASTER v2 | Historical transition baseline |
| v3.0 | Current source of truth setelah persetujuan |

Permintaan 12 Oktober 2026 memilih video ini untuk dijadikan file PRD/Task Map. Konversi ini mempertahankan isi pemetaan, tanpa membatalkan pekerjaan sesudah T08 atau mengklaim validasi teknis baru.

## Lampiran A — Konteks Sesi Terbaru, Terpisah dari Video

Bagian ini berasal dari percakapan 12 Oktober 2026, bukan dari video PRD. Gunakan untuk mencegah rollback status dan pengulangan izin.

### A.1 Status pelaksanaan

- Sesi aktif: HTC Founder/Admin Group 3.
- Pekerjaan aktif telah mencapai T13; jangan kembali ke T09 hanya karena video menuliskan NEXT.
- T13 belum dinyatakan selesai. Autentikasi native PostgreSQL masih gagal pada direct dan Session pooler; DB1 belum dijalankan.
- Tiket Supabase Support **SU-503694** telah diterima menurut bukti yang disampaikan dalam sesi.
- Verifikasi email/akun telah berhasil dengan tampilan **Account linked**. Ini bukan bukti autentikasi database berhasil.
- Penyebab penolakan password belum dibuktikan. Jangan menetapkan cache pooler atau reset persistence sebagai root cause tanpa bukti.
- Status semua tugas harus diambil dari bukti pelaksanaan aktual, bukan diasumsikan dari tabel historis.

### A.2 Target database

| Target | Identitas |
| --- | --- |
| Proyek uji | HTC-Trial-Test-DB |
| Project ref uji | `uzhkzhmncxjplrdtdzgd` |
| Protected production project | `vzkbcgfywyhtvprxpwfb` — di luar lingkup pekerjaan yang diarahkan dalam sesi ini |

DB1 telah diizinkan, tetapi tetap membutuhkan autentikasi PASS, kecocokan target, dan prasyarat SQL yang terpenuhi. Jangan mengulang batch secara buta jika hasil eksekusi tidak pasti.

### A.3 Otorisasi khusus Grup 3

Pengguna memberi izin menyelesaikan keseluruhan Grup 3 secara mandiri, termasuk tindakan dan verifikasi yang diperlukan, tanpa persetujuan berulang atau laporan rutin. Pengguna mengizinkan penyimpangan aturan kerja sebelumnya khusus untuk Grup 3. Lingkupnya mengikuti pemetaan **T12–T17**, bukan seluruh T01–T39.

Izin tidak meniadakan kebutuhan bukti validasi atau memberikan akses teknis yang belum tersedia. Full access pada Codex lokal tidak otomatis memberi chat cloud kendali atas laptop. Jangan mengklaim pekerjaan berjalan di latar belakang atau selesai tanpa bukti.

### A.4 Penggunaan oleh Codex

1. Gunakan file ini untuk nama tugas, pembagian grup, identitas produk, batas Trial, dan baseline.
2. Cocokkan dengan current repo dan kontrak tugas yang telah disetujui; gunakan kembali hasil build.
3. Lanjutkan T13 dari bukti terakhir dan tiket SU-503694; hindari probe gagal berulang tanpa perubahan relevan.
4. Untuk T14–T17, cari kontrak rinci yang tersedia. Nama tugas pada video tidak cukup untuk menyatakan suatu fitur atau acceptance criterion telah disetujui.
5. Pisahkan status historis, status aktual, dan bagian yang belum terverifikasi.

## Lampiran B — Jejak Sumber Video

Penanda waktu bersifat perkiraan karena tampilan digulir dan beberapa tabel digeser horizontal.

| Bagian | Posisi sekitar |
| --- | --- |
| Judul, status awal, product definition | 00:00–00:12 |
| Trial boundaries | 00:12–00:20 |
| System layers dan dependency | 00:20–00:32 |
| Technical baseline | 00:32–00:40 |
| T01–T08, T07A/T07B, T08 result | 00:40–01:08 |
| Group 01/02 dan rincian T09–T11 | 01:08–01:28 |
| Group 03, T12–T17 | 01:24–01:32 |
| Group 04, T18–T25 | 01:32–01:40 |
| Group 05/06, T26–T39 | 01:40–01:48 |
| Execution, ECC, status dan versi | 01:48–02:01 |

Bagian tabel baseline T01–T08 yang terpotong horizontal tidak ditranskripsi sebagai kolom fungsi aktual lengkap. Judul, status, dan rincian T07A/T07B yang terlihat telah dipertahankan. Tidak ada kontrak T14–T17 yang ditambahkan seolah-olah terlihat dalam sumber.
