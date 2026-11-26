# Varlık Envanteri (ASSET_MANIFEST)

Bu projedeki tüm 3D varlıklar, malzemeler ve sesler harici indirme gerektirmeden kod içinde modüler olarak üretilmektedir.

## 1. Başlıca Mimari Varlıklar
- **`AlacaMescitCamii`** (`src/world/MosqueBuilder.ts`)
  - Kare planlı harim kütlesi (`moloz taş` beden duvarları, `kesme taş` köşe taşları ve saçak silmeleri, batı cephede 3 sıralı `almaşık` tuğla örgüsü)
  - Sekizgen kesme taş kubbe kasnağı, kemerli kasnak pencereleri, kiremit kaplı konik külah ve pirinç alem
  - Kuzey 3 bölümlü son cemaat yeri (3 sivri boşaltma kemeri, gri-kurşuni mermer basık kemerli taç kapı, kanatlı ahşap kapı, demir şebekeli pencereler, merkez kubbe + yan tonoz örtüler)
  - Kuzeybatı Selçuklu minaresi (çokgen kesme taş kaide, pahlı pabuç, 4 katmanlı geometrik tuğla gövde: baklava, S kuşağı, ters Z kuşağı, balık sırtı; bindirmeli şerefe, petek, kurşun külah ve alem)
  - Kuzey avlu, taş çevre duvarları, sivri kemerli avlu girişi, ahşap çatılı sekizgen şadırvan ve kuzey sokak cephesinde tarihî Alaca Çeşme
- **`House1_Enterable` (Ev 1 — Cami Solundaki İlk Ev)** (`src/world/FirstTwoHousesBuilder.ts`, `src/world/InteriorDetailsBuilder.ts`)
  - 2 katlı, tam gezilebilir Tokat geleneksel konutu (gerçek duvar kalınlıkları, açılır-kapanır menteşeli ön kapı, şeffaf pencereler)
  - Zemin kat: taşlık/ahşap zemin, yemek masası, 4 sandalye, konsol, abajur, Türk kilimi, 14 basamaklı çıkılabilir ahşap merdiven
  - Üst kat: ahşap eliböğründeli çıkma (cumba), cumba sediri, sehpa, dolap, tablo, ahşap tavan kirişleri, merdiven boşluğu korkuluğu, yatak ve yatağa uzanıp akıllı telefondan film izleyen (yüzüne telefon ışığı vuran) NPC
- **`House2_Enterable` (Ev 2 — Cami Solundaki İkinci Ev)** (`src/world/FirstTwoHousesBuilder.ts`, `src/world/InteriorDetailsBuilder.ts`)
  - 2 katlı, tam gezilebilir özgün tasarım: kesme taş zemin, açılır sol giriş kapısı, sağ kemerli dekoratif kapı, pişmiş toprak sıvalı ikinci kat, sol ferforje korkuluklu balkon, sağ ahşap cumba, yeşil panjurlar, çatı pencereli beşik kiremit çatı ve 14 basamaklı çıkılabilir ahşap merdiven
  - Üst kat: beyaz RGB LED kenarlı oyun masası, geometrik beyaz metal sol ayak, 3 çekmeceli beyaz keson, masa altı adaptör/kablo, monitör kolu ve geniş ekran monitör, gri deskmat, beyaz mekanik klavye ve beyaz fare, panoramik camlı beyaz kasa (içinde beyaz sıvı soğutma pompası/boruları, 3 dikey fan ve ekran kartı), gri-siyah Rampage tarzı oyuncu koltuğu, desenli Türk halısı, yatak ve yatakla bilgisayar arasında gidip gelen yakışıklı NPC
- **`TokatNeighborhood`** (`src/world/NeighborhoodBuilder.ts`)
  - 13 adet farklı yükseklik/çatı/cephelere sahip çevre Tokat konutu
  - OSM poligonlarına dayalı Sulusokak Caddesi, Ankara Sokak, Ankara Sokak 2. Geçit ve yaya geçidi
  - Dallı Anadolu ağaçları, instanced sokak lambaları, çöp kutuları, saksılar ve Türkçe sokak tabelaları

## 2. Karakterler, Hayvanlar ve Silahlar
- **Oyuncu Karakteri** (`src/systems/PlayerController.ts`): Eklemli 3D insan modeli (yürüme, koşma, zıplama, yakın dövüş ve nişan alma animasyonları)
- **6 Sokak NPC'si** (`src/systems/NPCManager.ts`): Farklı kıyafet/şapka/boy varyasyonlarıyla sokakta gezen, çarpışmadan kaçınan ve silahlara tepki veren yayalar
- **3 Sokak Kedisi** (`src/systems/CatManager.ts`): Dört ayaklı, eklemli kuyruklu ve başlı anatomik modeller (sarı tekir, siyah-beyaz smokin, gri tekir; yürüme, oturma, temizlenme, kaçma ve yaklaşma durumları)
- **4 Silah** (`src/systems/WeaponManager.ts`): Yumruk, Bıçak, Tabanca (12'lik şarjör), Tarama Silahı (30'luk şarjör)

## 3. Prosedürel PBR Dokular ve Sesler
- **Dokular (`src/textures/ProceduralPBR.ts`):** `rubbleStone`, `cutStone`, `almasikBrickStone`, `seljukMinaretBrick`, `kiremitRoof`, `agedTimber`, `plaster`, `cobblestone`, `courtyardFlagstone`, `asphalt`, `kilimRug`
- **Sesler (`src/systems/AudioManager.ts`):** Sokak ambiyansı, iç mekân ambiyansı, taş/ahşap ayak sesi, kapı sesi, çeşme su sesi, yumruk/bıçak/tabanca/tarama/şarjör sesleri, NPC tepki tonu, kedi miyavlaması
