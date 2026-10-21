# 山海行旅：本機進度與經濟

這是《萬象契》的原創單機延伸，並非已考證的《神魔令》原版數值。貨幣、抽卡、NPC 交易與 AI 擂台積分仍屬本機遊戲；現有帳號服務只提供私人旅程備份，不驗證遊戲結果。真人交易與線上排位尚未實作。

2026-09-22 本機擴充加入西遊、封神、白蛇三卷，共十二個新故事地點，以及每週任務。
原有山海六境維持原 ID 與獎勵；渡口首勝後可自由選擇三卷入口，各卷內依序解鎖。
完整內容與模式邊界見 [STORIES-AND-MODES.md](STORIES-AND-MODES.md)。

## 保存與遷移

`progression.mjs` 是純函式模組，不讀寫儲存空間。v0.4 使用 `shanhai.profile.v3`，UI 沒有 v3 時讀取 `LEGACY_PROFILE_KEY`（`shanhai.profile.v2`），遷移後保存新鍵，保留 v2 原檔作備份；更舊的 `shanhai.deck.v1` / `shanhai.stats.v1` 仍可傳給 `hydrateProfile`。函式會驗證舊牌組，保存有效對局統計；無效資料以安全預設值修復。新旅程起始 1,200 金幣、20 靈砂、0 修為，每張卡 Lv.1。

`collectionExpansion: 1` 延續 v0.3 的古典群英擴充。新旅程得到 12 張原創角色與悟空、關羽、林黛玉、孔子各一張：共 24 位可收藏角色，其中 16 位已擁有，另外 8 位待抽取或向 NPC 購入。尚未領過擴充的 v2 存檔，只把這四張的數量補至最少一張，已有多張時不再增加。

每張實體卡有固定 UID、獨立經驗與等級。遷移 v2 時，舊數量會逐張建立實體，舊角色共用等級會複製到每張卡，XP 設為該等級門檻；例如原本三張 Lv.4 青霄，會得到三個不同 UID、各 400 XP 的 Lv.4 青霄。已遷移的 v3 只以 `instances` 與 `merchantVault` 為準，絕不根據舊 `inventory` / `levels` 重新送卡；即使資料缺漏也不補發。新旅程來源標記為 `starter` / `welcome`；實際舊藏遷移為 `migration`。

檔案格式：

```js
{
  version: 3,
  collectionExpansion: 1,
  collectionVersion: 1,
  coins, dust, xp,
  instances: [{ uid, cardId, level, xp, locked, battles, wins, acquiredAt, origin }],
  instanceSerial,
  deckSlots: [{ id, name, instanceIds: [/* 8 個實體 UID */] }],
  activeDeckId,
  merchantVault: [{ instance, sellPrice, buybackPrice, soldAt }],
  inventory: { [cardId]: copies }, // 由背包實體派生的相容欄位
  levels: { [cardId]: level },   // 出戰牌組該張實體的等級；未出戰則取最高 XP 副本
  deck: [/* 出戰牌組的 8 個不同 cardId，總星數不超過 25 */],
  stats: { played, won },
  cleared: [/* 依序通過的 nodeId */],
  location: 'mist-gate',
  daily: {
    date: 'YYYY-MM-DD', loginClaimed, matches, expeditionWins, packs,
    arenaMatches, claimedTasks: [], arenaChestClaimed, trainingUsed,
    marketPurchases: { [cardId]: count }, expeditionCaches: []
  },
  arena: { points, played, won },
  weekly: { week: 'YYYY-MM-DD', matches, expeditionWins, arenaMatches, claimedTasks: [] },
  pending: null, // 或 { id, kind, nodeId, instanceIds, cardInstances: { [cardId]: uid } }
  serial: 0
}
```

所有操作回傳新的 profile；輸入不會被修改。失敗交易拋出 `RangeError`，不會扣除任何資源。`hydrateProfile` 只接受已知欄位和角色 ID，修復數值範圍、牌組、依序解鎖路線及有效的待結算對局。牌組不只需要八張、不同角色、總星數合法，亦必須全部是背包中的實體卡。實體與三套牌組規則由 [BACKPACK.md](BACKPACK.md) 所述的 `collection.mjs` 管理；經濟交易後會同步相容欄位。

本機 JSON 並非防作弊儲存；自行編輯資料、清除儲存或回復舊副本仍可改變進度。UI 必須於每次交易前讀取最新資料，並保存成功結果；支援時使用 Web Locks 避免多分頁同時領獎。

## 每日重置

