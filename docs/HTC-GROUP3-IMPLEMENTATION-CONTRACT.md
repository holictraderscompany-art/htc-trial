# HTC Grup 3 — Kontrak Implementasi T12–T17

Tanggal: 12 Oktober 2026. Pendamping `HTC-TRIAL-PRD-TASK-MAP-v3.0.md`.

## Kedudukan dan otorisasi

Nama dan pembagian tugas berasal dari video PRD pengguna: Grup 3 = T12–T17. Rincian di bawah merupakan kontrak operasional minimal yang diturunkan dari pemetaan tersebut, baseline content/asset yang sudah tersedia, dan izin pengguna untuk menuntaskan Grup 3 secara mandiri. Rincian ini bukan transkrip spesifikasi terperinci dari video.

Pengguna mengizinkan seluruh tindakan yang diperlukan dalam Grup 3, verifikasi, dan keputusan implementasi tanpa persetujuan berulang. Aturan persetujuan sebelumnya dapat dikesampingkan khusus lingkup tersebut. Commit/push dan deployment trial diperbolehkan jika diperlukan dan tervalidasi. Tidak diperlukan laporan rutin. Jangan memperluas ke grup lain atau proyek produksi yang dilindungi.

## Konteks wajib

- Repo: `holictraderscompany-art/htc-trial`; cocokkan remote dan workspace sebelum mengubah file.
- Stack: Next.js, PostgreSQL/Supabase, Supabase Auth + Google OAuth, private Supabase Storage, Vercel.
- Founder tunggal: `holictraderscompany@gmail.com`, dengan otorisasi server/database; email di UI saja bukan kontrol keamanan. Semua akun lain USER.
- Content lifecycle existing: `DRAFT / RELEASED / WITHDRAWN`.
- Asset existing: `trial_assets`, private bucket `trial-assets`, state `PENDING / READY / DELETING`.
- Content/asset relation existing: `trial_content_assets`, role `PRIMARY / THUMBNAIL / ATTACHMENT`, READY-only attachment, linked-delete protection, uniqueness/integrity guards.
- Gunakan kembali fondasi T03/T04/T06/T07A/T07B/T08 dan aplikasi yang telah dibangun. Jangan membangun schema, lifecycle, auth, storage, atau arsitektur kedua.
- Trial September–Desember 2026: introductory/presentation content saja; tanpa curriculum, lessons, enrollment, quizzes, learning progress, atau LMS dashboard.
- Proyek uji: `uzhkzhmncxjplrdtdzgd`. Proyek produksi `vzkbcgfywyhtvprxpwfb` di luar lingkup.

## Area perubahan dan penentuan file

Ubah hanya presentation/server integration Founder/Admin, test yang relevan, dokumentasi, dan koreksi foundation minimum yang terbukti diperlukan untuk Grup 3. Pertahankan Public/User behavior dan kontrak existing. Jangan rename/reorganisasi repo atau mengubah package manager untuk kenyamanan.

Path/rute aktual tidak diketahui dalam chat ini. Pelaksana lokal harus menemukan file melalui pencarian terarah dan mencatat pemetaan aktual sekali. Jangan mengarang path atau membuat aplikasi paralel. Gunakan konvensi route, UI, validasi, error, session, dan test dari repo.

## Urutan dan pekerjaan paralel yang boleh

1. Periksa checkpoint, diff, baseline, dan bukti terakhir; jangan ulang full readiness.
2. T12 yang sudah lulus dipakai kembali. T13 diselesaikan dari checkpoint existing.
3. Selama native DB T13 tertahan, persiapkan/read-review kontrak, UI, dan test T14–T16 yang tidak membutuhkan perubahan DB; gunakan fixture yang jelas diberi label sebagai fixture. Jangan menyatakan integrasi live lulus dari fixture.
4. T14 menggunakan asset foundation dan protected shell. T15 memerlukan content workspace dan asset integration yang tervalidasi. T16 menggunakan read models/operational state existing.
5. T17 memerlukan seluruh alur T12–T16 dan bukti live yang diwajibkan kontrak DB.

## T12 — Founder/Admin Application Shell & Protected Access

Gunakan hasil T12 existing; perbaiki hanya regresi yang terbukti.

Acceptance: anonymous/USER ditolak pada UI terlindungi dan operasi server; Founder valid dapat mengakses; session kedaluwarsa/revoked ditangani; tidak ada privilege hanya dari manipulasi client/email; navigation, loading/error states berfungsi.

## T13 — Founder Content Management Workspace

