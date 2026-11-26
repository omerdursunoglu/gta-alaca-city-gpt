# Kaynaklar ve Lisanslar (SOURCES_AND_LICENSES)

Bu proje sıfır telifli/izinsiz varlık ilkesiyle hazırlanmıştır. Google Maps, Google Earth, Street View veya Rockstar Games'e ait hiçbir model, görsel, müzik veya harita verisi kullanılmamıştır.

## 1. Coğrafi ve Harita Verileri
- **Kaynak:** OpenStreetMap (https://www.openstreetmap.org/)
  - `way/1372898868` — Alaca Mescit Camii merkez ve ayak izi (`40.3160942°N, 36.5445737°E`)
  - `way/512487039` — Sulusokak Caddesi
  - `way/667264421` — Ankara Sokak (Güney aksı)
  - `way/667264414` — Kuzey ara sokak (Ankara Sokak 2. Geçit bağlantısı)
  - `way/731868623` — Cami batı yaya geçidi
  - `way/667264412` — Doğu bağlantı sokağı
  - `way/186285280` — Sulusokak güneydoğu yapı ayak izi
- **Lisans:** Open Data Commons Open Database License (ODbL 1.0) — `© OpenStreetMap contributors` (https://www.openstreetmap.org/copyright).

## 2. Tarihî ve Mimari Kaynaklar
- **T.C. Kültür ve Turizm Bakanlığı — Kültür Portalı:**
  - *Alaca Mescit Camii (Tokat Merkez)*: https://kulturportali.gov.tr/turkiye/tokat/kulturenvanteri/alaca-mescit-camii
  - Yapım ve onarım tarihleri (H.700 / M.1300, 1505-1506 II. Bayezid dönemi yenilemesi, 1939 minare onarımı, 1952 son cemaat yeri onarımı), malzeme ve kütle düzeni referans alınmıştır.
- **Tokat Turizm Tanıtma Derneği (TUDER):**
  - *Alaca Mescit ve Alaca Mescit Çeşmesi (Tokat)*: https://tokattuder.com/2025/07/10/alaca-mescit-ve-alaca-mescit-cesmesi-tokat/
  - Kuzey cephedeki üç sivri boşaltma kemeri, gri-kurşuni mermer basık kemerli giriş kapısı, batı cephedeki 3 sıralı almaşık tuğla örgüsü, doğu/güney/batı pencere düzeni, Selçuklu minare gövdesindeki baklava / köşeli S / ters Z / balık sırtı tuğla kuşakları, avlu şadırvanı ve H.670 (1271) tarihli Alaca Çeşme konumu bu kaynaktan doğrulanmıştır.

## 3. 3D Modeller, Dokular, Sesler ve Yazılım Kütüphaneleri
- **3D Modeller:** Tüm mimari geometriler, karakterler, kediler, silahlar ve mobilyalar bu proje kapsamında `Three.js` ile prosedürel olarak üretilmiştir. (Lisans: MIT / proje içi özgün üretim).
- **PBR Dokular:** `src/textures/ProceduralPBR.ts` içinde HTML5 Canvas 2D API ile çalışma zamanında üretilen özgün albedo, normal ve roughness dokuları (harici telifli fotoğraf kullanılmamıştır).
- **Ses Efektleri ve Ambiyans:** `src/systems/AudioManager.ts` içinde Web Audio API ile gerçek zamanlı sentezlenen özgün ses efektleri (telif veya harici ses dosyası içermez).
- **Three.js (`^0.170.0`):** MIT Lisansı.
- **Vite (`^6.0.3`) & TypeScript (`^5.6.3`):** MIT / Apache-2.0 Lisansları.
