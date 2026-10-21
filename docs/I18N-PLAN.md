# 多語言支援計劃 · I18N plan

**狀態：`proposal · 2026-10-21`。** 這是建議，不是實作紀錄。沒有抽出任何字串、加入任何語言或改動商店資料。它**不在 v0.6.0 範圍內**（[RELEASE-NEXT](RELEASE-NEXT.md) 的範圍是 Q1 與 D1、N1、D2、D3）。程式碼引用以 `main` `3f3d351` 為準；`t1:` 開頭的引用指 `t1/first-visit-hints`（draft PR #18）已推送的 `0675b08`。本分支自己也改了 ROADMAP，所以 ROADMAP 引用用章節錨點與段落名，而不用行號。外部來源全部於 2026-10-21 讀取，並經第二輪覆核；只採用覆核確認或更正後的說法。Owner 於同日回答了 §9 的十項決定，答案以「已答」記在各題之下；§1 的註、§3–§8 已按答案更新，L0 的開始條件（§7）不變。

Owner 於 2026-10-21 要求把多語言支援放上路線圖，並參照 Habby 與 Supercell。兩家的 onboarding 與局內設計見 [BENCHMARKS-HABBY-SUPERCELL.md](BENCHMARKS-HABBY-SUPERCELL.md)。

**一句話：** 以繁體中文為源語言，先做 L0（把字串抽進目錄，畫面完全不變），首批加英文與簡體中文，之後按語言熱度再加；每種語言各自有版面檢查、翻譯來源紀錄、語言品質測試（LQA）與商店資料。譯文由 Claude 起草，首批的英文與簡中由 owner 審閱（owner 2026-10-21；4.4）。

## 1. 兩家公司的語言做法

### 1.1 App Store 宣告的語言（美國區，2026-10-21）

| 作品 | 開發 | 數量 | 語言 |
| --- | --- | --- | --- |
| Archero、Survivor!.io、Capybara Go!、Dicero! | Habby（Gorilla Games） | 5 | EN、JA、KO、簡中、繁中 |
| Archero 2 | Habby | 6 | 上述 5 種 + 泰文 |
| Wittle Defender | Habby | 6 | 上述 5 種 + 越南文 |
| Penguin Isle（Habby 發行、第三方開發） | Habby | 11 | 上述 5 種 + FR、DE、ID、PT、RU、ES |
| Clash of Clans | Supercell | 21 | EN、AR、NL、FI、FR、DE、ID、IT、JA、KO、MS、NB、PL、PT、RU、簡中、ES、TH、繁中、TR、VI |
| Clash Royale | Supercell | 21 | 同 CoC，但有波斯文、沒有波蘭文 |
| Brawl Stars | Supercell | 22 | 同 CoC + 希伯來文 |
| Squad Busters | Supercell | 18 | 同 CoC 減 MS、NB、VI（2026-12-01 下架，不是長期參照） |
| mo.co | Supercell | 17 | 同 CoC 減 FI、PL、TH、VI |
| Hay Day | Supercell | 22 | 同 CoC 減 PL，加 DA、SV |
| Boom Beach | Supercell | 20 | 同 CoC 減 PL |

