# Credits – Xe Buýt Sài Gòn

Game code, all icons (js/icons.js) and on-map bus sprites: original work made for this project.

- **Dữ liệu tuyến & trạm xe buýt** — OpenStreetMap (Overpass API): tuyến, trạm và ranh giới hành chính TP.HCM (relation 1973756) — © OpenStreetMap contributors — License: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) — Source: https://www.openstreetmap.org/copyright
- **Nền bản đồ** — Vector tiles OpenFreeMap (OpenMapTiles schema), kiểu bản đồ tối giản tự thiết kế — OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors — License: [Free, no key; attribution required (data ODbL)](https://openfreemap.org/) — Source: https://openfreemap.org/
- **Hiển thị bản đồ** — MapLibre GL JS 4.7.1 — MapLibre contributors — License: [BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) — Source: https://maplibre.org
- **Ảnh xe buýt nhỏ** — (VNM-Ho Chi Minh City) Hop Tac Xa Van Tai 19-5 51B-323.20 19 2025-10-05.jpg — S5A-0043 — License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) — Source: https://commons.wikimedia.org/wiki/File:(VNM-Ho_Chi_Minh_City)_Hop_Tac_Xa_Van_Tai_19-5_51B-323.20_19_2025-10-05.jpg — File: `assets/bus-mini.jpg` (Resized to 500px width)
- **Ảnh xe buýt thường** — (VNM-Ho Chi Minh City) SaigonBus 50H-365.23 06 2025-10-04.jpg — S5A-0043 — License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) — Source: https://commons.wikimedia.org/wiki/File:(VNM-Ho_Chi_Minh_City)_SaigonBus_50H-365.23_06_2025-10-04.jpg — File: `assets/bus-std.jpg` (Resized to 500px width)
- **Ảnh xe buýt CNG (minh họa)** — (VNM-Ho Chi Minh City) Citranco 51B-165.68 72 2025-10-05.jpg — S5A-0043 — License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) — Source: https://commons.wikimedia.org/wiki/File:(VNM-Ho_Chi_Minh_City)_Citranco_51B-165.68_72_2025-10-05.jpg — File: `assets/bus-cng.jpg` (Resized to 500px width)
- **Ảnh xe buýt điện** — (VNM-Ho Chi Minh City) Vinbus 50F-017.44 D4 2025-10-05.jpg — S5A-0043 — License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) — Source: https://commons.wikimedia.org/wiki/File:(VNM-Ho_Chi_Minh_City)_Vinbus_50F-017.44_D4_2025-10-05.jpg — File: `assets/bus-ev.jpg` (Resized to 500px width)
- **Ảnh xe buýt 2 tầng** — HCMC double-decker bus.jpg — Dragfyre — License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) — Source: https://commons.wikimedia.org/wiki/File:HCMC_double-decker_bus.jpg — File: `assets/bus-dd.jpg` (Resized to 500px width)
- **Bộ icon & hình xe trên bản đồ** — Xe Buýt Sài Gòn icon set (js/icons.js) — Tự thiết kế cho game này (SVG viết tay) — License: Original work

## v3
- **Tìm đường cho tuyến tự tạo**: OSRM demo server (https://project-osrm.org/), phần mềm BSD-2-Clause, dữ liệu © OpenStreetMap contributors (ODbL). Nếu không kết nối được, game nối thẳng giữa các trạm.
- **Âm thanh & nhạc nền**: tạo hoàn toàn bằng code WebAudio trong game, không dùng file âm thanh có bản quyền.
- **Icon mới (tài xế, bãi xe, nhiệm vụ, ngân hàng, đối thủ, thời tiết…)**: tự thiết kế dạng SVG trong `js/icons.js`.

## v4 – Góc nhìn trong xe
- **Ảnh đường phố thật**: [Mapillary](https://www.mapillary.com), ảnh do cộng đồng chụp, giấy phép [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Tên người chụp và link ảnh gốc hiện ngay trên ảnh trong game. Game dùng client token công khai của Mapillary (đúng cách Mapillary thiết kế cho web app).
- **Nhà 3D**: lớp building OpenMapTiles qua OpenFreeMap, © OpenStreetMap contributors (ODbL).
- **Cabin tài xế, cửa sổ ghế khách, vô lăng, đồng hồ, mưa trên kính, cần gạt, chuông báo trạm**: tự vẽ bằng SVG/CSS/Canvas và WebAudio.