Pertahankan kontrak T13 existing dan SQL DB1/DB2 yang telah direview. Minimum scope: daftar/detail content, pagination, create/update DRAFT, validasi field, serta RELEASED/WITHDRAWN read-only. Jangan memasukkan publish/withdraw atau upload ke T13.

Acceptance: akses Founder ditegakkan server-side; DRAFT dapat dibuat/diperbarui; conflict/ambiguous-save tidak menghasilkan overwrite atau duplicate buta; perubahan session tidak membocorkan data; lifecycle non-DRAFT tetap read-only. Gunakan matriks uji dan checksum SQL existing sebagai kontrak lebih spesifik.

### Hambatan DB saat ini

Tiket SU-503694 telah diterima; identitas akun terverifikasi. Direct dan Session pooler sebelumnya menolak password; root cause belum terbukti. Periksa respons teknis melalui konektor yang tersedia. Jangan meminta pengguna mengulang izin, jangan membaca/menampilkan password, dan jangan mengulang login tanpa bukti perubahan yang relevan.

DB1 telah diizinkan. Sebelum eksekusi: autentikasi native PASS, target cocok, baseline dan checksum SQL cocok, satu sesi stabil dan dua backend independen tersedia sesuai kontrak existing. Jalankan batch existing sekali tanpa auto-retry, verifikasi migration history/security, lalu DB2 dan SQL Founder sesuai urutan yang sudah direview. Jika eksekusi ambigu, periksa keadaan DB sebelum tindakan berikutnya. Izin luas tidak berarti boleh mengganti bukti native-session dengan keberhasilan konektor lain.

## T14 — Founder Media & Asset Workspace

### Objective dan scope

Sediakan workspace Founder untuk mengelola asset menggunakan T07A/T07B existing: list/detail metadata dan status; direct upload yang diotorisasi server; hasil READY; penanganan kegagalan; pemilihan dan attach/detach asset ke DRAFT menggunakan relation dan role existing; delete hanya melalui operasi foundation yang sah.

Jangan menambah transcoding, streaming/CDN, public bucket, bulk import, external media provider, schema kedua, atau editor media. Gunakan tipe/batas MIME/ukuran/path yang sudah ditetapkan; jangan menciptakan angka batas baru. Public delivery mengikuti kontrak existing.

### Acceptance

- Anonymous/USER tidak dapat list/mutate private asset melalui UI maupun endpoint.
- Upload memperoleh authorization server dan tidak mengekspos service credential.
- MIME/size/path invalid ditolak sesuai foundation; READY hanya setelah verifikasi existing berhasil.
- UI menampilkan PENDING/READY/DELETING dan hasil gagal tanpa klaim sukses palsu.
- Hanya READY dapat di-attach; role uniqueness dan relation integrity ditegakkan server/database.
- Mutasi hubungan dibatasi DRAFT; RELEASED/WITHDRAWN read-only di workspace ini.
- Asset yang masih terhubung tidak dihapus; object/metadata consistency mengikuti mekanisme existing.
- Duplicate-submit, conflict, session expiry, dan hasil upload/mutasi ambigu ditangani tanpa blind retry.

### Validation

Uji allow/deny role, MIME/size/path, upload completion/failure, READY-only attach, role conflict, detach, linked-delete refusal, dan state/error UI. Verifikasi storage integration pada proyek uji; fixture bukan bukti upload live. Hapus hanya fixture milik pengujian bila aman menurut guards existing.

## T15 — Publishing & Release Operations

### Objective dan scope

Hubungkan UI Founder ke operasi release/publish dan withdraw existing. Tampilkan state content, kesiapan asset menurut aturan foundation, hasil operasi, serta penolakan validasi/conflict. Jangan mendesain lifecycle baru, scheduling, multi-stage approval, social publishing, atau perubahan RELEASED secara langsung.

### Acceptance

- Founder dapat menjalankan transisi yang memang didukung kontrak T06 existing.
- Transition/source-state invalid dan asset belum siap ditolak server-side.
- Anonymous/USER ditolak; client tidak dapat menentukan role atau lifecycle sendiri.
- Perubahan state dan invariants dilakukan melalui mekanisme existing; UI tidak menampilkan sukses sebelum hasil terkonfirmasi.
- RELEASED yang sah terlihat di public read model; DRAFT/WITHDRAWN tidak terlihat.
- Double-submit/race/conflict/ambiguous result tidak menghasilkan transition ganda atau retry buta.
- Bila audit/history existing tersedia, hasil operasi menggunakan pencatatan tersebut; jangan membuat sistem audit baru tanpa kebutuhan yang terbukti.