每週任務獨立記錄在 `weekly`，以倫敦週一 00:00 為界，同樣遵守夏令時間與不倒退規則。
完成十場對局、五場遊歷勝局、五場 AI 擂台各有一份週獎勵；明確領取後不可重複。
舊存檔補入零進度，不從舊統計追發。跨週對局只計入結算那一週，放棄不計入。

以 `Europe/London` 午夜為界，遵循英國夏令時間。只有今日日期**晚於**已記錄日期時才重置，倒調時鐘不會重開前一天獎勵；日期回到曾記錄的日子之前，原有每日狀態會保留。新一天重置任務、登入禮、修行優惠、NPC 庫存、每日地圖寶箱與競技寶匣，不重置角色、首通、積分或正在進行的對局。跨日完成的對局計入完成當日。

| 項目 | 條件 | 金幣 | 靈砂 | 修為 |
| --- | --- | ---: | ---: | ---: |
| 登入禮 | 每日領取一次 | 160 | 8 | 20 |
| 今日落子 | 完成任意 2 場對局 | 100 | 6 | 30 |
| 山海行旅 | 贏得 1 場遊歷對局 | 120 | 8 | 40 |
| 星匣初啟 | 開啟 1 包卡牌 | 80 | 5 | 20 |
| 競技寶匣 | 完成 3 場競技對局 | 240 | 16 | 60 |

三個每日任務均需手動領取一次；完成數顯示到目標上限。練習對局計入「今日落子」和總勝場，但沒有直接對局貨幣、修為或競技積分。

## 遊歷與競技

地點順序：霧隱渡口 → 青玉森庭 → 赤燼關 → 鏡月澤 → 雲闕天階 → 歸墟王座。首次獲勝解鎖下一站；可重遊已解鎖地點。進入對局時移動旅人所在位置，不收取入場費或體力。

下表 `i` 為地點索引 0–5：

| 遊歷獎勵 | 金幣 | 靈砂 | 修為 |
| --- | ---: | ---: | ---: |
| 每次勝利 | 80 + 20i | 2 + floor(i / 2) | 30 + 10i |
| 一次性首通加獎 | 140 + 40i | 8 + 2i | 50 + 10i |
| 每站每日首勝加獎 | 80 + 15i | 4 + i | 20 |
| 平手 | 35 | 0 | 10 |
| 敗北 | 20 | 0 | 10 |

首通與每日首勝可同場獲得。敗北、平手不解鎖下一站，也不消耗首通或每日首勝獎勵。

競技場為 AI 對戰，本機積分勝 +30、平 +10、負 +5；不是線上匹配或 Elo。勝利 90 金幣 / 3 靈砂 / 35 修為，平手 45 / 1 / 15，敗北 25 / 1 / 15。段位門檻為 0、100、300、700、1,400、2,500 分。升降與卡牌數值由戰鬥 UI / engine 決定，本模組只記錄結果與結算。

`beginBattle` 保存唯一遞增 ID，以及開始時八張實體 UID 和角色到 UID 的對照，不會給獎；有待完成對局時不能再開始另一場。`finishBattle` 僅接受當前 ID，成功後清除 pending，同一個結果不可重領。UI 只應在 engine 確認 `status === 'finished'` 時，傳入結果及 `match.player.used` 作為 `playedCardIds`。只有真正出過的最多四位不同角色獲得卡牌 XP，即使中途切換出戰牌組，仍發給開始時鎖定的那張實體。`abandonBattle` 不給任何卡牌 XP 或對局獎勵。

v2 允許對局途中修改儲存牌組，但戰鬥快照只保存四張手牌，沒有原本八張牌組。遷移時 UI 可傳入 `legacyBattle`（完整舊戰鬥快照）：只在 encounter ID 相符、手牌恰好四位不同且已擁有的角色時使用。若目前牌組仍含全部手牌，沿用該牌組的 UID；否則保留四位原手牌，按星數最低、相同星數按角色資料順序補上四位不同已擁有角色，再驗證八張合計不超過 25 星。這額外四張是保守推定，不能宣稱還原原牌組。副本按最高 XP、再按最小 UID 選擇；v2 同角色副本原先共用等級，因此不損失舊等級。整個過程不修改目前出戰牌組、不送新卡，也不修改戰績或等級。缺少、無效、ID 不符或無法組成合法牌組的快照，沿用目前牌組映射；v3 不會再使用舊快照改寫已固定的 UID。

| 模式 | 勝利卡牌 XP | 平手／敗北卡牌 XP |
| --- | ---: | ---: |
| 遊歷 | 20 | 12 |
| 擂台 | 12 | 8 |
| 自由切磋 | 0 | 0 |