來源：各作 App Store 頁面與 iTunes Lookup API（[Habby](https://itunes.apple.com/lookup?id=1422308796&entity=software&country=us)、[Supercell](https://itunes.apple.com/lookup?id=488106216&entity=software&country=us)），2026-10-21。把簡中、繁中分開計，表中十四款作品的交集是 5 種（EN、JA、KO、簡中、繁中），聯集 25 種：CoC 的 21 種，加 CR 的波斯文、BS 的希伯來文、Hay Day 的丹麥文與瑞典文；Habby 與 Penguin Isle 的語言全在 CoC 的清單內。Supercell 七款作品共有 15 種（那 5 種加 FR、DE、ES、PT、RU、ID、IT、TR、AR、NL）；只算 CoC、CR、BS、Squad Busters、mo.co 五款，共有的也是這 15 種。

**這個欄位不等於遊戲內語言。** Apple DTS 工程師於 2025-01 說明，App Store 的 Languages 欄由提交的 bundle 內 `.lproj` 資料夾決定；`CFBundleLocalizations` 只在 app 沒有 `.lproj` 時才被用來推斷（[Apple 論壇](https://developer.apple.com/forums/thread/771741)）。兩家的遊戲文字都在引擎內，所以這張表是「bundle 宣告的語言」。Archero 的更新記錄顯示 2019 年加入了阿拉伯文、越南文、泰文（1.1.2，[APKMirror 轉載](https://www.apkmirror.com/apk/habby/archero/archero-1-1-2-release/)）、意大利文（1.1.4）與土耳其文（1.2.1，iOS 2019-08-30）（三者均見 [Archero wiki 版本史](https://archero.fandom.com/wiki/Version_History)，玩家 wiki），但它們不在現時的 App Store 清單；這些語言 2026 年是否仍在遊戲內未經證實。

### 1.2 時序與做法

| 觀察 | 來源與日期 | 層級 |
| --- | --- | --- |
| Clash Royale 2016-01 初軟啟動；2016-02-29 的 v1.2 加入 14 種語言（FR、DE、ES、IT、NL、NO、PT、RU、TR、繁中、簡中、JA、KO、AR）；當時計劃 2016-03 全球上線。軟啟動是否只有英文，GamesBeat 沒有說，是從 v1.2 才加入其他語言推論 | [GamesBeat，2016-02-08](https://gamesbeat.com/supercell-announces-clash-royale-will-launch-globally-in-march/)（只說一月初）；[CR 版本史 2016](https://clashroyale.fandom.com/wiki/Version_History/2016) | 媒體＋wiki；「只有英文」屬推論 |
| Clash of Clans 於 2015-07-01 同時加入阿拉伯文與繁體中文 | [CoC 版本史 2015](https://clashofclans.fandom.com/wiki/Version_History/2015) | wiki |
| Habby 早期作品本地化不細，PunBall 起按地區調整；現在包括翻譯、跨文化溝通與社群營運 | [白鯨出海，2023-07-28](https://www.baijing.cn/article/45250) | 媒體轉述 CEO |
| 亞洲先行期的營收估計集中在亞洲：Archero 2 約台 46%、韓 28%、港 11%，是截至 2025-01-10、約五個月測試期的累計數字，而它 2025-01-08 才在美、日、歐上架（白鯨出海；iTunes 美區記 01-07），所以這是只在亞洲上架時的分布，不代表玩家在哪裡花錢；Capybara Go! 約韓 31%、台 25%，文中沒有注明截止日期。兩款都沒有日本的佔比 | [白鯨出海，2025-01-14](https://www.baijing.cn/article/51409)（引點點數據，第三方估計） | 媒體 |
| Archero 2 美日歐上架後首月（2025-01-08 至 02-07）的全球營收：美國約 30%、日本約 22% | [Sensor Tower 日本，2025-03](https://sensortower.com/ja/blog/archero2-good-start-in-japan)（第三方估計） | 分析 |
| 亞洲先行：Capybara Go! 台日韓 2024-10-22 上架、美國 2024-11-19；Archero 2 韓台港 2024-11-19、美日 2025-01-07 | iTunes Lookup（us/tw/jp/kr/hk），2026-10-21 | 第一方 |
| 店名按市場重新創作，但不是全部：噠噠特攻／ダダサバイバー／탕탕특공대（Survivor!.io）；破壞突擊隊（繁）對 爆裂小队（簡）（Squad Busters）；而 Archero 的 弓箭傳說、Capybara Go! 的 卡皮巴拉 Go! 則近乎直譯 | iTunes Lookup 與 Google Play 各區頁面，2026-10-21 | 第一方 |
| Habby 的中國大陸版本由另一個賣家 Shanghai Lezuan Technology 以 HABBY GAMES 名義發行；Supercell 的中國大陸版本由深圳騰訊天游發行，是另一條版本線 | iTunes Lookup／Search（country=cn），2026-10-21 | 第一方 |
| Supercell 的本地化：2015 年職缺稱支援「十多種但少於二十種」語言，本地化主管在玩家支援部門並管理外部夥伴；2025 年實習職缺描述內部團隊加外部夥伴，內容包括遊戲文字、支援、社群、行銷與字幕 | [職缺存檔 2015-03-26](http://web.archive.org/web/20150326220014/http://supercell.com/en/careers/localization-lead/90683b54ce4746aa96ee5ecc91cc5952/)；[2025-10-26](https://web.archive.org/web/20251026205941/https://supercell.com/en/careers/localization-intern/2319147/) | 第一方 |
| 廠商自述：Keywords 為每種語言設專屬團隊做翻譯與 LQA；CaptionHub 稱 Supercell 用 Phrase（即 2022 年改名前的 Memsource）做術語庫與翻譯記憶，此案例是影片字幕流程 | [Keywords](https://www.keywordsstudios.com/en/project-spotlights/keywords-studios-and-supercell-total-integration-for-global-success/)；[CaptionHub](https://www.captionhub.com/supercell)，均未注日期 | 廠商行銷 |
| Supercell 為 Clash Royale 的中文市場請漢儀設計了配合拉丁字體 Supercell-Magic 的中文字體 | [Fonts In Use，2025-03-17](https://fontsinuse.com/uses/66357/clash-royale-mobile-game)，由漢儀自行提交 | 廠商自述 |
| 2015 年 Paananen 對東洋經濟說：遊戲核心全球一致，表現與服務按市場調整；日本玩家對品質要求屬世界最高之列 | [東洋經濟，2015-10-30](https://toyokeizai.net/articles/-/90481) | 第一方（受訪） |
| 俄羅斯區 App Store：Habby 的 Survivor!.io、Capybara Go! 與 Dicero! 不在，Archero、Archero 2、Wittle Defender、Penguin Isle 等其餘作品在；Supercell 的七款遊戲都不在（只有貼圖等附屬 app） | iTunes Lookup 按開發者列出（country=ru），2026-10-21 | 第一方 |

**這兩張表怎樣用（2026-10-21 owner 回答後）：** 兩家共有的五語言核心是 EN、JA、KO、簡中、繁中。Owner 選的首批是其中三種：繁中（源語言）、英文、簡中；其餘語言之後按熱度加入（§9 第 2 項）。所以日、韓不再是既定的下一批，而是候選；上面的表仍是挑選候選時的參照之一，但不代替 Mythseal 自己的熱度證據（§6）。

## 2. 現況盤點

### 2.1 字串在哪裡

- **沒有字串目錄。** 字串直接寫在 67 個檔案的 template literal 裡：執行期 `.mjs`、`.html`、`.css` 合共約 30,600 個漢字。UI 與規則程式碼約 16,700；內容資料（戰役、故事、卡牌、活動）約 9,900；遊戲外的預覽頁約 4,000；T1 另加約 890（`glossary.mjs` 656、`first-visit.mjs` 231）。
- **規則層直接拋出中文錯誤。** `progression.mjs`、`collection.mjs`、`inheritance.mjs`、`local-commands.mjs` 拋出中文 `RangeError`，UI 以 `toast(error.message)` 原樣顯示（`app.mjs:1066`；共 29 處用 `error.message`）。
- **語法與程式碼交纏。** 約 671 處中文緊貼 `${…}`，186 個三元式在中文字串之間選擇；`battle-teaching.mjs:251-264` 與 `t1:glossary.mjs:10` 有中文數字表。
- **約 85 個 `aria-label`**，很多是模板，螢幕閱讀器播報中文（例如 `app.mjs:1207`）。
- **已有一個可翻譯的模式：** 帳號 API 回傳錯誤碼加英文訊息（`server/account-api.mjs:187,259`），客戶端把每個碼對應到中文（`account-client.mjs:3-10`）。
- **T1 的詞彙是術語庫的種子：** 20 個條目各有穩定的 ASCII id（`t1:glossary.mjs:20-42`）。

### 2.2 數字、日期、排序與 `lang`

- `toLocaleString('zh-Hant')` 分散在 9 個本地 helper（`navigation-ui.mjs:9`、`backpack-ui.mjs:9` 等）；百分比手寫（`adventure-ui.mjs:60`）。
- 日期用 `Intl.DateTimeFormat('zh-Hant')`（`account-ui.mjs:17`、`save-ui.mjs:8`、`backpack-ui.mjs:24`，倫敦時間）。日鍵用 `en-CA` 加倫敦時間（`progression.mjs:101`），與顯示語言無關，應保持不變。
- 排序用 `localeCompare(…, 'zh-Hant')`（`collection-display.mjs:19-27`）。
- 每頁都是 `<html lang="zh-Hant">`；沒有任何地方讀取 `navigator.language`；`index.html` 的 meta 與 og 標籤只有中文。

### 2.3 字體

- **只用系統字體，沒有 `@font-face`，下載 0 位元組。** `--serif` 依次是 Songti TC、Songti SC、Noto Serif TC、STSong；`--sans` 以 PingFang TC 與 Microsoft JhengHei 為中文（`styles.css:2`）。
- `writing-mode: vertical-rl` 在遊戲內用了 3 次：戰鬥槽標籤（`scene-content.css:226`）、地圖題字（`adventure.css:42`）、英雄印（`styles.css:7`）。拉丁文字放進去會被轉 90 度。另外 3 次在遊戲外的預覽頁（`atelier.css`、`honglou.css`、`liaozhai.css`），不算入遊戲的工作量。
- 遊戲 CSS 有 94 個 `white-space: nowrap`、18 個 `text-overflow: ellipsis`、511 個 `letter-spacing`，都是為中文調的；預覽頁另有 17 個 `nowrap` 與 275 個 `letter-spacing`。
- 美術按政策不含文字（[ART-CLASSICS](ART-CLASSICS.md) 第 28 行；[ART-LZ01](ART-LZ01.md) 第 259 行），沒有燒入圖片的字要換。

### 2.4 由測試釘住的版面預算

| 預算 | 釘住它的地方 | 長文字會撞到哪裡 |
| --- | --- | --- |
| 無橫向溢出；每個控件 ≥ 43.5 px | `tools/viewport-smoke.mjs:24,92,99`；`tools/shell-smoke.mjs`（302–734 px 寬） | 每一排分頁與按鈕 |
| Dock：302 px 內 5 個兩字標籤 | `navigation-ui.mjs:35` | Journey、Arena、Collection、Market |
| 49 個模組分頁標籤（27 個兩字）；市集 7 個 44 px 分頁要 326 px，350 px 以下分兩行 | `expansion.css:92-93`；`scene-navigation.css:160` | 分頁會再折行或溢出 |
| 330 px 以下頁首只留標誌 | `viewport.css:36-38` | 錢包、Lv 與 T1 的資源按鈕 |
| T1 提示 ≤ 40 個碼位，且不高於被取代的那一行 | `t1:tests/first-visit.test.mjs:65,81` | 多數位置只有 1–3 行，字級 10–11 px |
| 詞彙定義 ≤ 40 顯示單位（ASCII 算 0.5） | `t1:tests/glossary.test.mjs:20,35` | 分頁以最高的條目定行高 |
| 戰鬥桌：≤ 50 px 的卡面上四字名會被截；剩 N 丹 要放得下；coach mark ② 在 2–3 行內 | [BATTLE-LAYOUT-PLAN](BATTLE-LAYOUT-PLAN.md) 第 397–405、449 行；`tools/coach-smoke.mjs:802` | Sun Wukong、Zhuge Liang；仙丹行 |
| 約 741–797 px 高的直式手機已經溢出 | [ROADMAP M5](../ROADMAP.md#m5--mobile-adaptation--ios-and-android-closed-beta) 的 N1 mobile shell 段；[RELEASE-NEXT §12](RELEASE-NEXT.md#12-owner-decisions-needed) 第 18 項 | 任何更長的文字都令它更差 |

表中 `expansion.css`、`scene-navigation.css` 的行號以 `main` `3f3d351` 為準。v0.6.0 若修 RELEASE-NEXT §12 第 17 項（701 px 以下的橫向手機），這些規則會改，L0 開始前要重新量（見 §7）。

參考數字：W3C 把每個中、韓文字按兩個英文字寬計算（[W3C](https://www.w3.org/International/articles/article-text-size)）；本地化商 Alconost 的粗略估計是繁體中文比英文短約 30%，德文長約 30%（[WN Hub，2020-05-14](https://wnhub.io/news/localization/item-17011)）。W3C 引 IBM 的 200–300% 膨脹率只適用於由英文譯成歐洲語言的短字串，不適用於中日韓。對 Mythseal 而言，風險在於**由中文源文譯成英文時變長**，以及預算以字數而非寬度計算。

### 2.5 存檔身份

大部分存檔身份是 ASCII，翻譯不會碰到：`shanhai.*` 儲存鍵、拼音卡牌 id、節點 id、印刷 id、牌組槽 `deck-1..3`、收據欄位。**有三處把中文顯示文字寫進儲存，只有第一處是身份**：

1. **稱號以中文名稱儲存。** `profile.expansion.titles` 存的是「聽見萬聲」與「借得東風」（`expansion-state.mjs:9-10`；`progression.mjs:700-701,788`），驗證時逐字比較（`expansion-state.mjs:101,105`）；戰役稱號其實有一個沒被使用的 ASCII id `heard-all-voices`（`campaign-content.mjs:120`）。**若翻譯這兩個常數，現有存檔會驗證失敗。**
2. **牌組預設名稱寫入存檔。** 「山海初陣」、「牌組 N」、「初陣」在建立時寫進存檔（`collection.mjs:167,188`；`progression.mjs:837`），雲端快照也帶著它們。玩家可以改名，所以它們是玩家資料，不是身份。
3. **進行中對局的快照帶著組好的中文。** 引擎每回合的結果有中文 `notes`（`${card.ability.label}（被封鎖）`、「怒擊 · 額外消耗 3 丹，傷害 +2」、陣營加成名稱、回復生命與獲得仙丹的句子；`engine.mjs:238-243,291,297`）與完整的卡牌物件，存在 `match.history` 與 `lastResult`；`persistBattle` 把它們寫進 `localStorage` 的 `BATTLE_KEY`（`app.mjs:340`）。它們不是身份，驗證不比較這些文字，所以不會失敗；但對局中途換語言或升級後續玩，已揭曉的回合仍以舊語言顯示。

### 2.6 原生與後端

- iOS `Info.plist`：`CFBundleDevelopmentRegion` 為 `zh-Hant`，`CFBundleLocalizations` 只有 `zh-Hant`，顯示名稱 Mythseal，沒有任何 `NS*UsageDescription`，只支援直式。專案已有 `Base.lproj`。
- Android：`values/strings.xml` 只有 `app_name` 等 Mythseal 字串，沒有 `values-*` 語系；manifest 的 `configChanges` 含 `locale`（`AndroidManifest.xml:11`）。
- fastlane 沒有 metadata 或語系資料夾；[NAMING](NAMING.md) 第 23 行說商店名稱與副標的本地化要在上架前檢查。
- Supabase 只存 `snapshot jsonb` 等欄位，沒有顯示文字欄；但快照內帶著上面兩種中文身份。OTP 郵件標為 `zh-Hant` 卻用粵語口語寫（`supabase/templates/otp.html:2,8,10`），與遊戲的書面語不一致。
- 測試：`tests/` 37 個檔案與 `tools/` 43 個 smoke 中的 32 個含中文，合共 938 行；140 個 `assert.throws`／`rejects` 比對中文訊息；smoke 以可見中文找元素（`coach-smoke` 89 行、`save-durability-smoke` 82 行、`back-smoke` 71 行）。

## 3. 架構

原則：瀏覽器執行期保持無依賴（[AGENTS.md](../AGENTS.md)），翻譯不改變任何規則、獎勵或存檔身份，源語言的畫面在 L0 完全不變。

### 3.1 字串目錄

- **每個語言一個 ES module**，例如 `strings/zh-Hant.mjs`、`strings/en.mjs`；鍵為穩定的 ASCII，按模組分命名空間（`lobby.start`、`glossary.coins.text`）。缺鍵時退回 `zh-Hant`，因為源語言永遠完整；Android 亦要求完整的預設資源，否則在未支援的語系可能無法執行（[Android](https://developer.android.com/guide/topics/resources/localization)）。
- **整句翻譯，不拼接。** 需要變數的字串寫成函數，數量變化用 `Intl.PluralRules`（自 2019-09 起各主要瀏覽器都支援，[MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)）。中日韓只有 `other` 一類，英文有 `one`／`other`，阿拉伯文有六類（[CLDR](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)）。ICU 的建議是把 `select`／`plural` 放在最外層、不要拼接片段（[ICU](https://unicode-org.github.io/icu/userguide/format_parse/messages/)）。MessageFormat 2 雖在 CLDR 47 定為 Stable，ICU 的實作在 2025 年仍是預覽或草稿，所以這裡不引入 MF2 程式庫。
- **錯誤用碼。** 規則層拋出帶 `code` 的錯誤，UI 把碼對應到目錄裡的句子，沿用帳號 API 已有的做法。測試改為比對碼。
- **規則結果也用碼。** `engine.mjs` 的回合 `notes` 改為碼加參數（例如被封鎖的能力記卡牌 id），由 UI 經目錄繪製；卡名與能力名也在繪製時按 id 查目錄，不讀快照裡卡牌物件的中文。這樣對局快照（2.5 第 3 點）換語言後也跟著換。L0 之前寫下的快照仍帶中文 `notes`，原樣顯示即可，不必遷移。
- **中文數字表** 變成每個語言自己的數字詞函數。
- **內容目錄與 UI 目錄分開。** 卡牌、節點、故事等內容約 9,900 個漢字，按卡牌 id、節點 id 存放，隨內容版本一起發佈；[CONTENT-RELEASE-PIPELINE](CONTENT-RELEASE-PIPELINE.md) 的 manifest 要加一個語言欄位，這樣一次內容發佈能說明它帶了哪些語言。
- **格式化集中一處。** 9 個 `toLocaleString('zh-Hant')` helper、日期與 `localeCompare` 改用同一個以目前語言為參數的模組；日鍵（`en-CA`、倫敦時間）不變。

### 3.2 語言選擇

- **網頁：** 依次採用玩家在遊戲內的選擇、`navigator.languages`、`zh-Hant`。
- **原生：** 用一個小的原生橋接取得語言。iOS 以 `Bundle.preferredLocalizations(from:forPreferences:)` 從 Mythseal 支援的清單中選出最佳配對（[Apple](https://developer.apple.com/documentation/foundation/bundle/preferredlocalizations(from:forpreferences:))）；Android 讀 `AppCompatDelegate.getApplicationLocales()`（[Android](https://developer.android.com/guide/topics/resources/app-languages)）。不用 Capacitor Device 的 `getLanguageCode()`：它在 iOS 只取前兩個字母，`zh-Hant-TW`、`zh-Hans`、`zh-HK` 都會變成 `zh`（[原始碼](https://github.com/ionic-team/capacitor-plugins/blob/main/device/ios/Sources/DevicePlugin/Device.swift)）。WKWebView 的 `navigator.language` 曾在 iOS 17.4 退回系統語言、17.5 修好，證據只有論壇（[Apple 論壇](https://developer.apple.com/forums/thread/749795)），所以原生版以橋接為主。
- **中文對應：** `zh-TW`、`zh-HK`、`zh-MO` 與任何 `zh-Hant*` → `zh-Hant`；`zh-CN`、`zh-SG` 與任何 `zh-Hans*` → `zh-Hans`。
- **玩家的選擇存在裝置本地**，鍵名沿用 `shanhai.*` 命名空間（例如 `shanhai.locale.v1`），不放進 profile。理由：語言是裝置偏好，不是旅程的一部分；放進 profile 會令存檔版本、雲端快照與匯入驗證都要改。Owner 於 2026-10-21 確定只存裝置本地，不隨雲端備份同步（§9 第 6 項）。
- **Android 的 `configChanges` 含 `locale`**，系統改語言時 activity 不會重建；網頁層要在回到前景時重新讀取語言（推論，未測試）。

### 3.3 每個語言的 `<html lang>` 與漢字字形

- 同一個漢字碼位在簡中、繁中、日、韓讀者眼中字形不同，有些瀏覽器只憑 `lang` 選字體（[W3C](https://www.w3.org/International/questions/qa-lang-why)）。所以啟動時、首次繪製前就要把 `<html lang>` 設為目前語言（BCP 47：首批是 `zh-Hant`、`zh-Hans`、`en`；日後加入的語言照樣處理，例如 `ja`、`ko`）。
- 現在的字體堆疊把 Songti TC 放在 Songti SC 之前，對簡中與日文都不對。以 `:lang()` 為每種語言給一組堆疊，例如 `:lang(zh-Hans)` 先用 Songti SC，`:lang(ja)` 先用日文明朝體，`:lang(ko)` 先用韓文明朝體。Apple 平台上 `system-ui` 會按 `lang` 在 PingFang SC、PingFang TC 與 Hiragino 之間切換，Windows 不會（[CSS WG 討論串，2025-09](https://lists.w3.org/Archives/Public/public-css-archive/2025Sep/0684.html)，非正式測試）。
- 混排時給嵌入的名稱標上自己的 `lang`，例如日文介面裡以中文字形顯示的作品名用 `<span lang="zh-Hant">`（推論）。
- `zh-Hant` 預設台灣字形。Noto CJK 有獨立的 HK 變體，因為台港字形標準不同（[Noto CJK](https://github.com/notofonts/noto-cjk/blob/main/Sans/README.md)）。首批不另設 `zh-Hant-HK` 目錄，理由見 §9 第 8 項（agent 代選）。

### 3.4 字體與位元組預算

- **維持系統字體，預算 0 位元組。** 這是現況，也是最便宜的做法；owner 於 2026-10-21 確定（§9 第 10 項）。
- 若將來想要統一的展示字體：Google Fonts 單一字重的完整 woff2 總量約為 Noto Sans SC 2.41 MB、TC 2.30 MB、JP 2.94 MB、KR 1.87 MB、Noto Serif TC 3.04 MB（2026-10-21 量度）。這是上限：網頁只下載實際用到的字元切片。原生離線包則要自行按實際用字子集化，並限制在一至兩個字重，計入 [RELEASE-NEXT](RELEASE-NEXT.md) 的 payload 預算。
- Supercell 的做法是為每種文字配一套風格相同的伴隨字體（漢儀為 CR 做中文字體；Vasava 為 Squad Busters 做拉丁加韓文字體），兩者都是廠商自述。只有在 owner 想要品牌字體時才值得考慮。

### 3.5 每個語言的版面預算，連到現有 smoke

- **讓現有 smoke 能指定語言。** `test:viewport`、`test:shell`、`test:coach`，以及 T1 合併後的 `test:guide`，加一個 `LOCALE` 環境變數（v0.6.0 若為 RELEASE-NEXT §12 第 17 項加入橫向 smoke，也放進這張清單），每種已出貨的語言都在現有尺寸跑一次（`viewport-smoke` 的 1440×900、1280×720、390×844、360×740、360×640、844×390；`shell-smoke` 的 302–734 px 寬與 Safari 橫向）。現有的門檻（無橫向溢出、控件 ≥ 43.5 px、提示不加高）全部照用。
- **以顯示寬度而非字數定預算。** T1 詞彙已把 ASCII 算 0.5 個單位；把同一個量法推廣到提示與標籤，並為每個語言定上限。
- **L0 先用一個不出貨的「加長偽語言」。** 把源字串加長並包上標記，用來找出寫死的字串與溢出位置，Android 的 `en-XA` 偽語系就是這個用途（[Android](https://developer.android.com/guide/topics/resources/pseudolocales)）。
- **已知熱點：** dock 的兩字標籤（英文要改成短詞或圖示加短詞）、市集 7 個分頁、遊戲內 3 處直排文字（非中日文改為橫排）、遊戲 CSS 中 511 個為中文調的 `letter-spacing`（在 `:lang(en)` 下重設；預覽頁的 275 個不屬遊戲）、≤ 50 px 卡面上的英文名、T1 提示與 coach mark ② 的行數。
- 版面修改屬每個語言階段的一部分，不在 L0 做，L0 只確保量得到。

### 3.6 存檔身份永不從顯示文字推導

- **稱號：** 把「聽見萬聲」與「借得東風」當作凍結的不透明 id，永不翻譯這兩個常數；顯示時經目錄查找對應的名稱。這樣不需要存檔遷移。日後新增的稱號一律用 ASCII id。
- **牌組名稱：** 現有存檔裡的名稱是玩家資料，原樣顯示。L0 之後新建的牌組，預設名稱在建立時以當時語言寫入，不存空值（§9 第 7 項，agent 代選，理由見該項）。
- **不從語言推導任何資格或地區。** [MOBILE-RELEASE](MOBILE-RELEASE.md) 第 204 行已說不以語言判斷購買資格；同樣不以語言決定地區、日界或獎勵。

## 4. 內容翻譯流程

### 4.1 詞彙作術語庫

- 以 T1 的 20 個詞彙條目為起點，擴充成術語庫：每個詞一個 ASCII id，記錄每個已出貨語言（首批 `zh-Hant`、`zh-Hans`、`en`）的寫法、用法說明，以及**為甚麼這樣譯**。IGDA 指南建議記錄命名決定的理由（[IGDA](https://igda-website.s3.us-east-2.amazonaws.com/wp-content/uploads/2021/04/09142137/Best-Practices-for-Game-Localization-v22.pdf)），讓後來的譯者不會重新爭論。
- 術語庫先於大批翻譯完成。IGDA 估計小型作品的熟悉與術語階段約一週，大型 MMO 可達六週。
- 遊戲內 UI 從目錄取詞，術語庫與目錄的一致性可以用測試檢查（例如每個術語在該語言的目錄中至少用法一致）。

### 4.2 翻譯來源紀錄（仿照美術紀錄）

美術每張圖都有 prompt 與來源紀錄（[ART.md](ART.md) 與各 `ART-*.md`）。翻譯也應如此：每批翻譯記下源 commit、日期、方法（人工、外包、機器預譯加人工審校）、審校者角色與 LQA 結果，放在每個語言一份的紀錄中（例如 `docs/L10N-en.md`）。理由是玩家分辨不出哪句從未經母語者看過；紀錄讓之後的人知道哪些字串需要再審，也讓機器預譯可以被誠實地使用。

Owner 於 2026-10-21 選定由 **Claude 起草**（§9 第 5 項），所以每條起草的字串另記三項：模型（名稱與版本）、起草日期、源字串（`zh-Hant`）的雜湊。雜湊的用處是：源字串之後改了，雜湊就對不上，查得出哪些譯文是照舊句譯的、要重審。審閱完成時記下審閱者與日期；首批由 owner 審閱（4.4）。

### 4.3 簡體中文

- 繁轉簡可以用 OpenCC 這類字典轉換打底：它是確定性的字典轉換，不用 LLM，不做翻譯（[OpenCC](https://github.com/BYVoid/OpenCC/blob/master/README.md)）。它的地區詞彙主要收名詞，動詞、語法與語氣不在範圍內（[規範](https://github.com/BYVoid/OpenCC/blob/master/doc/regional-phrase-criteria.md)）。
- 覆核時重現了以下問題（OpenCC 1.4.2，2026-10-21）：`t2s` 把 鍾馗 轉成 锺馗 而非常見的 钟馗；反方向 `s2t` 系列把 宁采臣 轉成 寧**採**臣；`s2twp` 不處理 充值。所以名稱一律以術語庫覆蓋，再由流利的讀者審校（人選見 4.4）。
- 店名與作品名可能要重新創作而非轉換（例如 Squad Busters 的 破壞突擊隊 對 爆裂小队）。
- **首批的做法：** 字典轉換打底；Claude 調整字典轉換不處理的動詞、語法與用詞，名稱以術語庫覆蓋；再由 owner 審閱（4.4）。
- **中國大陸商店不在本計劃內。** 兩家都以另一個實體或發行商進入中國大陸；版號等要求本次沒有研究。Owner 於 2026-10-21 確定排除，直至另行研究（§9 第 9 項）。簡體中文服務新加坡、馬來西亞與其他地區的讀者。

### 4.4 語言品質測試（LQA）

- 依 IGDA：測試者要兼有優秀譯者與熟練玩家；修正由譯者負責；修正要在多於一個版本上回歸測試；每次更新都是一次小型本地化循環。
- Mythseal 每個語言的 LQA 至少包括：該語言的全部 smoke；一位流利的讀者完整玩一次首局（霧隱渡口 → 第一個結果 → 市集 → 藏卡）；在卡牌頁逐張讀過卡名、能力與傳說；結果記入 [VALIDATION.md](VALIDATION.md)。
- Supercell 的 LQA 由 Keywords 的專屬語言團隊負責（廠商自述）。Mythseal 沒有預算前提。
- **LQA 是每個語言階段的出口證據（§6）。** 理由：玩家分不出哪一句從沒有人讀過，起草得再通順，也要有人以讀者身份讀過一遍，那個語言才算完成。
- **首批的人選（owner，2026-10-21）：** 英文與簡中都由 owner 審閱，也就是上面 LQA 中讀者的一步（首局與逐張讀卡）；smoke 由 agent 跑。Claude 起草、owner 審閱是 agent 在 2026-10-21 提出的做法，owner 同日同意，並把英文也接過來：「英文翻譯就我review啦」。簡中以字典轉換打底，審閱主要是對照繁中源文看用詞、名稱與語氣，而源文的名稱與語氣本來就由 owner 決定。之後按熱度加入的語言，人選到時再定。

### 4.5 文學名稱與文化審閱

- **日文** 有成熟的讀法：孫悟空 Son Gokū、豬八戒 Cho Hakkai、沙悟淨 Sa Gojō；賈寶玉 Ka Hōgyoku、林黛玉 Rin Taigyoku（[ja.wikipedia 紅楼夢](https://ja.wikipedia.org/wiki/紅楼夢)）。日本常把沙悟淨畫成河童，原著並無此設定；豬八戒的「猪」字常令日本讀者混淆（[HugKum，2024-09-11](https://hugkum.sho.jp/640161)）。OpenCC 的 `t2jp` 只供研究，不建議用於正式產品，且會把 豬八戒 原樣保留，而日文慣用 猪八戒。聊齋志異於 1768 年傳入日本，江戶時代已有森島中良的翻案（[Fleming，2013](https://chinajapan.org/pages/20.0-strange-tales-from-edo.html)）。近代的例子：芥川龍之介〈酒虫〉（1916）翻案自卷五〈酒蟲〉；太宰治〈清貧譚〉、〈竹青〉受田中貢太郎的譯本啟發；手塚治虫以「新・聊斎志異」為題畫過漫畫（1971–1987）（[ja.wikipedia 聊斎志異](https://ja.wikipedia.org/wiki/聊斎志異)，wiki）。
- **韓文** 用漢字音：손오공、저팔계、사오정、삼장법사；가보옥、임대옥、설보채、왕희봉（[ko.wikipedia 서유기](https://ko.wikipedia.org/wiki/서유기)、[홍루몽](https://ko.wikipedia.org/wiki/홍루몽)）。
- **英文** 要先定政策：拼音（Sun Wukong）、意譯（Monkey King）或兩者並列。黑神話：悟空 由開發方訂下 loong、yaoguai 等詞（[Altagram 案例](https://altagram.com/case-studies/black-myth-wukong-a-localization-journey-with-altagram-and-game-science/)），主創亦承認低估了 11 種語言所需的時間，上市時部分內容未翻譯（[The World of Chinese，2024-10-09](https://www.theworldofchinese.com/2024/10/lost-in-translation-localization-challenge-black-myth-wukong/)）。
- **英文名稱政策（2026-10-21，agent 代選，§9 第 4 項）：** 拼音名在前，著名的稱號意譯在後，例如 "Sun Wukong, the Monkey King"；沒有著名稱號的只用拼音名，例如 "Lin Daiyu"；版面窄的地方（≤ 50 px 卡面、戰鬥桌）用拼音短名，例如 "Wukong"。拼音不加聲調符號，與卡牌 id（`wukong`、`lindaiyu`）一致。理由：拼音就是名字本身，玩家可以拿它去查原著與其他作品（黑神話：悟空 的英文名也保留 Wukong）；意譯稱號讓不認識這個名字的讀者知道他是誰；只用意譯（Monkey King）的話，沒有現成稱號的人物與原創角色就無從譯起。每個名字的寫法與理由記入術語庫（4.1）。
- 上面日文、韓文兩段現在是候選語言的參考，不是排定的工作（§6）。
- **宗教與神話內容：** IGDA 把歷史、宗教信仰、族群與地緣政治列為四大文化風險，建議按與現實信仰的距離判斷並記錄決定。Kakuto Chojin（2002）因音效含古蘭經吟誦而在沙特等國被禁並全球回收（[Edwards，TRANS 15，2011](https://hispadoc.es/descarga/articulo/4133907.pdf)）。每個語言的 LQA 要有一行文化審閱，看佛、道神祇與孔子等人物的呈現。中國大陸對神怪題材的內容規定本次沒有研究。

## 5. App Store 與 Google Play 本地化

**首次上架的語言（§9 第 3 項，agent 對 owner 2026-10-21 答覆的讀法）：** 首次提交最好帶英文、繁中與簡中。所以下面每一項都按三種語言準備：各自的 `.lproj` 與 `values-*`（5.1、5.2；源語言繁中是否也要自己的 `.lproj` 才會出現在語言欄，以 TestFlight 確認）、商店資料（5.3）與截圖（5.4）。「最好」是偏好，不是門檻：某一語言未齊時，可以先以已完成的語言提交，之後再加。語言不決定上架地區（5.5）；中國大陸商店排除（4.3）。

### 5.1 iOS bundle

- App Store 的語言欄由 `.lproj` 資料夾決定（見 1.1）。一個 Capacitor app 只在 `CFBundleLocalizations` 加了 7 個語言，App Store 仍只顯示英文；發問者自己的答案是要靠 `.lproj`（[Apple 論壇，2026-06](https://developer.apple.com/forums/thread/836440)，非 Apple 職員）。Mythseal 已有 `Base.lproj`，所以 `CFBundleLocalizations` 的後備推斷不會生效（推論）。
- 每個出貨語言加一個 `<語言>.lproj/InfoPlist.strings`，或在 target 上用 `InfoPlist.xcstrings`（Apple 工程師在論壇的建議，[2023-12](https://developer.apple.com/forums/thread/743218)），至少本地化 `CFBundleDisplayName`。Mythseal 沒有 `NS*UsageDescription`，所以權限提示目前不用譯。`CFBundleLocalizations` 同步更新，用來表明意圖（Apple 文件稱之為 app 自行處理的語言，[Apple](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundlelocalizations)）。
- 小心依賴或建置腳本帶入多餘的 `.lproj`，它們也會出現在語言欄（同一 DTS 討論串，2025-02）。
- 第一次加語言後，以 TestFlight 版本確認 App Store 顯示的語言；空殼 `.lproj` 是否足夠，本次沒有證實。

### 5.2 Android

- 每個語言一個 `values-<語言>/strings.xml`（至少 `app_name`）；`values/` 的預設資源保持完整。
- 以 `android:localeConfig` 或 AGP 8.1+ 的 `generateLocaleConfig` 宣告支援的語言，讓 Android 13+ 的每 app 語言設定可用；舊版以 AppCompat 的 `setApplicationLocales` 相容。
- Play Console 的 Gemini 字串翻譯只提到 `strings.xml`，不會處理 WebView 內的 JavaScript 字串（推論）。

### 5.3 商店資料

| 欄位 | App Store | Google Play |
| --- | --- | --- |
| 名稱 | 2–30 字元 | 30 字元 |
| 副標／簡短說明 | 30 字元 | 80 字元 |
| 關鍵字 | 100 位元組（中日韓在 UTF-8 約 33 字，推論） | — |
| 推廣文字 | 170 字元 | — |
| 說明 | 4,000 字元 | 4,000 字元，全形與半形同樣計算 |

來源：[App Store Connect](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)、[Google Play](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)。

- Apple 有 50 種商店語言；中文只分簡、繁，香港、澳門、台灣對應繁體。使用者的語言沒有對應時，先用「下一個最相關」的語言，再退回主要語言（[Apple](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/)）。美國店面除英文外也支援簡中、繁中、韓文等（[Apple](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations/)）。
- 更改主要語言需要該語言已核准的資料與截圖。
- Google Play 對未翻譯的商店頁可讓使用者選看自動翻譯；Play Console 提供 10 種語言的免費機翻（未經審校）與按字收費的外包翻譯（每字 0.07 美元起，[Google](https://support.google.com/googleplay/android-developer/answer/9844778?hl=en)）。自訂商店頁最多 50 個、每國一個，不會自動翻譯（[Google](https://support.google.com/googleplay/android-developer/answer/9867158?hl=en)）。
- **店名：** 兩家都有部分作品按市場重新命名、部分近乎直譯。萬象契／Mythseal 在簡中與日後語言的店名仍由 owner 決定；[NAMING](NAMING.md) 已說明品牌決定不等於商標查核。

### 5.4 每個語言的截圖

- Mythseal 的截圖會顯示介面文字，所以每個語言要有自己的截圖。App Store Connect 新增語言時，截圖預設沿用主要語言的那套（說明與關鍵字除外），不處理就會在英文頁面顯示中文介面。
- 截圖可以由現有的 Playwright smoke 在商店尺寸、以 `LOCALE` 參數產生，保證與實際遊玩畫面一致。
- 圖片不含文字的美術政策讓同一張圖可以配不同語言的說明文字，說明以程式排版。
- **上架之前：** owner 於 2026-10-21 選了上架：ArtCraft 產出在取得書面商業使用確認前不能上架。`art/own-reference-policy` 分支的 ART-ONBOARDING 把上架讀作商店上的發佈或商店頁；TestFlight 這類既未發佈也未列出的商店建置、以及 mythseal.com 是否算上架，尚未問 owner。任何語言的截圖背景或主視覺若用到 ArtCraft 圖，同樣受這個條件約束。
- **披露一致：** Habby 的例子顯示同一作品在 Apple 的「Contains」與 Google 的 IARC 描述可以不一致。分級問卷的答案記錄一次，所有商店與語言沿用。

### 5.5 語言不等於地區

上架地區仍是開放決定（[MOBILE-RELEASE](MOBILE-RELEASE.md) 第 269 行；ROADMAP Decisions 表）。加一種語言不代表在講該語言的地區上架；反之亦然。例子：Habby 四款作品在 Google Play 越南區回傳 404（原因未研究）；俄羅斯區 App Store 查不到 Supercell 的七款遊戲，也查不到 Habby 的 Survivor!.io、Capybara Go! 與 Dicero!，同一公司的其他作品則在（1.2）。

## 6. 分階段

每個階段都是獨立、可審閱的工作包，結束時把證據記入 [VALIDATION.md](VALIDATION.md)，翻譯來源記入該語言的紀錄。

| 階段 | 內容 | 出口證據 |
| --- | --- | --- |
| **L0 · 抽出字串，畫面不變** | 建立 `zh-Hant` 目錄並把 UI 字串移入；錯誤與引擎回合 `notes` 改用碼；格式化集中；稱號當作凍結 id；`<html lang>` 由目錄設定；smoke 改以 `data-action` 與碼定位，而非可見中文；一個不出貨的加長偽語言；一個前後擷取比對步驟：`viewport-smoke` 本來就存截圖，`shell-smoke` 只在失敗時存，`coach-smoke` 與 T1 的 `guide-smoke` 不存，所以 L0 要在搬字串前後，以現有尺寸、Chromium 與 WebKit 擷取這三個 smoke 走到的畫面 | `npm test` 與現有 smoke（含 `test:viewport`、`test:shell`、`test:coach`、`test:guide`）在兩個引擎全過；`viewport-smoke` 的截圖與 L0 的前後擷取逐像素相同；建置的允許清單只多了目錄檔；UI 程式碼中的中文字數降到只剩目錄與內容資料 |
| **L1 · 語言選擇與管線** | 網頁偵測與遊戲內選擇（例如放在 聲息與節奏，T1 的開關也在那裡）；iOS 與 Android 的原生橋接；`:lang()` 字體堆疊；`LOCALE` 參數接上 smoke | 仍只出 `zh-Hant`；偽語言在網頁、iOS 與 Android 都能切換並通過 smoke |
| **L2 · English** | 先譯術語庫與卡名政策（4.5）；再譯 UI、詞彙、卡牌與首局（霧隱渡口）；之後是戰役與活動；故事散文最後。Claude 起草並記來源（4.2）。處理 dock、分頁、直排與 `letter-spacing`。`en.lproj`、`values-en`、商店資料與截圖 | 英文在所有現有尺寸通過 smoke；owner 的 LQA 首局紀錄（4.4）；每個詞彙與卡名都有術語條目與理由 |
| **L3 · 简体中文** | 字典轉換打底，Claude 調整語氣與用詞，術語庫覆蓋名稱，owner 審閱（4.4）；`zh-Hans.lproj`、`values-b+zh+Hans` 與商店資料；中國大陸商店除外 | 同 L2 |
| **L4 起 · 按熱度選定的語言** | 每次由 owner 按熱度證據選一種（見下）。候選與各自的額外工作：日本語（讀音與既有譯名、`:lang(ja)` 字體、文化審閱）；한국어（漢字音名稱、`:lang(ko)` 字體、文化審閱）；泰文、越南文（Habby 的試營運市場）；FR、DE、ES、PT、RU、ID 等 Supercell 共有語言；阿拉伯文要 `dir="rtl"`、邏輯屬性與直排替代，是另一級工作 | 同 L2，但 LQA 的讀者到時再定（4.4）；加文化審閱一行 |

**次序的理由：**
- **英文與簡中是首批（owner 2026-10-21）。** 英文先做：現有介面已有約 26 個英文小標（例如 THE ART OF THE DUEL）、品牌是 萬象契 + MYTHSEAL、`privacy.html` 是唯一的中英對照頁；NAMING 要求與英語玩家測試名稱並以兩種語言檢查排版。英文也是版面最難的情況（由中文變長），先做能讓 L0 的預算真正被測試。
- **簡中緊接：** 字典轉換加術語庫令成本最低，審閱時可以逐句對照繁中源文；它服務新加坡、馬來西亞與其他地區的讀者（4.3）。
- **之後按語言熱度，而不是預先排好。** 熱度證據不靠遙測也看得到：商店後台本來就按地區提供的匯總（例如上架後各地區的下載數）；試玩者與 TestFlight 測試者主動要求的語言；社群裡的要求（評論、來信）。這些都不需要遊戲收集任何東西。§1 的兩家語言表是先驗參照：日、韓屬兩家共有的五語言核心；Archero 2 在美日歐上架後首月，日本是第二大營收市場（約 22%，Sensor Tower），韓國在亞洲先行期的估計中約佔三成（1.2）；兩種語言都有成熟的西遊、紅樓譯名傳統，這降低命名風險，但提高讀者對譯名的期望。所以它們是有力的候選，但要等證據指向它們才排進來。
- **繁中已是源語言**，所以首批做到 L3 即有三種語言。

## 7. 與 v0.6.0、M5、M7 的關係

- **不在 v0.6.0：** v0.6.0 的範圍已定；L0 會碰到大量檔案與測試，混入發佈會重開範圍。
- **與 T1 及 v0.6.0 的次序：** T1 新增約 890 個漢字、`glossary.mjs`、`first-visit.mjs` 與 `guide-smoke`。v0.6.0 也還有未合併的工作落在 L0 要改的檔案上：[RELEASE-NEXT §12](RELEASE-NEXT.md#12-owner-decisions-needed) 第 17 項（701 px 以下的橫向手機）與第 18 項（直式手機的垂直空間）仍待 owner 決定，修正屬新的 CSS 工作；這些版面修正與 v0.6.0 的 review 修正會改 `app.mjs`（2,806 個漢字，最大的 UI 字串檔）、`expansion.css`、`scene-navigation.css`、`tools/shell-smoke.mjs` 與 `tools/save-durability-smoke.mjs`，並可能加一個橫向 smoke。L0 正要搬走 `app.mjs` 的字串，並把每個 smoke 的定位由可見中文改成 `data-action`。所以 L0 應在 T1 合併、**並且** v0.6.0 候選版建好（[RELEASE-NEXT §5 Phase A](RELEASE-NEXT.md#phase-a--build-the-release-candidate-agent-no-hosted-access)）之後才開始；最少也要等第 17、18 項有決定、修正（如有）已合入。否則同一批檔案會有兩位作者（[AGENTS.md](../AGENTS.md)：每個檔案一位作者）。2.4 的版面熱點行號要在那時重新量；新加的橫向 smoke 放進 3.5 的 `LOCALE` 清單。
- **M5（行動版與封測）：** M5.3 準備 onboarding、支援、私隱、分級與披露資料。若封測要邀請非中文玩家，L0–L2 要在封測版本之前完成；否則封測可以只用 `zh-Hant`。
- **M7（商店上架）：** M7 要準備商店截圖與資料。Clash Royale 在全球上線前已加入 14 種語言；Habby 早期作品則先上架、後本地化。按 agent 對 owner 2026-10-21 答覆的讀法，首次提交最好帶英文、繁中與簡中（§9 第 3 項），所以 L0–L3 與三種語言的 `.lproj`、商店資料與截圖最好在提交前完成，並且截圖中的 ArtCraft 圖要先有書面確認。這是偏好而不是門檻（§5 開頭）。

## 8. 成本與風險

### 8.1 成本

- **工程：** L0 是最大的一筆：約 67 個檔案、約 1,350 行源碼、938 行測試要改動，且要保證畫面不變。每個語言之後的版面工作集中在 dock、分頁、戰鬥桌與直排文字。
- **翻譯量：** 執行期約 26,600 個漢字（UI 約 16,700 加內容約 9,900，不計預覽頁；與 2.1 一致），首批要譯成英文與簡中兩種。中文字數換算英文字數因文體而異，本計劃不作估算。
- **翻譯的花費（§9 第 5 項）：** owner 於 2026-10-21 選了由 Claude 起草，所以草稿不需要外包預算。真正的成本是 owner 審閱的時間：首批兩個語言各玩一次首局、逐張讀卡（4.4）。只有日後另選外包時，才需要用 L0 匯出的實際字串清單去報價；Google 列出的每字 0.07 美元是商店頁翻譯，不是遊戲文字的報價。
- **持續成本：** 每個新字串都要每個已出貨語言跟上（首批是英文與簡中兩種）；IGDA 把每次更新視為一次小型本地化循環。起草快，審閱仍要時間，所以這會拖慢 LZ-01、HL-01 等內容的發佈節奏。這是免費遊戲，沒有預算承諾；任何付費外包都要 owner 另行授權。

### 8.2 風險

| 風險 | 緩解 |
| --- | --- |
| 翻譯了被當作存檔身份的中文常數，舊存檔驗證失敗 | 3.6：稱號當作凍結 id；新身份一律 ASCII |
| L0 的大量改動與 T1、v0.6.0 仍在進行的版面與 review 修正衝突 | T1 合併、v0.6.0 候選版建好後才開始（§7）；一個檔案一位作者；L0 可按模組分批 |
| 測試大量以中文定位，改動時漏掉 | 先把定位改為 `data-action` 與錯誤碼，再搬字串 |
| 302 px 與直排位置的版面倒退 | 每個語言在現有尺寸跑 smoke；偽語言先找熱點 |
| 漢字字形用錯（`lang` 不對） | 首次繪製前設 `<html lang>`；`:lang()` 字體堆疊；混排標 `lang` |
| 機器起草或不一致的名稱降低文學品質 | 術語庫與理由；每條起草譯文記模型、日期與源字串雜湊（4.2）；每個語言的 LQA 是階段的出口證據，首批的讀者是 owner（4.4、§6）；名稱與語氣在上架前經 owner 讀過 |
| App Store 語言欄顯示不出已出貨的語言，或因多餘 `.lproj` 顯示未出貨的語言 | 每個語言一個真實的 `.lproj`；以 TestFlight 確認 |
| 內容發佈因等翻譯而變慢 | 新內容可以先以源語言發佈並明示，或等齊語言再發佈；由 owner 按語言決定 |
| OTP 郵件的粵語口語與遊戲書面語不一致 | 改為書面語（§9 第 8 項，agent 代選） |
| 把語言誤當作地區或資格 | 3.6 與 5.5 |

## 9. Owner 決定

Owner 於 2026-10-21 回答：首批語言要英文、繁中與簡中，日後按語言熱度再加（原話：「preferably language have english, chinese(traditional and simplified). Would add more based on language popularity later on.」），譯文由 Claude 起草、owner 審閱；其餘「照建議」。本文原本沒有建議的地方（第 4 項的英文名稱、第 7、8 項）由 agent 選定並寫明理由，標為「agent 代選」。第 2 項怎樣量熱度、第 3 項把 preferably 用在首次提交上，是 agent 對這句原話的讀法，標為「agent 的讀法」。兩者 owner 都可以推翻。

1. 接受把多語言列為路線圖的 M4.7（proposal），不放入 v0.6.0。
   - **已答 · 2026-10-21：** 接受。
2. 語言次序：建議英文 → 簡中 → 日文 → 韓文；日韓先後可對調。
   - **已答 · 2026-10-21：** 首批是繁中（源語言）、英文與簡中；更多語言之後按語言熱度加入。日文與韓文因此不再是既定的下一批，而是候選。**怎樣量熱度（agent 的讀法）：** 用不靠遙測也看得到的證據：商店後台本來就按地區提供的匯總（例如上架後各地區的下載數）、試玩者與 TestFlight 測試者主動要求的語言、社群裡的要求（評論、來信）；§1 的兩家語言表作為先驗參照。§6 已按此改寫。
3. 哪些語言要在**上架之前**（M7 首次提交）完成，還是先以 `zh-Hant` 上架、之後再加。
   - **已答 · 2026-10-21（agent 的讀法）：** owner 的原話「preferably language have english, chinese(traditional and simplified)」沒有直接提到首次提交；agent 讀作首次提交最好帶英文、繁中與簡中。這是偏好，不是門檻（§5 開頭、§7）。owner 可以推翻。
4. 英文名稱政策（拼音、意譯或並列，例如 Sun Wukong／Monkey King）以及各市場的店名。
   - **已答 · 2026-10-21（agent 代選）：** §4.5 只說要先定政策，沒有建議。agent 選了並列：拼音名在前、著名的稱號意譯在後，例如 "Sun Wukong, the Monkey King"；窄位用拼音短名 "Wukong"。理由見 4.5 的英文名稱政策一項。各市場的店名沒有在這次回答中決定，仍由 owner 決定（5.3）。
5. 翻譯途徑：owner 自譯、志願者、外包，或機器預譯加人工審校；是否有任何預算。
   - **已答 · 2026-10-21：** 由 Claude 起草；每條起草字串記模型、日期與源字串雜湊（4.2）。草稿因此不需要外包預算；任何付費外包仍要 owner 另行授權（8.1）。
   - **由誰審閱 · 已答 · 2026-10-21：** owner 審閱英文與簡中，作為兩者 LQA 的讀者（4.4）。英文是 owner 自己接下的：「英文翻譯就我review啦」。每個語言階段仍以 LQA 為出口證據（§6），因為起草的譯文通常通順，但文學名稱、語氣、雙關與典故最容易譯得「意思對、讀來不像」，而玩家分不出哪一句沒有人讀過。
6. 語言偏好只存裝置本地（建議），還是隨雲端備份同步。
   - **已答 · 2026-10-21：** 只存裝置本地（照建議，3.2）。
7. L0 之後新牌組的預設名稱：建立時以當時語言寫入，還是存空值並按語言顯示。
   - **已答 · 2026-10-21（agent 代選）：** §3.6 說兩者都可行，沒有建議。agent 選了建立時以當時語言寫入。理由：`normalizeDeckName` 把空的名稱補成「牌組 N」（`collection.mjs:166-167`），而它在每次載入存檔（`hydrateCollection` 經 `repairDecks`，`collection.mjs:175,266`）與每次儲存牌組（`saveInstanceDeck`，`collection.mjs:358`）時都會執行，所以存空值要先改存檔的正規化與驗證；以當時語言寫入則不改存檔格式，與現有存檔一致，名稱就是玩家資料。代價：換語言後，舊的預設名稱仍是原來的語言，直到玩家改名。
8. 繁中字形：只用台灣字形，還是另設 `zh-Hant-HK`；OTP 郵件改為書面語還是保留粵語。
   - **已答 · 2026-10-21（agent 代選）：** 本文原本沒有建議。字形：首批不另設 `zh-Hant-HK`，香港與澳門的裝置用同一份 `zh-Hant` 目錄。理由：遊戲用書面語，台港讀者讀同一份文字；字形差異屬字體，不屬翻譯；另設語系會令每條字串多一次審閱。若香港的試玩者指出字形或用詞問題再議；屆時 `<html lang>` 可以帶 `zh-Hant-HK` 而不必另設目錄，因為 `:lang(zh-Hant)` 仍會配對它（推論，未測試字體效果）。OTP 郵件：改為書面語，與遊戲語體一致；它現在標為 `zh-Hant` 卻用粵語口語寫（2.6）。郵件只由網頁版帳號寄出，商店版不含帳號程式碼（[IOS-FIRST-FLIGHT](IOS-FIRST-FLIGHT.md)），所以其他語言的郵件等網頁帳號真的有英文或簡中玩家時再定。改模板屬帳號服務的發佈工作，本計劃不執行。
9. 中國大陸商店是否明確排除在外（建議排除，直至另行研究）。
   - **已答 · 2026-10-21：** 排除，直至另行研究（照建議）。簡中仍服務新加坡、馬來西亞與其他地區的讀者（4.3）。
10. 字體：維持系統字體（0 位元組，建議），還是考慮委託品牌展示字體。
    - **已答 · 2026-10-21：** 維持系統字體（照建議，3.4）。

## 10. 本次未確立

- Habby 現時遊戲內的語言清單：沒有找到設定或支援頁面；2019 年加入的語言今天是否仍在不能確定。
- Supercell 遊戲內語言是否與 App Store 宣告一致：沒有獨立核實。
- 西班牙文與葡萄牙文的地區變體（es-ES 對 es-419、pt-BR 對 pt-PT）：App Store 欄位只寫 Spanish、Portuguese。
- 兩家的內部字串格式與鍵命名慣例。
- Habby 的本地化流程（內部譯者或外包）：沒有找到相關廠商案例、職缺或演講。
- Supercell 是否為阿拉伯文、希伯來文、波斯文整體鏡像介面：只有 RTL 相關的當機修正記錄。
- 一項自行做的文字寬度量度（10 個字串、兩種系統字體）無法重現，不採用其數字。
- iOS 每 app 語言設定是否需要多於一個 `.lproj`；Android WebView 在每 app 語言下的 `navigator.language` 行為。
- 中國大陸對神怪、「迷信」題材的內容規定，以及版號流程。
- Habby 在越南區下架的原因。
