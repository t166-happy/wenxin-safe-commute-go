# 素材、來源及查核狀態

- 校舍、人物、道路、車輛、月台、座椅、錐鏈及植物：此專案以 Three.js 基本幾何原創生成，沒有外部模型、圖磚或貼圖下載。
- 路燈、開放式正門滑門、側門弧形門與波浪矮牆：以本機 Blender 5.2 的 `scripts/build_street_assets.py` 原創建模，匯出 `public/models/street_furniture.glb`，遊戲用 GLTFLoader 載入。可執行 `npm run model:street` 重新產生；未使用第三方模型或雲端生圖。
- 字型：使用裝置既有 Microsoft JhengHei / PingFang TC / sans-serif；無外部字型請求。圖示使用裝置的 emoji。
- 校方兩張 HEIC 照片保留於原路徑；本次已在本機解碼檢視石材鋪面、左側草地與棕櫚、中央交通錐及右側小型接駁車。未直接作為網頁素材，未公開人臉或車牌。照片未見連續鏈條；遊戲鏈條是 V2.4 安全定案配置，不宣稱照片現況已有鏈條。
- 2026-11-03 新增 `picture/` 的 33 張 JPG 已逐張檢視縮圖並選取正、側門照片細看；照片特徵與使用界線見 `docs/PHOTO_REFERENCE.md`。原照與含學生縮圖均不進入 `public/` 或正式建置，`picture/` 在 `.gitignore` 中。側門及路口的精確相對位置仍待現勘核實。
- [校方交通安全網站：校園人車動線與停車規範](https://sites.google.com/mail.happy.tyc.edu.tw/wesestraffic/%E4%B8%89%E4%BA%A4%E9%80%9A%E5%AE%89%E5%85%A8%E8%88%87%E8%BC%94%E5%B0%8E/3-2-%E6%A0%A1%E5%9C%92%E4%BA%BA%E8%BB%8A%E5%8B%95%E7%B7%9A%E8%88%87%E5%81%9C%E8%BB%8A%E8%A6%8F%E5%8A%83)：公開鄰近區域圖顯示學校四周道路，步行、校車、汽車、機車接送採不同示意動線。遊戲只借用分區原則，沒有複製圖片；東、西側遊戲座標、實際格位與停靠線均未核實。
- [文欣國小網站](https://www.weses.tyc.edu.tw/)及 [Google 地圖搜尋文欣國小](https://www.google.com/maps/search/%E6%96%87%E6%AC%A3%E5%9C%8B%E5%B0%8F)：本次查看公開街景與校方校舍照片，據外觀重建校名牆、金屬門、警衛室、淺色綠黃立面與棕櫚；幾何物件均為原創，未複製街景圖像。
- 校車外停、安親班接駁內停：來源為 `CODEX_PICKUP_LOCATION_CORRECTION_V2_4.md`，屬本次使用者明確場景要求；非經實測核定的現場工程配置。
- 復興北路側門、校園四周圍牆與上學開放入口、正門兩側汽車接送黃線示意區、正門及側門口機車接送：2026-11-03 使用者在本對話補充。正門朝校內看左側樹蔭步道、右側安親班車亦由使用者確認。遊戲採相對配置，沒有測量座標或把黃線描寫為無條件合法臨停；實際停靠、開門時段、號誌與行穿線需現勘和校方核定。
- 2026-11-04 使用者進一步確認：汽車為家長上學送學，學生從車內下車後沿人行道過馬路，須觀察後方來車並避免久佔臨停；正門與側門機車送學須依序停妥、學生安全下車，避免與正門兩側汽車臨停混流。此為遊戲流程與相對分區依據；具體合法停車條件、格位與管制仍待現地核實。
- 安全教學流程：`SAFETY_FEEDBACK_V2_3.md` 及 `CHAIN_BARRIER_FINAL.md`。正式法規及營運單位來源尚待校內承辦審核，所有遊戲點位、尺寸、時序均標示教學示意。
- 技術參考：[Three.js 官方文件](https://threejs.org/manual/pages/creating-a-scene.html)、[Vite 官方指南](https://vite.dev/guide/)。已於 2026-11-02 查閱；套件版本以 package-lock.json 為準。
- Three.js：MIT；Vite：MIT；TypeScript：Apache-2.0；Vitest：MIT；Playwright：Apache-2.0；ESLint：MIT。安裝套件的完整授權位於各套件 LICENSE。
- 遊戲執行時沒有連接 Google Maps、第三方分析、雲端資料庫或需要金鑰的服務；外部頁面僅用於人工查核。

`data/places.json` 與 `data/routes.json` 保存待核來源；不得直接將教學路線解讀為真實通學建議。此版核心場景在 `src/data/scenarios.ts`，與 routes 的停靠設定有測試交叉驗證。