每張實際出過的卡均記錄一次對局，勝利時記錄一次勝場；練習亦記錄使用履歷，但不給 XP。未出牌、只在牌組中或同角色的其他副本完全不變。舊呼叫若省略 `playedCardIds`，只結算玩家獎勵，不推測哪些卡曾出戰。UI 可另存戰鬥快照；本模組不保存手牌和回合狀態。

## 修行

每張實體卡等級 1–5，累計 XP 門檻為 0 / 80 / 200 / 400 / 700；700 XP 為上限。手動修練會把**選中的 UID** 提升到下一級 XP 門檻，不影響其他副本。由等級 `L` 升到 `L + 1` 花費 `120 × L` 金幣與 `6 × L` 靈砂，不消耗卡牌副本。每日本帳簿限一次半價修行，金幣及靈砂均半價。未取得、已滿級或正在未完對局中的卡不能修練；已鎖定或編入牌組的卡可在對局外修練。舊角色 ID 升級入口優先選擇出戰牌組那張，否則選 XP 最高的副本。

執令者等級顯示為 `1 + floor(sqrt(xp / 100))`，目前僅表示累積修為，不給隱藏戰鬥加成。卡牌等級如何影響力量、傷害及各模式，由 `engine.mjs` 定義。

## 同名傳承

