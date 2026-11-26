# GTA ALACA CITY

Tokat Merkez, **Rüstem Çelebi Mahallesi, Ankara Sokak 2. Geçit** mevkiindeki tarihî **Alaca Mescit Camii** ve çevresindeki yaklaşık 50 metre çaplı gerçek sokak dokusunu temel alan, tarayıcıda oynanabilir 3D üçüncü şahıs açık dünya mini oyunu.

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ (önerilen 20+) ve npm

### Geliştirme Sunucusu
```bash
npm install
npm run dev
```
Ardından tarayıcıda `http://127.0.0.1:5173` adresini açın.

### Üretim Derlemesi ve Önizleme
```bash
npm run build
npm run preview
```

### Görsel ve Oynanış Doğrulama Betiği (Chrome + Playwright)
```bash
node scripts/verify.mjs
```

## Kontroller

### Masaüstü
- **W A S D / Ok Tuşları:** Hareket
- **Fare (Tıklayarak İşaretçi Kilidi):** Kamera kontrolü
- **Shift:** Koşma
- **Space:** Zıplama
- **E:** Etkileşim (Ev 1 kapısını aç/kapat, aydınlatma aç/kapat, Alaca Çeşme'den su iç)
- **1 / 2 / 3 / 4:** Silah seçimi (Yumruk, Bıçak, Tabanca, Tarama Silahı)
- **Sol Tık:** Saldırı / Ateş
- **R:** Şarjör değiştirme
- **Escape:** Duraklatma ve ayarlar menüsü

### Mobil (Dokunmatik Cihazlar)
- **Sol Sanal Joystick:** Hareket
- **Sağ Ekran Alanı:** Dokunmatik kamera çevirme
- **Sağ Alt Düğmeler:** Ateş / Vur, Saldır, Zıpla, Koş, Etkileşim, Silah, Şarjör, Tam Ekran

## Mimari Yapı
- `src/GameManager.ts` — Ana oyun döngüsü, durum yönetimi ve hata ayıklama/doğrulama kancaları
- `src/data/osmLayout.ts` — OpenStreetMap koordinatlarının yerel metre sistemine dönüşümü
- `src/textures/ProceduralPBR.ts` — Moloz taş, kesme taş, almaşık tuğla, Selçuklu minare tuğlası, alaturka kiremit, ahşap, sıva, kaldırım ve kilim PBR dokuları
- `src/world/MosqueBuilder.ts` — Alaca Mescit Camii, Selçuklu minaresi, avlu, şadırvan ve Alaca Çeşme 3D modeli
- `src/world/FirstTwoHousesBuilder.ts` — Caminin solundaki ilk iki özel bina (Ev 1 tam gezilebilir 2 katlı konut + Ev 2 özgün mimari konut)
- `src/world/NeighborhoodBuilder.ts` — OSM yol geometrileri, çevre Tokat yapıları, ağaçlar ve sokak objeleri
- `src/systems/` — `InputManager`, `ThirdPersonCamera`, `PhysicsManager`, `PlayerController`, `WeaponManager`, `NPCManager`, `CatManager`, `InteractionManager`, `AudioManager`, `PerformanceManager`, `UIManager`
