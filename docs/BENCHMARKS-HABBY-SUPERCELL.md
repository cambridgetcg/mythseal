# Habby 與 Supercell：新手流程與遊戲設計對照 · 2026-10-21

**狀態：** 第 1–5 節是 `record · 2026-10-21`（公開資料考據，所有來源均於 2026-10-21 讀取）；第 6–8 節的 Mythseal 判斷與候選工作包是 `proposal · 2026-10-21`。沒有實作、合併或部署任何東西。Mythseal 程式碼引用以 `main` `3f3d351` 為準；`t1:` 開頭的引用指 `t1/first-visit-hints`（draft PR #18）已推送的 `0675b08` 上的檔案。本分支自己也改了 ROADMAP，所以 ROADMAP 引用用章節錨點與段落名，而不用行號：行號在合併時會再移動。Owner 於 2026-10-21 回答了第 8 節的七項決定，答案以「已答」記在各題之下；第 1 節的前提表同日加了一行。

Owner 於 2026-10-21 提出：研究 Habby 與 Supercell 的 onboarding 流程與局內設計，並以這兩家公司為參照，把多語言支援列入路線圖。多語言部分另見 [I18N-PLAN.md](I18N-PLAN.md)；本文只在第 4 節第 10 點提及兩家的上架語言時序。

**檔案位置：** `docs/` 沒有 `research/` 子目錄，現有研究文件（[RESEARCH.md](RESEARCH.md)、[EXPERIENCE-LESSONS.md](EXPERIENCE-LESSONS.md)、[NAMING.md](NAMING.md)）都放在 `docs/` 頂層。為一份文件新增子目錄會開一個新的版面慣例，所以放在 `docs/BENCHMARKS-HABBY-SUPERCELL.md`。

## 0. 方法與限制

- **沒有玩過任何一款遊戲，也沒有截圖。** 所有內容來自文字：商店頁面、Apple iTunes Lookup API、官方網站與部落格、新聞與分析稿、玩家 wiki（Fandom 頁面經 MediaWiki API 讀取）。
- **證據分層：** 第一方（官方網站、商店頁、開發者受訪原話）、媒體／分析、玩家／wiki、推論。廠商自己寫的案例（Keywords、CaptionHub、Hanyi、Vasava）、付費刊登（PocketGamer.biz 2018 的 Habby 稿）與匿名 Substack 拆解，在表內照實標明，不當作獨立分析。
- **只採用經第二輪覆核的說法。** 覆核判為 confirmed 的照用；判為 corrected 的用更正後的寫法；判為 unverifiable 或被推翻的，只出現在第 9 節「本次未確立」。
- **逐分鐘首局是重建。** 兩家都沒有公開計時的首局紀錄（唯一例外是 Archero 2 教學約 28 秒，屬媒體轉述的分析數字，量法未公開）。Clash Royale 的首局步驟來自 wiki，wiki 頁面之間亦有矛盾，見 3.2。
- **遊戲常改。** 每項觀察都附上來源日期；2019–2024 的 wiki 或拆解不代表 2026 年的版本。
- **引用：** 以自己的話概括；每個來源最多一句少於 15 字的原文。

## 1. 先說清楚 Mythseal 的位置

兩家公司都是商業手遊公司，Mythseal 不是。比較之前先列出會改變判斷的前提：