2026-09-22 本機版另提供「同名傳承」：在藏卡詳情選定主卡，再親自挑選同角色的本畫副本，每張提供 **80＋原有 XP**，不花金幣或靈砂。主卡可為任何畫作；AA／LAA／INK／TR、鎖定卡、任一已存牌組、未完對局與未確認開匣中的材料均受保護。確認後材料永久消耗、不進入商旅保管處；主卡原 UID、畫作與履歷保留。Lv.5／700 XP 上限不變，超額會先提示，整張多餘材料會被拒絕。詳見 [設計與原子儲存規則](DESIGN.md#同名傳承--local-2026-09-22)。

## 星匣：卡包與機率

每包 300 金幣、3 張，可重複。「萬象秘匣」（`all`，預設）包含全部 24 位角色；「群英秘匣」（`classics`）只包含 12 位古典角色。兩款價格、稀有度機率及保底規則相同，但同稀有度中的候選角色不同。收藏稀有度與戰鬥星數、力量、等級完全分開；不會改寫原卡的星數。每款卡包的同稀有度內，各角色等機率。

| 抽取位置 | 凡品 | 靈品 | 神品 |
| --- | ---: | ---: | ---: |
| 前兩格、一般第三格 | 60% | 30% | 10% |
| 前兩格皆凡品時的第三格 | 0% | 75% | 25% |
| 第三格整體機率 | 38.4% | 46.2% | 15.4% |
| 全部卡位的長期平均 | 52.8% | 35.4% | 11.8% |

因此每包至少一張靈品或神品；不能把一般卡位的 60/30/10 當作保底後每張卡的最終比例。RNG 可注入，數值必須在 `[0, 1)`；任何一步無效都不回傳已扣費的結果。

原創稀有度：凡品為青霄、曜衡、焰心、渡影、翠弦、雲牙；靈品為赤翎、霜璃、蒼角、織夢；神品為玄箋、燼麟。

古典稀有度：凡品為孔子、魯智深、武松；靈品為關羽、林黛玉、王熙鳳、諸葛亮、貂蟬；神品為黃帝、悟空、盤古、哪吒。這是本作收藏分類，不是歷史人物能力或舊遊戲稀有度的考證。每張新卡均有全新 UID、Lv.1、0 XP，已有同角色 Lv.5 亦不會令新副本變成 Lv.5。重複角色增加獨立實體，不會自動售出。

## NPC 卡市

按本機記錄日期，以固定雜湊排序選出 4 名不同角色，每名當日可買 2 張。先選排序最前的 2 名古典角色，再從其餘全部角色選出 2 名，因此每日最少有 2 名古典群英。刷新頁面不會更換貨架或補庫存，下一天才重置；每日輪替有機會出現相同角色。出售不會替 NPC 回補可購庫存。

| 稀有度 | NPC 全新卡售價 | Lv.1 收購價 |
| --- | ---: | ---: |
| 凡品 | 140 | 40 |
| 靈品 | 300 | 90 |
| 神品 | 600 | 180 |

出售選定的實體卡，收購價為上表基礎價加 `30 × (level - 1)`。已鎖定、放入任一儲存牌組、正在未完對局中或該角色最後一張的卡皆不能出售。舊 `sellCard(cardId)` 便利入口只會出售可賣副本中等級最低、再按 XP 最低的一張。

出售後，該張完整實體會移到 `merchantVault`，保留原 UID、XP、等級、取得日期、來源與勝場履歷，不會消失，也不自動過期。買回價格為出售價乘 1.25 後向上取整；付費後移回**同一張**卡，不能重複買回或同時留在背包與商人處。與每日 NPC 全新卡貨架分開；每日新貨始終 Lv.1 / 0 XP。出售再買回必定支付費用。本機 NPC 並非真人交易所，沒有訂單、競價或離線收益。

## UI 使用契約

- `createProfile({ now, legacyDeck, legacyStats })`、`hydrateProfile(raw, { now, legacyDeck, legacyStats, legacyBattle })`、`refreshDaily(profile, now)` 回傳 profile；`now` 預設為當前時間，測試可注入 ISO 字串或 Date。`legacyBattle` 只用於 v2 未完對局的手牌與實體對照修復。
- `claimLogin(profile, now)`、`claimTask(profile, id, now)`、`claimArenaChest(profile, now)` 回傳 profile。任務 ID 為 `matches` / `expedition` / `pack`。
- `getDailyTasks(profile, now)` 回傳 `{ id, title, description, field, target, reward, progress, claimed }[]`。
- `buyPack(profile, { set = 'all', rng, now })` 回傳 `{ profile, cards: [{ cardId, rarity, instanceId }], cost, set }`；`set` 只接受 `all` / `classics`，無效卡包在扣費前拋出錯誤。
- `getMarket(profile, now)` 回傳 `{ cardId, rarity, price, sellPrice, stock }[]`；`stock` 是剩餘庫存。
- `buyCard(profile, cardId, now)`、`sellCard(profile, cardId, now)`、`upgradeCard(profile, cardIdOrUID)`、`trainCard(profile, cardIdOrUID, now)`、`saveDeck(profile, ids)` 回傳 profile。
- 精確實體操作：`sellInstance(profile, uid, now)`、`buybackInstance(profile, uid, now)`、`upgradeInstance(profile, uid)`、`trainInstance(profile, uid, now)` 均回傳 profile。
- `getInstanceSale(profile, uid)` 回傳 `{ sellPrice, buybackPrice, reason }`；`reason` 為不可出售原因字串或 `null`。
- `getUpgradeCost(profile, cardIdOrUID)` 回傳 `{ coins, dust, nextLevel, maxed, instanceId, cardId, level, blockedReason }`；`getTrainingCost(profile, cardIdOrUID, now)` 另有 `used`。沒有持有的實體會拋出錯誤，UI 應先排除未入藏卡。
- `beginBattle(profile, { kind, nodeId, now })` 回傳 `{ profile, encounter }`；`kind` 為 `practice` / `expedition` / `arena`，只有遊歷需要 `nodeId`。
- `finishBattle(profile, { encounterId, winner, playedCardIds = [], now })` 回傳 `{ profile, reward: { coins, dust, xp, points, firstClear, dailyCache, cardXP } }`；`winner` 為 `player` / `opponent` / `draw`。每個 `cardXP` 變化為 `{ uid, cardId, beforeXP, afterXP, beforeLevel, afterLevel, gainedXP }`。
- `abandonBattle(profile)` 回傳 profile；`isNodeUnlocked(profile, nodeId)` 回傳 boolean。
- `getHeroLevel(profile)` 回傳數字；`getArenaRank(profile)` 回傳 `{ name, minimum, next: null | { name, minimum } }`。
- 公開唯讀資料：`NODES`、`RARITIES`、`CARD_RARITIES`、`PACK_PRICE`、`PACK_RULES`、`PACK_SETS`、`WELCOME_CARD_IDS`、`COLLECTION_EXPANSION`、`LOGIN_REWARD`、`ARENA_CHEST_REWARD`、`MAX_CARD_LEVEL`、`PROFILE_KEY`、`LEGACY_PROFILE_KEY`、`PROFILE_VERSION`。`PACK_SETS` 每項包含 `name`、`description`、`cardIds`。

## 驗證

`node --test tests/progression.test.mjs`：除每日、地圖、卡包與原子經濟交易外，涵蓋 v2 多副本等級遷移不重複、v3 不從相容欄位重新送卡、全新副本不繼承高等級、只修練指定 UID、完整實體出售／買回、所有牌組與鎖卡保護、買回費用與不足款項、切換出戰牌組後仍把 XP 發給原本 UID、實際出牌範圍驗證、練習使用履歷及重複結算不發 XP。這是本機規則驗證，並不代表真人網路交易或伺服器驗證。