### Validation

Uji transisi valid/invalid, role deny, readiness guard, conflict, refresh/readback, release visibility, dan withdraw invisibility. Jalankan concurrency/native-session checks yang diwajibkan kontrak database existing. Gunakan content fixture proyek uji; jangan menerbitkan konten produksi atau akun sosial.

## T16 — Founder Operations Dashboard & System Visibility

### Objective dan scope

Dashboard read-only untuk kondisi operasional yang benar-benar dapat dihitung dari data existing: content per lifecycle, asset per state, dan tautan ke workspace/operasi terkait. Tampilkan indikator kesiapan hanya bila sumber dan definisinya jelas. Gunakan query/read model minimal sesuai conventions repo.

Jangan menambah traffic analytics/growth dashboard, revenue, curriculum progress, monitoring infrastructure, raw log viewer, control plane administration, atau tindakan mutasi tersembunyi.

### Acceptance

- Seluruh pembacaan dilindungi otorisasi Founder server-side.
- Angka/state cocok dengan database/read model; tidak ada data dummy yang ditampilkan sebagai keadaan live.
- Empty/loading/error/stale states jelas. Sumber yang tidak tersedia ditampilkan sebagai unavailable, bukan healthy.
- Dashboard tidak mengekspos credentials, private storage paths/URLs kepada USER, atau pesan internal sensitif.
- Query bounded dan tidak memuat semua object/file untuk menghitung ringkasan; memakai index/kontrak existing.
- Navigation ke T13/T14/T15 berfungsi tanpa menggandakan operasi atau fondasi.

### Validation

Uji role deny, angka dengan fixture known-state, empty/error/stale, navigation, dan sanity query live proyek uji. Jangan menjadikan dashboard sebagai klaim seluruh layanan healthy jika pemeriksaan itu tidak dilakukan.

## T17 — Founder/Admin Validation & Release Gate

### Objective

Validasi integrasi T12–T16 dan tentukan hasil Grup 3 berdasarkan bukti, bukan hanya test count.

### Acceptance matrix wajib

| Area | Bukti yang diperlukan |
| --- | --- |
| Authorization | Anonymous/USER deny pada protected routes dan seluruh operasi; Founder allow; expiry/revocation |
| Content workspace | DRAFT CRUD, non-DRAFT read-only, pagination, validation, conflict/ambiguous save |
| Media workspace | Authorized private upload, MIME/size/path guards, READY-only relation, uniqueness, linked-delete protection |
| Publishing | Valid/invalid transitions, readiness guard, conflict/race, public visibility dan withdrawal |
| Dashboard | Ringkasan cocok, bounded reads, unavailable/error states, tanpa fabricated health |
| Database | Seluruh DB1/DB2/SQL Founder checks existing PASS; target/checksum/history/security tercatat |
| UI | Alur Founder end-to-end, responsive desktop/mobile, keyboard/labels/focus, loading/empty/error states, tanpa error JS yang relevan |
| Regression | Public/User visibility dan denial tetap benar; foundation tidak bergantung pada presentation |
| Delivery | Diff scope sesuai, secrets tidak masuk repo, build/relevant tests PASS, checkpoint dan hasil deployment bila dilakukan |

Jalankan pemeriksaan yang relevan dengan perubahan dan wajib menurut kontrak. Gunakan kembali bukti lama bila code/baseline terkait tidak berubah; jangan mengulang full test/build/UI hanya untuk menghasilkan laporan baru. Bukti fixture/synthetic diberi label dan tidak menggantikan proof live mandatory.

## Closure dan hambatan

Grup 3 selesai hanya bila T12–T17 memenuhi acceptance yang applicable dan seluruh gate wajib PASS. Catat path bukti, checksum, test result, commit/deployment identifiers jika ada, dan kondisi yang belum diverifikasi dalam checkpoint lokal. Jangan memasukkan secrets.

Jika menunggu Support, lanjutkan pekerjaan independen sesuai urutan di atas. Jangan polling email tanpa batas atau mengklaim proses background yang tidak tersedia. Jika kontrak existing bertentangan, pilih perilaku yang paling kecil dan menjaga invariants; dokumentasikan alasan. Jika prasyarat teknis mandatory tidak dapat dipenuhi, status BLOCKED disertai hambatan spesifik, bukan COMPLETE.

Tidak diperlukan izin atau laporan rutin. Beri satu pemberitahuan akhir singkat setelah selesai, atau satu pesan hanya jika tindakan pribadi pengguna benar-benar diperlukan dan tidak dapat digantikan oleh akses/tools yang tersedia.