| Mythseal 前提 | 出處 | 對比較的影響 |
| --- | --- | --- |
| 免費遊戲，沒有營收、獲客、留存、產出或學習指標；商業化已退役 | [ROADMAP](../ROADMAP.md#freely-chosen-game-direction) 第 7–13 行；[AGENTS.md](../AGENTS.md) | 為留存或付費而設計的節奏（多日解鎖序列、首購禮包）沒有存在理由 |
| 2026-10-21：owner 認為逼人課金不太道德，並表示想走交易、NFT 與 trading card 的路線；要先弄清楚的是怎樣打通區塊鏈玩法、登入與授權流程（auth flow），以及實際交易的 gas 費怎樣處理。這三個問題由 `research/trading-chain` 分支研究，有答案之前不作任何決定；ROADMAP 2026-09-23 的「商業化已退役」照寫仍然有效 | owner 2026-10-21；[ROADMAP](../ROADMAP.md#retired-collectible-launch-phases) | 不論研究結果如何，2.4 與 3.5 點名的壓力手法都不採用；本文的判斷以上一行的現行前提為準 |
| 沒有 IAP、廣告、體力；卡包只用賺得的金幣；包率在遊戲內公開 | `adventure-ui.mjs:63`；`progression.mjs:56`；[PROGRESSION](PROGRESSION.md) 第 72 行；[CAMPAIGN-AND-EVENTS](CAMPAIGN-AND-EVENTS.md) 第 107 行 | 兩家的營利壓力手法逐項點名，但不建議採用 |
| 不做倒數、near-miss、稀缺倒計時 | [WX01-DROP-RATES](WX01-DROP-RATES.md) 第 320–322 行；[ROADMAP M4](../ROADMAP.md#m4--grow-the-game-presentation-and-competitive-play) 的 LZ-E 項 | 同上 |
| 沒有遙測：手機版私隱頁草稿寫明沒有帳號、廣告、分析或追蹤 | `privacy.html:31,39` | 兩家用 A/B 測試與留存數據調 onboarding；Mythseal 的評估途徑是真人試玩（[ROADMAP M4](../ROADMAP.md#m4--grow-the-game-presentation-and-competitive-play) 的 Acceptance 段與 First battle teaching (D3) status 段） |
| 新內容提供不同的抉擇或故事，而不是另一張每日必做清單（DN6）；探索要誠實（DN7）；跳過不改獎勵（DN2） | [EXPERIENCE-LESSONS](EXPERIENCE-LESSONS.md#player-facing-design-notes) | 判斷「合用與否」的主要尺 |
| AI 只用公開資訊；公平模式用基礎數值 | [DESIGN](DESIGN.md) 第 94、100–121 行 | 調低首戰難度只能改 AI 的出手方式，不能讓它偷看 |

## 2. Habby

Habby 的旗艦作（Archero、Survivor!.io、Capybara Go!、Archero 2、Wittle Defender）在其官網時間線上都由 Gorilla Games 開發（[habby.com 網站程式包](https://habby.com/static/js/main.88428cfc.chunk.js)，2026-10-21 讀取，第一方）。

### 2.1 公司自述的設計取向

| 說法 | 來源與日期 | 層級 |
| --- | --- | --- |
| 官網標語是 "Make Fun, Make Sense"；網站另有一段明確反對抄襲他人創意 | [habby.com 程式包](https://habby.com/static/js/main.88428cfc.chunk.js)，2026-10-21 | 第一方 |
| CEO 王嗣恩把 Habby 定位為「中度休閒」，追求長壽遊戲；設計逐步演化而非整套照搬；每月出新內容；新項目從單局玩法出發；不設硬付費牆，免費玩家可靠看廣告或等待推進 | [白鯨出海，2023-07-28](https://www.baijing.cn/article/45250)（報道 2023-07-27 的演講） | 媒體轉述 CEO |
| 保留廣告收入的一個理由，是避免設計被付費深度牽著走；廣告佔比有時低於 10%（同文亦提 10–20%） | 同上 | 媒體轉述 CEO |
| 早期作品（如 Archero）本地化不細；從 PunBall 起按地區調整；現在的本地化包括翻譯、跨文化玩家溝通與社群營運 | 同上 | 媒體轉述 CEO |
| BizDev 主管 David Pan：試營運最看留存；用數據平衡解鎖節奏；玩家選錯技能不應被重罰；廣告素材要忠於實際玩法 | [Gamigion 訪談](https://www.gamigion.com/?p=20716)；頁面只寫 8 月 13 日，按文中線索推斷為 2025 年 | 第一方（受訪） |
| 2018 年公司稿：想要吸引人「但不是負面地上癮」的原創遊戲，並向合作工作室提供本地化等服務 | [PocketGamer.biz，2018-03-20](https://www.pocketgamer.biz/asia/profile/67777/new-mobile-publisher-habby-on-the-hunt-for-indie-games/)，署名 Guest Author (Sponsored) | 付費刊登，等同公司口徑 |
| 分析稱 Archero 為 hybridcasual 定下規則 | [Deconstructor of Fun，2025-07-31](https://www.deconstructoroffun.com/blog/2025/7/31/habbys-hybridcasual-empire-the-template-that-built-a-powerhouse) | 分析 |

### 2.2 首局與早期（重建，非計時）

| 作品 | 首局做了什麼 | 早期解鎖與節奏 | 來源與日期 |
| --- | --- | --- | --- |
| **共通模板** | 單鍵操作；第一局之後，主選單唯一開放的系統是被動升級 | 功能在「多日的遊玩」中逐步開放，營利與 live-ops 系統最後才開；SSSnaker 把前作第一局就有的裝備升級移到約第 4 天 | [Mobilegamer.biz，2023-03-29](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/)（引述顧問 Jakub Remiar）· 分析 |
| **Archero**（2019） | 移動時自動射擊最近的敵人；升級時從約 50 種能力中三選一；每關等級上限 11；房間有天使、惡魔（以生命換能力）、Boss 前回血箱與 Boss 轉盤 | 英雄於 v1.2.0（Android 2019-08-23）起需「到達 2-1」；Hero Mode 於 v1.1.4（2019-07）在 4-25 開放；Battle Pass 2019-09-10 上線，第 2 章第 26 關開放 | [DoF，2019](https://www.deconstructoroffun.com/blog/2019/8/9/why-archero-banked-25m-but-leaves-25m-hanging-hlx9n) · 分析；[Archero wiki 版本史](https://archero.fandom.com/wiki/Version_History)（最後編輯 2021-04-16）· wiki |
| **Archero** 的「不靠文字教」 | 敵人形狀、大小與走位各異；攻擊的速度、前搖與強度各異；傷害越大數字越大 | — | [DoF，2019](https://www.deconstructoroffun.com/blog/2019/8/9/why-archero-banked-25m-but-leaves-25m-hanging-hlx9n) |
| **Survivor!.io**（2022） | 第 1 章 15 分鐘、3 個 Boss；預設武器自動瞄準；6 主動＋6 被動技能，每關重置，特定被動可進化滿級主動 | 約每 5 分鐘一個 Boss，戰區封閉並有提示；公會在第 3 章後開放 | [Survivor.io wiki](https://survivorio.fandom.com/wiki/Chapter_1_-_Wild_Streets)（2026-06-24 版）；[Naavik，2022-10-20](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)；[wiki Clan](https://survivorio.fandom.com/wiki/Clan) |
| **Survivor!.io** 的教學評價 | Common Sense Media 評 v1.5.3：幾乎沒有說明但相當直覺；整體目標與寶石貨幣沒有解釋清楚；廣告是選擇性的 | — | [Common Sense Media，2022-10-18 更新](https://www.commonsensemedia.org/app-reviews/survivorio) · 評測 |
| **Capybara Go!**（2024） | 商店稱之為文字 roguelike：按一個鍵推進一「天」，隨機事件給增益或懲罰 | 一章花 5 體力，要撐 60 天，失敗則重來（除非復活）；裝備欄在第 1 章後開放 | [App Store](https://apps.apple.com/us/app/id6596787726)，2026-10-21；[Pocket Gamer，2024-11-05](https://www.pocketgamer.com/ahead-of-the-game/capybara-go)；[MuMuPlayer 指南，2025-01-20](https://www.mumuplayer.com/blog/capybara-go-beginners-guide.html)（模擬器廠商的推廣文） |
| **Archero 2**（2025） | 教學兼作第 1 章；Sensor Tower 計算約 28 秒（量法未公開）；一個搖桿，站定才攻擊；每一關以轉盤與祝福選擇開始 | 主畫面起初很空，到第 9 關功能齊全；首個新手活動 Carnival I；主畫面出現 FTUE 優惠 | [WN Hub，2025-01-20](https://wnhub.io/news/other/item-46839)；[AppMedia，2026-06-05](https://appmedia.jp/archero2/78502679)；[匿名 Substack 拆解，2024-11-11](https://someselectedstories.substack.com/p/tiny-teardown-archero-2-habby-games)（軟啟動版本） |
| **Dicero!**（2026） | 骰子回合制 roguelite；新手引導只解釋基本操作；商店文案承諾沒有複雜教學 | 沿用 6 格裝備與天賦抽取 | [虎嗅，2026-03-11](https://www.huxiu.com/article/4841231.html)（單一評測者）；[App Store](https://apps.apple.com/us/app/id6740966864)，2026-10-21 |

**留存數字（只作背景）：** 兩個月時 Archero D1/D7/D30 為 49/23/11%，Survivor!.io 為 44/15/4%（data.ai，經 [Mobilegamer.biz，2022-10-21](https://mobilegamer.biz/two-months-in-survivor-io-passes-75m-from-37m-downloads/) 轉述 Naavik 圖表）。同一篇分析指 Survivor!.io 先讓玩家快速變強，再撞上進度牆，令便宜的早期禮包顯得吸引。

### 2.3 局內設計的共通點

- **局內 roguelite，局外 RPG。** 局內三選一技能，局外有裝備欄、合成、英雄碎片、天賦（Archero、Survivor!.io、Dicero 均見上表來源）。Capybara Go! 上線時有七條「成長向量」，Survivor!.io 上線時只有一條（[Brutally Honest 案例，2024-12-03](https://gameindustrylibrary.com/documents/brutally-honest-capybara-go-global-launch-ua-case)，數字未注明來源）。
- **單手、直式。** 中國區 App Store 的弓箭傳說與弓箭傳說2 文案寫明一指操作、豎版；Survivor!.io 美區文案寫單手操作（[App Store CN](https://apps.apple.com/cn/app/id6532613807)、[US](https://apps.apple.com/us/app/id1528941310)，2026-10-21）。
- **隨機進度。** GameRefinery 形容 Capybara Go! 完全隨機的成長帶「社交賭場」感（[2024-11-14](https://gamerefinery.com/mobile-game-market-review-october-2024)）。

### 2.4 營利壓力手法（點名，不建議）

| 手法 | 作品與來源 | 為什麼是壓力 |
| --- | --- | --- |
| 新手禮包分三個價位，玩家不早買，較高價的就消失 | Archero 2 軟啟動拆解，2024-11-11 | 限時、怕錯過 |
| 先快速變強，再撞進度牆，牆前賣便宜禮包 | Survivor!.io、Archero（Mobilegamer.biz，2022-10-21） | 人為設計的牆 |
| 死亡時提供付費或看廣告復活 | Archero（DoF 2019；wiki 版本史）；Archero 2 Boss 戰廣告復活（[Pocket Gamer 指南，2025-08-29](https://www.pocketgamer.com/archero-2/guide/)） | 在失去的一刻要求付出 |
| 體力上限，以廣告或寶石補充 | Archero：每 12 分鐘 1 點、上限 20、每日最多 4 次廣告各 5 點（[wiki Energy](https://archero.fandom.com/wiki/Energy)，最後修訂 2026-03-10，不證明數值仍有效）；Capybara Go! 每章 5 體力 | 用等待或廣告限制遊玩 |
| 寶箱、抽獎；機率公開程度不明 | Apple「Contains」欄列 Loot Boxes：Archero、Archero 2、Capybara Go!；Google IARC 列 Includes Random Items 的作品則不同（2026-10-21 讀取） | 兩間商店的披露彼此不一致；Survivor!.io 在 Google Play 頁首仍標「Contains ads · In-app purchases」，但分級欄沒有 IARC 的 In-Game Purchases (Includes Random Items) 描述，Apple 的「Contains」欄也沒有 Loot Boxes（[Google Play 美區](https://play.google.com/store/apps/details?id=com.dxx.firenow&hl=en_US&gl=US)、[App Store 美區](https://apps.apple.com/us/app/id1528941310)，2026-10-21） |
| 付費去廣告 | Archero 2 永久卡含去廣告與每日 800 鑽（軟啟動拆解） | 以煩擾換付費 |

相反方向的公開承諾：CEO 表示不設硬付費牆，免費玩家能靠廣告或等待推進（白鯨出海 2023-07-28；屬自述，未經稽核）。

## 3. Supercell

### 3.1 公司自述的取向

| 說法 | 來源與日期 | 層級 |
| --- | --- | --- |
| 小而獨立的團隊（cells），公司盡量保持小；通常越早砍掉遊戲越好；失敗會開香檳 | [About Us](https://supercell.com/en/about-us/)，未注日期，2026-10-21 讀取 | 第一方 |
| 批准的是團隊而非遊戲；Brawl Stars 測試超過 500 天、幾乎被砍；Squad Busters 最近一次封測逾 12 萬人 | [Paananen，2025-02-11](https://supercell.com/en/news/forever-game/) | 第一方 |
| Squad Busters 的測試只驗證核心玩法與 D7；大樣本測試也預測不到全球行為；一個月的軟啟動太短；在願景驗證前就大舉行銷是錯的。2023-05 的 14 萬人封測 D1/D3/D7 為 61/44/38% | [Paananen，2026-02-10](https://supercell.com/en/news/the-best-games-havent-been-made-yet/) | 第一方 |
| Clash Royale 2025 年的回流玩家翻倍、新玩家增加近 500%（未給基準）。信中說成長依次來自活躍、近期流失、長尾、新玩家；系統改動令遊戲更易上手，但本身不會即時帶來甚麼，觸發點是一次「火花」式活動，口碑是滾雪球的機制；主管承認仍未學會如何維持回升 | 同上 | 第一方 |
| Clash of Clans 系統設計職缺：負責新玩家 onboarding 與 A/B 測試，問題是如何讓玩家的第一小時令人難忘 | [職缺存檔，2026-07-10](https://web.archive.org/web/20260710083518/https://supercell.com/en/careers/game-systems-designer-clash-of-clans/5cc9682b-7353-4ee7-be2f-9f3065b5f5df/)；2026-10-21 已不在職缺頁 | 第一方 |
| CoC 主管 Stuart McGaw：任何人都能上手，深度來自許多清楚的選項；單位要一眼看懂；不要居高臨下對待玩家；CoC 可能是某人的第一款遊戲 | [Game Developer，2022-08-22](https://www.gamedeveloper.com/game-platforms/looking-back-on-10-years-of-clash-of-clans) | 第一方（受訪） |
| GDC 2026 Clash Royale 演講（媒體轉述）：回顧 2022–2025；Magic Items 讓玩家自選升級哪張卡；2025-03 不顧玩家強烈反對移除 Season Shop；Events 分頁併入模式選擇；Goblin Queen's Journey（2024）未能帶來持續增長並造成下滑，Merge Tactics 表現好得多 | [Mobilegamer.biz，2026-03-10](https://mobilegamer.biz/supercell-explains-clash-royales-big-comeback/) | 媒體 |

### 3.2 Clash Royale 首局（wiki，未注日期，2026-10-21 讀取）

以下依 [Training Camp wiki](https://clashroyale.fandom.com/wiki/Training_Camp)。**衝突旗標：** 同一 wiki 的 Arenas 頁顯示教學列為 8 張卡加 Tower Princess（那是教學結束時的牌組），Chests 頁仍說最後一場教學給 Silver Chest，與 Training Camp 頁不一致。

1. 首次啟動直接進入 Training Camp 戰鬥，沒有先看選單。
2. 第一戰對 AI 訓練師：手牌 6 張（唯一能少於 8 張的時候）。國王以對話氣泡請玩家放騎士，但任何卡隨時都能出。聖水回得比平常快，沒有時限。前三位訓練師的皇冠塔只有 1 級塔 20%、30%、40% 的生命。
3. 第一戰後得一個木箱（18 金、4 張卡、1 秒開啟），回到主選單，**必須開箱並升級一張卡**才能打第二戰。
4. 第二、三戰各得一個 Lucky Chest（2025-03-31 起），第三戰名為 "The Final Test"。
5. 教學結束：進入 Arena 1，0 獎盃，得 100 寶石。
6. Arena 1 的 Trophy Road 在 50、125、175、225、275 獎盃時**二選一給卡**，75 與 200 獎盃給金幣（[Arenas wiki](https://clashroyale.fandom.com/wiki/Arenas)；何時開始改為二選一，wiki 沒有日期）。

變遷：2016 年軟啟動時教學寶箱要等約 15 秒，可用硬貨幣跳過（[PocketGamer.biz，2016-03-03](https://www.pocketgamer.biz/ftue-clash-royale/)）；2017-06-12 木箱開啟時間由 15 秒減至 5 秒（[Chests wiki](https://clashroyale.fandom.com/wiki/Chests)）。

### 3.3 Clash Royale 的解鎖與獎勵如何改變

- **每個競技場開一點。** Arena 1 開商店；Arena 2 開 Pass Royale 等；Arena 3 開 Evolution 槽與 Global Tournaments；Arena 5 開 Hero 槽；Arena 6 起有 Epic 卡；Arena 10 開 Wild 槽；Arena 11 起有 Legendary；Arena 16 起有 Champion（[Arenas wiki](https://clashroyale.fandom.com/wiki/Arenas)；Evolution／Hero／Wild 與 Global Tournaments 由第一方 [2026-02-23](https://supercell.com/en/games/clashroyale/blog/release-notes/march-update-2026/) 與 [2026-03-16](https://supercell.com/en/games/clashroyale/blog/news/mid-march-update) 公告確認）。**衝突：** 2025-06 公告說 Merge Tactics 在 Arena 3 開，wiki 現時寫 Arena 1。
- **由抽變選。** 2026-03 起 Hero 改用 Hero Coins 自選，不再隨機掉落；新玩家到 Arena 5 得 200 枚（第一方，2026-02-23）。特殊槽由 4 減為 3；Quickplay 等級上限 11；移除用寶石買的錦標賽額外獎勵。
- **拿走計時寶箱。** 2016 年是四個寶箱槽、一次開一個、滿了就拿不到新箱，分析形容為預約式節奏並製造加速衝動（[DoF，2016](https://www.deconstructoroffun.com/blog//2016/02/clash-royale-next-billion-dollar-game.html)；文中計時 3–8 或 3–12 小時自相矛盾）。2025-01-15 先對 King Tower 1–9 級新玩家做實驗，理由是新玩家今天的期望可能與上市時不同（[第一方](https://supercell.com/en/games/clashroyale/blog/news/chest-experiment-king-tower-levels-1-9)）。2025-03-31 寶箱槽與計時全面移除，改為每日首四勝各得一個 Lucky Drop（Lucky Drops 自 2024-03-18 已存在）。
- **Trophy Gate。** 2019-04-19 引入 Trophy Road，獎盃門檻令玩家不會跌回已到達的競技場之下，但只在 4,000 獎盃以下有效（[第一方](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-feature-enter-the-trophy-road)）。
- **節奏。** 一場 3 分鐘，最後 1 分鐘雙倍聖水；加時現為 2 分鐘驟死、最後 1 分鐘三倍聖水（[Basics of Battle wiki](https://clashroyale.fandom.com/wiki/Basics_of_Battle)；2016 年加時為 1 分鐘）。

### 3.4 其他作品

| 作品 | 首局與早期 | 來源與日期 |
| --- | --- | --- |
| **Brawl Stars** | 新玩家以 Shelly 在只用於教學的 Training Island 打 Solo Showdown（2022-03-01 起）；wiki 提示說 bot 傷害較低（玩家層級證據）。同次 FTUE 更新把首個模式由 Gem Grab 改為 Solo Showdown、每勝 10 獎盃、Nita 改在 15 獎盃解鎖、首個教學把寶石換成 power cubes | [Training Island wiki](https://brawlstars.fandom.com/wiki/Training_Island)；[版本史 2022](https://brawlstars.fandom.com/wiki/Version_History/2022) |
| Brawl Stars 早期保護 | 2025-10 配對加入整體技術考量，避免新玩家太早遇上高手；2026-02-25 起 bot 對局只在 2,000 獎盃以下（原為 800）；GM 說早期成長加成對早期留存有很正面的效果 | [版本史 2025](https://brawlstars.fandom.com/wiki/Version_History/2025)；[Trophies wiki](https://brawlstars.fandom.com/wiki/Trophies)；[2025 回顧，2026-03-07](https://supercell.com/en/games/brawlstars/blog/community/2025-in-review-franks-blog-post) · 第一方 |
| Brawl Stars 由抽變選 | 2026-09 以 Brawler Blast 取代 Starr Road：射擊遊戲廊永遠有 10 個標靶，按稀有度順序解鎖，50% 機會在 2–4 個角色中自選 | [2026-09-01 公告](https://supercell.com/en/games/brawlstars/blog/release-notes/release-notes-august-2026) · 第一方 |
| Brawl Stars 的戰利品箱教訓 | 2022-12 移除戰利品箱改為線性 Starr Road，2023-06 以「贏來、不可購買」的隨機 Starr Drops 帶回隨機獎勵；GDC 2024 報道稱 2023-06 至 2024-02 收入升 8.8 倍 | [Mobilegamer.biz，2024-03-26](https://mobilegamer.biz/supercell-explains-brawl-stars-big-comeback-from-an-all-time-low-to-8-8x-revenue/)；[DoF](https://deconstructoroffun.com/blog/why-removing-loot-boxes-in-brawlstars-failed) · 媒體／分析 |
| **Clash of Clans** | 一位 Villager 以對話帶領教學，教建造與進攻；Goblin King 是教學中的進攻者，玩家要守住村莊。教學要求建一座加農炮；教學生成的六隻哥布林不理金礦、直撲加農炮；第二座建築工小屋在教學中購買；wiki 說新玩家起始 250 寶石，被提示時會花掉一部分（2019 年攻略則說教學後 500，衝突未解） | [Villager wiki](https://clashofclans.fandom.com/wiki/Villager)（帶領、對白、第二位建築工）；[Goblin King wiki](https://clashofclans.fandom.com/wiki/Goblin_King)；[Cannon wiki](https://clashofclans.fandom.com/wiki/Cannon/Home_Village)；[Goblin wiki](https://clashofclans.fandom.com/wiki/Goblin)（六隻哥布林）；[Gems wiki](https://clashofclans.fandom.com/wiki/Gems)；均未注日期，2026-10-21 讀取 · wiki；[clash.ninja，2019-02-11](https://www.clash.ninja/guides/new-player-guide) |
| Clash of Clans 新手支援 | 2021-04-08 為 TH2–6 加入 Starter Challenges；TH2 升級時間減 60%；1–4 級收集器容量加倍 | [第一方，2021-04-08](https://supercell.com/en/games/clashofclans/blog/game-updates/spring-update-sp2) |
| **Squad Busters** | 教學由 Mrs. S 帶領；2.0（2025-05-13）重做教學，英雄與隊員分批給，能力先以小而封閉的一組介紹；2025-10-30 停止開發與內購，伺服器 2026-12-14 關閉 | [Sportskeeda，2025-05-13](https://www.sportskeeda.com/mobile-games/news-we-need-make-sure-feels-like-valuable-use-time-jonathan-rowlands-talks-aspects-squad-busters-2-0-update)（開發者受訪）；[第一方，2025-10-30](https://supercell.com/en/news/squad-development-ending/)；[PocketGamer.biz，2026-10-14](https://www.pocketgamer.biz/supercell-set-to-shut-down-squad-busters-on-december-14th/) |
| **mo.co** | 2025 版首局：開場動畫 → 創辦人 Luna 以手機聊天介面傳訊 → 立即戰鬥（獵 50 隻怪、救 3 人）→ 之後才自拍與取名。此流程屬歷史，Missions 已於 2026-05-20 移除。2025-03-18 以邀請制全球上線，2025-07-02 開放所有人 | [Welcome2moco wiki](https://mo-co.fandom.com/wiki/Welcome2moco)（首局流程）；[Missions wiki](https://mo-co.fandom.com/wiki/Missions)（2026-05-20 移除）；[第一方，2025-03-18](https://supercell.com/en/news/moco-launch/)、[2025-07-02](https://supercell.com/en/news/exciting-update-from-moco-cofounder-luna/) |

### 3.5 營利壓力手法（點名，不建議）

| 手法 | 作品與來源 | 現況 |
| --- | --- | --- |
| 計時寶箱、槽滿即失去獎勵、寶石加速 | Clash Royale 2016–2025（DoF 2016） | 2025-03-31 移除 |
| 帶星級「旋轉」升級的隨機寶箱，亦可經付費 Pass 取得 | Clash Royale Lucky Chests（[wiki](https://clashroyale.fandom.com/wiki/Lucky_Drops)） | 現行 |
| 新帳號 14 日登入日曆，漏一天即結束 | Brawl Stars，2022-04-27 起，40 獎盃解鎖（[版本史 2022](https://brawlstars.fandom.com/wiki/Version_History/2022)） | 以損失框架綁定連續登入 |
| 教學中提示用寶石加速建築 | Clash of Clans（Gems wiki） | 在玩家能判斷價值前教花高級貨幣（推論） |
| 會過期的邀請 QR 碼（約 20 分鐘） | mo.co 邀請制（[Naavik，2025-04-27](https://naavik.co/digest/mo-co-and-supercells-new-launch-philosophy/)） | 已關閉；製造緊迫感（推論） |
| 只能付費取得的 50 美元角色 | Brawl Stars Kaze；Supercell 自己說大多數玩家不能接受（2025 回顧） | 非 onboarding |

## 4. 兩家共通的模式

| # | 模式 | Habby 證據 | Supercell 證據 |
| --- | --- | --- | --- |
| 1 | **先玩，後選單** | 直接進入單鍵遊玩；第一局後才有被動升級（Mobilegamer.biz 2023） | CR 首次啟動即進戰鬥；BS 首個畫面是 Training Island；mo.co 先戰鬥後取名 |
| 2 | **第一戰低風險** | Archero 2 教學兼第 1 章，約 28 秒 | CR 訓練師塔血 20–40%、聖水加快、無時限；BS 教學 bot 傷害較低（wiki 提示） |
| 3 | **功能逐步出現** | 多日逐步解鎖，營利系統最後；Archero 2 主畫面到第 9 關才齊 | CR 每個競技場開一兩項；BS 模式按獎盃開放 |
| 4 | **一次強制的成長動作** | — | CR 第一戰後必須開箱並升級一張卡 |
| 5 | **少字，靠看懂** | Archero 敵人外形與攻擊節奏各異；Dicero 只教基本操作；但 Survivor!.io 的目標與貨幣被評為沒有解釋 | McGaw：單位一眼看懂；CR 的國王有文字，但真正的教學是低風險的自由出牌（推論） |
| 6 | **由抽變選** | — | CR 卡牌二選一、Hero Coins；BS Brawler Blast 自選 |
| 7 | **簡化新玩家面對的系統** | Archero 2 起始主畫面很空 | CR 2025 移除寶箱計時、Season Shop、Events 分頁；Supercell 自己說簡化本身不會即時見效 |
| 8 | **新手配對保護** | — | BS 配對考量整體技術；bot 只在低獎盃 |
| 9 | **營利壓力** | 2.4 表 | 3.5 表；Supercell 2025–2026 移除了其中幾項 |
| 10 | **上架語言** | Gorilla Games 作品在 App Store 只宣告 EN/JA/KO/簡/繁 五種（Archero 2 另加泰文，Wittle Defender 另加越南文）；亞洲先上架，所以早期營收估計集中在亞洲（Archero 2 截至 2025-01-10 台、韓、港合佔約 85%，那時美日歐剛上架兩天），美日歐上架後首月美國約 30%、日本約 22% | CR 2016-01 初軟啟動（是否只有英文屬推論），2016-02-29 的 v1.2 加入 14 種語言（含簡、繁、阿拉伯文），當時計劃 2016-03 全球上線；Supercell 七款作品（含 Hay Day、Boom Beach）在 App Store 共有 15 種語言 |

第 10 點的細節與限制在 [I18N-PLAN §1](I18N-PLAN.md#1-兩家公司的語言做法)。

## 5. Clash Royale 是最接近的參照，但類比在哪裡斷開

兩者都是短局卡牌對戰，有塔／生命、八張牌組、AI 訓練師帶第一戰、逐級開放的天梯。差別決定了哪些做法能搬：

| Clash Royale | Mythseal | 對 onboarding 的意義 |
| --- | --- | --- |
| 即時；聖水持續回復，出錯可以等時間補回 | 回合制；12 顆仙丹分配給四回合，不回復（火焰山勝後補至至少 8 除外） | 第一回合用光仙丹無法補救。模擬中 AI 在 400 局種子對局的 96–98% 於第一回合花 ≥8 顆；從不加丹的玩家 0/300 勝（[BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md) 第 432–437 行） |
| 出牌公開，沒有隱藏承諾 | 雙方四張手牌公開，但仙丹暗中同時下注（DN1） | 要教的不是「怎樣放卡」而是「推測對手會花多少」；D3 的 ④「讀懂揭曉」是 CR 沒有的一課 |
| 教學槓桿：塔血、聖水速度、無時限 | 槓桿：守衛的卡等級（已是 min(3, 節點 Lv)，即 1；`app.mjs:1062`）、AI 的出丹方式、先手規則 | CR 的「加快聖水」沒有對應物；最接近的是 AI 首回合的出丹 |
| 國王說「放騎士」，但任何卡都能出 | D3 的 coach marks 可跳過，② 不能跳過 | 兩者都讓玩家自由行動，同時保證一個關鍵概念被看見 |
| 一場 3 分鐘＋加時 | 四回合，每次揭曉動畫 1.1 秒，可跳過 | Mythseal 首戰估計 4–5 分鐘（未量度） |
| 從 Arena 1 起就是真人對戰 | 只有 AI；真人對戰（來日）未開放，屬 M2/M3 | BS 的新手配對保護屬將來線上模式的問題 |
| 隱藏的是將來的抽牌與對手手牌 | 隱藏的是對手本回合下的丹 | AI 只能用公開資訊（DESIGN 第 94 行）；調整難度必須是公開可說明的出手方式 |

## 6. 哪些適合 Mythseal

判斷尺是第 1 節的前提。

| 模式 | 判斷 | 理由 |
| --- | --- | --- |
| 1 先玩後選單 | **合用，已大致做到** | 洞府的 啟程遊歷 直達霧隱渡口準備；T1 修好了「先讀規則就被送去切磋」的陷阱。仍有一條旁路：今日落子 的 前往 通往 對弈，若先完成一場練習，coach marks 便永遠錯過（`adventure-ui.mjs:38`；`t1:docs/TUTORIAL-T1.md` §1.1 末段，第 77–79 行）。見 O2 |
| 2 第一戰低風險 | **改用** | AI 首回合大量出丹令首戰對完全新手很硬。CR 的做法是公開地削弱訓練師；Mythseal 可以給首戰守衛一種有名字、會在畫面說明的保守出手風格，而不是暗中放水，保持 DN7 與「AI 只用公開資訊」。見 O1 |
| 3 功能多日逐步出現 | **不採用其時間表；保留「按成就呈現」的可能** | Habby 的多日序列服務留存與營利系統的排序，Mythseal 沒有這些目標，DN6 亦反對加每日清單。但「一次過看到五個目的地、七個市集分頁、約八種計數」確是迷路風險。見 O4 |
| 4 一次強制的成長動作 | **改為指路，不強制** | CR 強制開箱升級。Mythseal 的修練要花金幣與靈砂，DN4 把花費許可與方便分開，所以只在首勝後指向 同行記／修練，不替玩家花錢。見 O3 |
| 5 少字，靠看懂 | **合用** | 卡面美術按政策不含文字（[ART-CLASSICS](ART-CLASSICS.md) 第 28 行），對教學與翻譯都有利。Survivor!.io 被評為目標與貨幣沒解釋，正是 T1 詞彙要補的位。見 O5 |
| 6 由抽變選 | **合用，現有設計已傾向這邊** | 首卷 AA 自選、西行印兌換已是「選」。暫不建議改動起始四張歡迎卡，因為會動經濟與存檔 |
| 7 簡化新手面對的系統 | **合用，作為盤點** | CR 的方向與 Mythseal 的 DN1「一個決定一個畫面」一致；但 Supercell 自己說簡化不是即時見效的原因，不能當作已證實的 onboarding 成效。見 O6 |
| 8 新手配對保護 | **留待線上模式** | Mythseal 現時只有 AI；若 M2/M3 選擇做 PvP，新玩家配對與 bot 披露要寫入那份合約 |
| 9 營利壓力 | **不採用** | 消失的新手禮包、進度牆、失敗時的復活優惠、體力、計時寶箱、漏一天就斷的登入日曆、教學中提示加速、過期邀請碼：全部與第 1 節前提衝突。現有的朝露禮物沒有連續登入懲罰，應保持 |
| A/B 測試與遙測 | **不採用（除非 owner 另行決定）** | 手機版私隱頁寫明沒有分析或追蹤。Supercell 自己的教訓是只看 D7 的測試預測不到長期行為，這反而支持用多次真人試玩觀察第二次遊玩，而不是一個指標 |
| 「選錯不重罰」（David Pan） | **合用** | 首戰輸了仍有 20 金幣、10 修為、12 歷練，D3 的 悟 在輸後顯示建議；O1 處理首回合用光仙丹的情況 |
| 「廣告素材忠於玩法」（David Pan） | **合用於商店截圖** | 截圖應顯示真實遊玩畫面；ArtCraft 產出要等書面商業使用確認才可上架（owner 2026-10-21，見 `art/own-reference-policy` 分支的 ART-ONBOARDING） |
| 長測試期（BS 500+ 天；Supercell 說一個月軟啟動太短） | **合用於 M5.3** | 封測要看到重複遊玩，不只是首局 |

## 7. 候選工作包（proposal）

這些只是候選，不是工作指令。每一項都要 owner 選定後才開始，並遵守一個檔案一位作者。Owner 2026-10-21 的選擇記在第 8 節各題之下。

**O1 · 首戰守衛的開局（AI 首回合仙丹問題）**
- 關係：D3 的出口是至少三位新玩家的試玩；[ROADMAP M4](../ROADMAP.md#m4--grow-the-game-presentation-and-competitive-play) 的 First battle teaching (D3) status 段把限制 AI 首回合出丹列為試玩後的 owner 後備選項。
- 建議：維持「先試玩」的次序，但把後備方案準備成一個可審閱的小包：只在霧隱渡口的首次遠征（`stats.played === 0`）讓守渡弈者用一種具名的保守出手（例如首回合出丹有上限），並在準備畫面或守衛台詞中說明。引擎與公平模式不變；AI 仍只用公開資訊。
- 出口證據：種子模擬顯示按 coach 建議分配仙丹的玩家能贏；三位新玩家試玩記錄；同一存檔重載不會改變結算。

**O2 · 封住通往練習的旁路（T1.1 候選）**
- 關係：T1 修好規則對話框的路線，並在 對弈 用 `arena-first` 提示，但不改路線。
- 建議：首次遊玩前，今日落子 的 前往 也導向霧隱渡口準備，與 T1 §1 的做法一致；或在 切磋 開始前提示「首局會錯過引導」。兩者擇一由 owner 決定。

**O3 · 首勝之後的「下一步」**
- 關係：T1 開放問題 8。勝負已定 頁屬 D3 凍結範圍；另一選項是 `stats.played` 為 1–2 時在洞府顯示一個條件提示，指向 任務手札 與 修練。
- 參照：CR 第一戰後強制升級一次。Mythseal 只指路，不代花費（DN4）。

**O4 · 五個目的地：全開還是漸進**
- 現況：新存檔一開始五個目的地與任務手札全開（`navigation-ui.mjs:35,63`）。
- 選項：(A) 維持全開，靠 T1 提示；(B) 全部可進入，但首勝前只突出 遊歷，其餘以安靜樣式顯示並附一句「勝第一戰後再看」；(C) 像 CR 那樣真正鎖住，按首勝等成就解鎖。
- 建議：先 (A)，並在 D3／T1 試玩中記錄新玩家首勝前有沒有走進 市集、山行 而迷路；若有，採 (B)。(C) 要新的存檔狀態，舊存檔不能因此被鎖回去，回訪玩家也不應被擋（IMMERSION 第 186 行），成本最高。任何漸進只按遊戲內成就，不按日數或時鐘。

**O5 · T2 圖文入門卷**
- 關係：T1 之後的下一步（`t1:docs/TUTORIAL-T1.md` 第 25–28 行）；美術計劃在 `art/own-reference-policy` 分支的 ART-ONBOARDING（K-01 主視覺、T-01 守渡弈者、T-07 四張規則插圖：藏鋒、決勝、共鳴、破局）。
- 參照：兩家都主要靠遊玩教，而不是手冊；Survivor!.io 的不足是目標與貨幣。
- 建議：入門卷作為可隨時打開的參考，從 弈道 與 詞彙 進入，四章對應四張規則插圖；不擋在首戰之前。文字由程式排版、不燒入圖片，日後可翻譯（[I18N-PLAN §3.1](I18N-PLAN.md#31-字串目錄)）。ArtCraft 圖要等書面確認才可上架。

**O6 · 新手可見計數盤點**
- 現況：金幣、靈砂、修為、執令者 Lv、卡牌歷練與 Lv、西行印、秘券、擂台積分；T1 詞彙要 20 個詞。
- 建議：列出首勝前新玩家會看到的每個計數、它首次出現的畫面與必要性；只出表，不改規則。結果交 O4 決定。

**O7 · 試玩紀錄格式**
- 關係：D3 出口與 M4 驗收（[ROADMAP M4](../ROADMAP.md#m4--grow-the-game-presentation-and-competitive-play) 的 Acceptance 段）都靠真人試玩。
- 建議：一頁表格，記錄到第一個結果的時間、在哪裡停下或迷路、能否解釋一次揭曉、能否指出哪張卡得到歷練，並在可能時觀察第二次遊玩。不加遙測。
- 2026-10-21 起草為 [PLAYTEST-RECORD.md](PLAYTEST-RECORD.md)。

## 8. Owner 決定

Owner 於 2026-10-21 明確選了第 1 項，其餘說「照建議」。第 3、4 項本文原本沒有建議，由 agent 選定並寫明理由，標為「agent 代選」，owner 可以推翻。

1. **AI 首回合：** 維持「先試玩，後備方案留待之後」，還是現在就準備 O1 的具名保守守衛？
   - **已答 · 2026-10-21：** 現在就準備 O1 的保守守衛，作為一個可審閱的工作包，在 `o1/gentle-guardian` 分支並行製作。準備好的包經 owner 審閱後才合併。
2. **目的地：** O4 的 (A)、(B) 或 (C)？建議先 (A)，以試玩決定是否轉 (B)。
   - **已答 · 2026-10-21：** 先 (A)，全部開放；若試玩顯示新玩家迷路，轉 (B)。迷路與否記在 [PLAYTEST-RECORD](PLAYTEST-RECORD.md) 的「在哪裡停下或迷路」一欄。
3. **練習旁路：** O2 作為 T1.1 跟 T1 一起，還是等 D3 試玩？
   - **已答 · 2026-10-21（agent 代選）：** O2 沒有建議，所以由 agent 選定導向：首次遊玩前，今日落子 的 前往 也導向霧隱渡口準備，與 T1 §1 的做法一致，而不是在切磋前提示。理由：同一個「首次」條件、同一個終點，玩家不用多讀一句；提示仍會讓人走進錯過引導的那一局。正在 PR #18 以 T1.1 製作。owner 可以推翻。
4. **首勝後的指路放在哪裡：** 勝負已定 頁（要解凍 D3）還是洞府條件提示（T1 問題 8）？
   - **已答 · 2026-10-21（agent 代選）：** O3 沒有建議，所以由 agent 選定洞府條件提示（T1 問題 8 的替代方案：`stats.played` 為 1–2 時指向 任務手札 與 修練）。理由：D3 保持凍結，它已測過的結果頁與 `shanhai.coach.v1` 都不用重開。正在 PR #18 以 T1.1 製作。owner 可以推翻。
5. **入門卷的位置：** 可隨時打開的參考（建議），還是首次啟動時出現？
   - **已答 · 2026-10-21：** 可隨時打開的參考，不擋在首戰之前（照建議）。
6. **遙測：** 確認 onboarding 評估只用真人試玩，不加分析。
   - **已答 · 2026-10-21：** 確認。只用真人試玩，不加遙測或分析；紀錄格式是 O7 的 [PLAYTEST-RECORD](PLAYTEST-RECORD.md)。
7. **起始卡選擇：** 是否探討「自選一位歡迎同伴」？建議暫不做。
   - **已答 · 2026-10-21：** 暫不做（照建議）。

## 9. 本次未確立

以下各項本次未能證實，不作為依據；屬有界的「本次未找到」，不代表不存在。

- Archero 在 App Store 宣告 5 種語言是否「少報」了遊戲內語言：2019 年的更新記錄加入了阿拉伯文、越南文、泰文、意大利文與土耳其文，但無法在不玩遊戲的情況下確認 2026 年的版本仍包含它們。
- Habby 各作的底部導航與紅點慣例：本次讀到的來源都沒有記載。
- Archero 2、Capybara Go!、Survivor!.io 2026 年的公會、PvP、商店與 Pass 解鎖門檻：wiki 與拆解多是 2019–2024 年的資料。
- 任何一款作品的計時首局：兩家都沒有公開；Archero 2 的 28 秒量法未公開。
- Clash Royale 早期天梯是否用 bot；Brawl Stars 如何告知玩家對手是 bot。
- Clash Royale 與 Brawl Stars 新手期間顯示的首購或新手優惠（CR 支援站頁面回傳 403）。
- Archero 2 的廣告形式：Game World Observer 引分析稱有全螢幕與獎勵廣告；軟啟動拆解沒有說只有獎勵廣告，兩者未必衝突，但未解決。
- Habby 是否在遊戲內顯示抽獎機率，以及是否符合韓國的機率公開規定。
- GDC 演講的完整內容：GDC Vault 要登入，只讀了摘要與媒體報道。
- 首局分鐘數的任何 Habby 第一方說法：沒有找到關於 FTUE 的 Habby 第一方演講。
