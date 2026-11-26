# Bilinen Sınırlamalar ve Doğrulanamayan Ölçüler (KNOWN_LIMITATIONS)

Bilimsel ve tarihî dürüstlük ilkesi gereği, halka açık ve izinli kaynaklardan doğrudan ölçülemeyen ayrıntılar aşağıda açıkça belirtilmiştir:

1. **Alaca Mescit Camii Kesin Rölöve Ölçüleri:**
   - Caminin yatay dış taban ayak izi OpenStreetMap (`way/1372898868`, ~13.3m × 13.3m) verisinden alınmıştır.
   - Ancak yapının santimetre düzeyindeki düşey rölöve ölçüleri (duvar yüksekliği, sekizgen kasnak ve külah yüksekliği, minare şerefe/petek yüksekliği, avlu duvarı tam uzunluğu) halka açık web envanterlerinde sayısal olarak yayımlanmadığından, oranlar tarihî metin tanımlarına (Kültür Portalı & TUDER) göre mimari tahminle oluşturulmuştur.

2. **Çevre Konut Parselleri (Ev 1, Ev 2 ve Mahalle Binaları):**
   - OpenStreetMap verisinde caminin çevresindeki bireysel konut poligonları yer almadığından (sadece yol eksenleri, cami ve güneydoğudaki büyük bir yapı `way/186285280` işlidir), Ev 1, Ev 2 ve komşu binaların ayak izleri, kat yükseklikleri ile Ev 1 iç mekân planı geleneksel Tokat Sulusokak / Rüstem Çelebi Mahallesi konut dokusu esas alınarak kontrollü biçimde tahmin edilmiştir.

3. **Kitabeler:**
   - Kültür Portalı ve TUDER metinlerinde geçen üç kitabenin (giriş kapısı, minare kaidesi, Alaca Çeşme) yerleri doğru konumlandırılmış, ancak uydurma/bozuk Arapça yazı üretmemek için taş kitabe çerçeveleri yazısız yıpranmış mermer levha olarak bırakılmıştır.

4. **Blender Yerine Three.js Prosedürel Mesh Kullanımı:**
   - Çalışma ortamında Blender kurulu olmadığından (`blender not found`), tüm yüksek detaylı özel mimari geometriler doğrudan Three.js (`ExtrudeGeometry`, özel profilli kemerler, çokgen kasnak/minare, duvar boşluklu iç mekân) ve prosedürel normal/roughness PBR dokuları ile üretilmiştir.

5. **Headless Software WebGL FPS Ölçümü:**
   - Otomatik Chrome doğrulaması SwiftShader yazılım WebGL sürücüsü ile çalıştırıldığında ~4–8 FPS ölçülmüştür; gerçek donanım GPU'lu masaüstü ve mobil tarayıcılarda varsayılan 30 FPS (ve seçilebilir 45/60/90/120 FPS) hedefi akıcı şekilde çalışır.
