# 萬象契 · 交易／NFT／收藏卡路線：鏈上玩法、登入與 gas

狀態：**proposal · 2026-10-21**。沒有選定任何鏈、錢包供應商或市集；沒有部署合約、鑄造 token、開設付費服務或改變遊戲權益。外部來源全部於 **2026-10-21** 查閱；有頁面日期者另行註明。法例、監管機構、法院與公司自己的文件屬第一方，不另標示；新聞與分析標「報道」，律師事務所文章標「律師評論」，社群來源標「社群」。同日經一輪審閱後修正。本文是研究與建議，不是法律或稅務意見；標示「推論」的地方需要律師、會計師或平台預審確認。

擁有者今天的方向很清楚：逼玩家課金不道德，想走的是交易、NFT 與收藏卡。本文回答三件事：鏈上玩法怎樣接上現有遊戲、登入流程怎樣設計、實際交易的 gas 由誰付和怎樣付；並列出平台、法律與倫理上的界線，以及一條每步都可停下的分期路徑。

## 0. 目前位置

- **2026-09-23 的退役仍然有效。** [ROADMAP](../ROADMAP.md#retired-collectible-launch-phases) 把 M6／M7 收藏發行從交付目標中移除；本文不改寫那段文字，也不重新排入工作隊列。
- **2026-10-21 擁有者重新打開研究。** ROADMAP 已加一條日期紀錄，指向本文；退役文字保留為歷史，直到擁有者作出決定。
- **從實作計劃的依賴出發，但有一處偏離。** ROADMAP 指明若重開收藏，應從 [區塊鏈實作計劃](BLOCKCHAIN-IMPLEMENTATION-PLAN.md#ordered-implementation-packets) 的依賴出發。計劃的次序是：P0 現有遊戲準備 → P1 可信對局（M1–M2）；P2 本地收藏核心可與 P1 並行；P3 線上經濟（M3）之中，只有 NFT entitlement 需要的命令族會擋住試點，與之無關的玩家交易不必拖慢固定內容試點；然後才是 P4 testnet 試點與 P5 正式決策。計劃點名的下一步是 P1 的線上命令契約，加並行的 P2 不變量測試。**本文偏離這個次序**：建議先完成整個 M3 玩家交易（T0），才開 testnet 試點（T1）。理由見第 2.3 節；這是擁有者決定（第 7 節第 2 項），不是計劃本身的次序。
- **今天實際有的東西：**
  - 伺服器只有電郵登入與旅程備份；它不授權卡牌、XP、貨幣、交易或 NFT（[server/README.md](../server/README.md)）。沒有伺服器端卡牌身份、XP 帳或交易表。
  - 每張卡的編號、XP 與歷史只存在可自行修改的本地存檔（[BACKPACK.md](BACKPACK.md)）。
  - `contracts/` 只有一個本地 ERC-721 測試 fixture，沒有遊戲合約或部署腳本（[contracts/README.md](../contracts/README.md)）。
  - iOS 商店版不含帳號登入（[IOS-FIRST-FLIGHT.md](IOS-FIRST-FLIGHT.md)），所以手機上暫時沒有連結錢包的入口。
  - 實作計劃記下的原始碼基線（`ed60996`、433 項測試）已過時；今天 `main` 為 `3f3d351`。線上版本仍是 v0.5.1（[HOSTING.md](HOSTING.md)），v0.6.0 尚未發佈。

這份文件延續 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) 與 [NFT-STACK.md](NFT-STACK.md) 的設計：三層身份（人物、批次、每一張）、ERC-721 一張一枚、cap 計算曾經鑄造的總數、XP 由後端權威保存並隨卡轉手、逐張簽署的 XP checkpoint。下列兩處**偏離**既有設計，各自列為擁有者決定，而不是當作已定：① 分期次序（上文）；② 封印把普通副本換成新的收藏身份，所以封印會令那張卡離開手機牌組（第 2.1、2.2 節）。另有一個本文不建議的選項：每張約 75k gas 的批次鑄造需要計劃沒有的批次入口，是對計劃介面的改動；本文沿用計劃的一張一 claim，成本也按此估算（第 4.2、4.6 節）。其餘原則在本次研究中沒有被推翻，下文不重複其細節。

## 1. 2026-09-21／23 之後的變化

### 政策

| 範圍 | 變化 | 對本路線的影響 |
| --- | --- | --- |
| Apple | App Review Guidelines 於 2026-10-16 更新。3.1.1 對 NFT 的用語是「可以」用 IAP 出售 NFT 及鑄造、上架、轉移服務；IAP 之所以必須，是來自 3.1.1 對數位內容的一般規則。新增 2.5.19：不得含隱藏或休眠功能。5.1.1(ix) 自 2025-11-13 把加密貨幣交易所列為高度受規管服務。[指引](https://developer.apple.com/app-store/review/guidelines/)、[更新說明](https://developer.apple.com/news/?id=app-review-guidelines) | 交易功能不能先藏在商店版再開啟；要麼完整上架並通過審核，要麼不放進 app |
| Apple 美國導流 | 第九巡迴法院 2025-12-11 判決（No. 25-2935）；最高法院 2026-06-30 受理藐視問題（限第一問題），2026-08-13 拒絕暫停地區法院程序。[案卷 25-1311](https://www.supremecourt.gov/docket/docketfiles/html/public/25-1311.html) 第九巡迴法院推翻了完全禁止佣金的命令，發回地區法院定費率；Apple 於 8 月提出一般 app 15%、部分計劃 10%、小型開發者 5%，未有裁決。[9to5Mac 2026-08-13](https://9to5mac.com/2026/08/13/apple-proposes-commissions-of-up-to-15-for-off-app-store-purchases-in-the-us/)（報道） | 美國外連結帳不應預算為免費 |
| 英國 CMA | 2026-06-30 至 07-28 就 Apple 導流行為要求諮詢，08-14 公布回應；尚無最終要求。[個案頁](https://www.gov.uk/cma-cases/apples-mobile-platform) | 英國商店版目前仍不能放站外購買按鈕 |
| Google Play | 區塊鏈內容政策自 2023 年未見 NFT 條文改動。美國外部內容連結的下載回報及收費期限延至 2026-12-01（只限外部內容連結；替代計費仍為 2026-10-01）。[區塊鏈政策](https://support.google.com/googleplay/android-developer/answer/16302285)、[美國計劃](https://support.google.com/googleplay/android-developer/answer/15582165?hl=en) | [MOBILE-RELEASE.md](MOBILE-RELEASE.md) 的 2026-10-01 日期需按此更正 |
| PEGI | 2026-03-12 公布，6 月起送審的遊戲適用：涉及可交易、遊玩必需或屬核心玩法的 NFT 購買評為 18；付費隨機物品預設評為 16。[新聞稿](https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories)、[標籤頁](https://pegi.info/what-do-the-labels-mean) | 全年齡遊戲的最大新限制 |
| 英國 FCA | 最終規則 2026-06-30 以 PS26/9 至 PS26/13 公布；受規管活動的完整範圍自 2027-10-25 起擴展；申請窗口 2026-09-30 至 2027-02-28，已註冊 MLR 的公司不會自動轉換。PS26/18 周邊指引於 2026-09-16 公布（PERG 18）。[政策聲明總覽（2026-06-30）](https://www.fca.org.uk/publications/policy-statements/cryptoasset-regime)、[申請窗口](https://www.fca.org.uk/firms/new-regime-cryptoasset-regulation/how-gateway-will-operate)、[PS26/18](https://www.fca.org.uk/publication/policy/ps26-18.pdf) | 見第 5 節；舊文件以為 NFT 周邊待定，現在已有指引 |
| 台灣 | 《虛擬資產服務法》2026-06-30 三讀、07-22 公布，施行日由行政院定（第 56 條）。[金管會新聞稿（2026-06-30）](https://www.fsc.gov.tw/ch/home.jsp?id=96&parentpath=0&mcustomize=news_view.jsp&dataserno=202606300002&dtable=News)、[金管會法規系統條文](https://law.fsc.gov.tw/LawContent.aspx?id=GL004301) | 見第 5 節 |
| 認證標準 | WebAuthn Level 3 於 2026-08-25 成為 W3C Recommendation。[WebAuthn L3](https://www.w3.org/TR/webauthn-3/) | passkey 規則以此為準 |

### 鏈

- **Base 的成本下限由治理決定。** 最低 L2 base fee 於 2025-12-04 在主網首次啟用（200,000 wei），之後四次調高（12-18、01-22、02-02、02-19）至 5,000,000 wei（0.005 gwei），約 2.5 個月內升 25 倍。2026-10-21 實測 Base 與 Base Sepolia 都正好在這個下限。[網路費用](https://docs.base.org/base-chain/network-information/network-fees)、[設定變更紀錄](https://docs.base.org/base-chain/network-information/configuration-changelog)
- **Base 升級。** Isthmus（2025-05-09）帶入 Pectra 的 EIP，包括 EIP-7702；Cobalt 於 2026-09-30；Denim 目標 2026 年 11 月；Everest 計劃原生批次與代付（EIP-8430），日期未定。[升級總覽](https://docs.base.org/upgrades/overview)
- **Ronin** 於 2026-05-12 改為以 OP Stack 建造、資料放在 EigenDA 的 Optimium；L2BEAT 認為它未達 Stage 0，5-of-6 多簽可即時升級。[L2BEAT](https://l2beat.com/scaling/projects/ronin-network)
- **Immutable X** 已於 2026 年初併入 Immutable Chain（官方文件未給確切日期），寫入停止、原市集移除。所有 ERC-721／1155 必須實作 Operator Allowlist，否則被排除於生態市集並向 Passport 用戶顯示仿冒警告。[合併說明](https://docs.immutable.com/x/migration-guides)、[Operator Allowlist](https://docs.immutable.com/docs/products/asset-contracts/operator-allowlist)
- **Solana rent 下調。** SIMD-0437 第二步（每 byte 5,080 lamports）據 Chainstack 文件與 Crypto Briefing，於 2026-09-11（slot 446,256,000）在主網啟用（[Chainstack](https://docs.chainstack.com/docs/solana-rent-reduction-reclaim-excess-rent)，社群；[Crypto Briefing 2026-09-11](https://cryptobriefing.com/solana-rent-reduction-612k-sol/)，報道）。官方升級頁（標示「Updated September 2026」）仍把第二步寫成「Live on Testnet」，未更新。第三至五步預期 2026 年 11 月隨 Agave 4.4 降至 696。[Solana reduced rent](https://solana.com/upgrades/reduced-rent)

### 錢包與基建

- Base Account SDK（`@base-org/account`）仍是現行套件，文件現在放在 CDP 的「Coinbase Wallet SDK」標題下。CDP 說在下一代 Coinbase Wallet SDK 就緒之前繼續用它，FAQ 寫明不用改套件名或程式碼；下一代 SDK 沒有日期。[NFT-STACK.md](NFT-STACK.md) 提到的 SDK 遷移以此為準。[CDP 說明](https://docs.cdp.coinbase.com/coinbase-wallet/overview)
- Phantom Connect 的開發者入口目前不接受新申請。[Phantom Portal](https://docs.phantom.com/phantom-portal/portal)
- Ronin Waypoint 改名 Ronin Stash，改用 Privy。[Sky Mavis](https://docs.skymavis.com/mavis/ronin-waypoint/overview)
- Sequence 價格頁的橫額寫明 Polygon Labs 正在收購它；Dynamic 價格頁註明 2025 年 10 月被 Fireblocks 收購。[Sequence](https://sequence.xyz/pricing)、[Dynamic](https://www.dynamic.xyz/pricing)
- OpenZeppelin Defender 已於 2026-07-01 停止服務，改為自行運行的開源 Relayer／Monitor。[公告](https://www.openzeppelin.com/news/doubling-down-on-open-source-and-phasing-out-defender)
- Magic Eden 於 2026-03-09 結束 EVM NFT 市集（[Cointelegraph](https://cointelegraph.com/news/magic-eden-winds-down-evm-bitcoin-nft-markets-to-focus-on-gambling)，報道）；Alchemy 於 2026-09-30 停用 `getNFTSales` 等 NFT 端點，銷售資料沒有直接替代（[變更紀錄](https://www.alchemy.com/docs/changelog/2026/8/18)）。
- OpenSea 平台費自 2025-09-15 起所有鏈由 0.5% 改為 1%。[OpenSea changelog](https://docs.opensea.io/changelog/opensea-fee-update)

### 成本

在 L2 上，gas 已不是主要成本：以 2026-10-21 價格估算，Base 上鑄一張約 US$0.0016，一宗 Seaport 成交約 US$0.0034（第 4 節）。真正較大的是卡費、市集費、代付服務與錢包的每次操作費、metadata pinning、身份核實，以及法律與合規成本（第 4.6 節）。

## 2. 鏈上玩法怎樣接上遊戲

### 2.1 持有權與對局

**後端仍是 XP 的權威。** 對局、反作弊與 XP 計算由伺服器負責；鏈只記錄發行與持有權。這與 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) 一致，原因也不變：把 XP 寫上鏈不會令伺服器算錯的戰果變成正確，反而令每局都要等鏈。

建議的接法：

1. **「封印上鏈」，不是預先鑄造。** 玩家在遊戲中賺到的卡，平時只是後端紀錄。玩家主動選擇把某一張合資格的卡「封印」成收藏卡時，伺服器才排程鑄造。封印是**單向兌換**：那張普通副本在所有平台退出遊戲庫存，換成一個新的收藏身份（`collectibleAssetId`，綁定 `(chainId, contract, tokenId)`），並以出處連結記住原副本的 `assetId` 與已完成的 XP 和歷史。兩個 ID 分開，與 [NFT-STACK.md](NFT-STACK.md) 一致；同一張卡不會既留在牌組又以 NFT 出售，也就不會把普通副本說成同一張限量 NFT（[BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md)）。代價是那張卡離開手機牌組（第 2.2 節）。這等於「lazy mint」：沒人要的卡不會佔用鏈上供應，營運方也不用預付。v1 不做解封；解封等於把 token 交回營運方保管，會帶出託管問題（第 3.5 節）。哪些卡合資格、每個批次的上限，見第 7 節第 5、6 項。
2. **XP 跟 token 走，帳號金幣不跟。** 封印後的成長事件以 `matchId + collectibleAssetId + rewardType` 為唯一鍵；轉手後新持有人讀同一條事件帳。XP 只來自對局，不來自交易，避免自買自賣刷 XP。
3. **轉手的時點。** 索引器讀到轉移事件並達到選定的確認門檻後，才把卡的使用權交給新持有人。看到 mempool 或剛送出的交易都不算。
4. **進行中的對局。** 開局時凍結精確的卡、持有人和已確認區塊，並對該卡設短期對局占用；提交與結算時再核對。若結算前確認轉出，按事先公布的規則作廢該局對這張卡的未結算獎勵；已結算的歷練留在卡上。
5. **索引與重組。** 因 Alchemy 的 NFT 銷售端點已停、Reservoir 不能依靠（第 8 節），自建索引器讀 `Transfer` 與 Seaport 事件，保存區塊 hash 與 log 身份，可重播、可重建。資料庫只是可重建的索引，不是持有權的來源。
6. **Metadata。** XP 變化經逐張簽署、版本化的 `tokenURI` 公開（實作計劃的 `publishCheckpoint`）；變更時逐張發出 ERC-4906 `MetadataUpdate`，只有真正連續的 token ID 範圍才用 `BatchMetadataUpdate`；鑄造時不發（ERC-4906 建議如此）。[ERC-4906](https://eips.ethereum.org/EIPS/eip-4906) 市集快取可能落後，所以買家應在遊戲內看到成交時的 XP 快照。
7. **遊戲鎖不是鏈鎖。** 遊戲內「鎖定」只是 UI 保護；錢包仍可在遊戲外轉出。轉出後舊持有人的牌組標記缺卡。

### 2.2 收藏卡在各平台能做什麼

| 平台 | 可以 | 不可以 | 根據 |
| --- | --- | --- | --- |
| **Web** | 封印、連結錢包、查看、轉送；若法律意見許可，上架和購買 | 讓未成年人交易；把卡價當投資宣傳 | 第 5 節 |
| **iOS 商店版** | 查看自己的 NFT（ownership 不能解鎖任何功能）；普通遊戲副本照常遊玩 | 以 NFT 持有權解鎖戰鬥能力；在美國以外放站外購買按鈕；把加密錢包當解鎖機制；先藏後開的交易功能 | Apple 3.1.1、3.1.1(a)、2.5.19 |
| **Android（Google Play）** | 經申報與標示後，NFT 內容可存在 | 收錢換取內容不明的 NFT；宣傳賺錢；拿 NFT 下注 | Google 區塊鏈政策 |

**兩家商店有一處相反。** Google 希望玩家購買的 NFT 能在遊戲中使用；Apple 不容許 NFT 持有權解鎖功能。推論：同一件 app 內出售的 NFT 很難同時滿足兩者。最乾淨的做法，是讓可玩的卡永遠是後端遊戲副本；封印後的收藏卡在 iOS 只作展示，不在 app 內出售。Google 方面要預先向 Play 查詢。

**封印後的卡在 iOS 能否出戰** 是要擁有者決定的事（第 7 節第 15 項）。保守建議：v1 在 iOS 上，封印卡只顯示不出戰。代價要說清楚：封印把一張可玩的普通副本換成收藏卡（第 2.1 節），所以**封印會令那張卡離開手機牌組**；沒有封印的普通副本則照常遊玩。這是玩家在確認畫面上明示選擇的單向兌換，不是錢包連結、持有或轉出引起的變化；之後誰持有、轉給誰，都不改變任何人在手機上的功能。這樣才符合 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) 第 7 項不變量「不意外解鎖或收回手機功能」：確認畫面必須在封印前寫明哪些平台仍可出戰。

**年齡評級是另一層。** PEGI 的標籤頁把「可交易、遊玩必需或屬核心」的 NFT 購買評為 18，但新聞稿的措辭更廣，提到 NFT 或區塊鏈機制。只作展示的 NFT 會否也觸發 18，目前沒有答案（第 8 節）。所以商店版加入任何 NFT 內容之前，先要確認評級。

### 2.3 M3 玩家交易與 NFT 的關係

**建議先做鏈下交易（T0）：用賺來的遊戲金幣，買賣賺來的卡。** 理由：

1. **地基相同。** 任何 NFT 路線都需要伺服器卡牌身份、XP 帳、交易鎖、收據與 outbox。實作計劃把 P1 放在 P4 試點之前，但 P3 只要求 NFT entitlement 需要的命令族，並明言玩家交易不必拖慢固定內容試點；所以把整個 M3 交易放在試點之前，是本文的選擇，不是計劃的要求（第 0 節）。選它的理由是：交易正是擁有者想要的玩法；先做鏈下交易，就是在建 NFT 將來要坐上去的那一層；即使永遠不上鏈，它本身也有價值。若擁有者選計劃原本的次序，T1 可在 P1、P2 與 NFT entitlement 需要的 P3 命令族完成後開始（第 7 節第 2 項）。
2. **在沒有封印出口之前，鏈下交易的監管面較小。** 只要卡和金幣都不能換成錢或有價物，就不觸發商店 NFT 條款、PEGI 的 NFT 18 級或 MLR 的「交易所」定義。**一旦 T2 讓卡可以封印並在外部市集出售，這個結論就不再成立**：對局贏到的卡與 XP、以及用金幣在 T0 換到的卡，都會經這條轉換鏈取得金錢價值（第 5.2 節）。所以 T0 的合規分析在 T2 之前要重做。代價還包括：商店版要恢復帳號，網頁與商店版的私隱披露都要更新（第 3.3 節）。
3. **可以在不傷人的情況下試經濟。** 費用、取消、過期、對局鎖、防自買自賣，都可以先在不涉錢的環境驗證，錯了也能用可稽核的補正事件修正。
4. **NFT 可以之後再疊上去。** 封印是 opt-in 的一層；收藏卡 ID 與普通卡 ID 分開（第 2.1 節）。鏈下交易成功與否，不會把遊戲鎖死在某條鏈上。

[ROADMAP M3](../ROADMAP.md#m3--move-the-daily-economy-online-then-add-player-trading) 已有驗收條件：賣出的卡保留 UID、XP 與歷史，離開賣家可用牌組，只在買家庫存出現一次。T0 沿用這個條件，不另訂一套。

**金幣必須永遠只能賺取，不能購買。** 一旦金幣能用錢買，「用金幣開隨機卡包，再把卡封印賣錢」就把隨機卡包變成有金錢價值的抽獎（第 5.2 節）。但這只是**必要條件，不是充分條件**：英國博彩法的 gaming 不需要玩家下注或冒任何損失，只要贏到的獎品有金錢價值就可能構成；而場外的真錢交易（場外付錢，場內用金幣「買」一張普通卡）也能令金幣一方帶有價值。所以單靠「金幣只賺不買」，不能令卡包、對局和交易避開博彩法（第 5.2 節）。

## 3. 登入流程

### 3.1 前提

- 現有 Worker 代理 Supabase Auth：瀏覽器沒有 Supabase SDK，也不持有 session token，cookie 是 `HttpOnly`（[server/README.md](../server/README.md)）。這是好的安全邊界，下列流程保留它。**但它不是寫入授權。** 玩家可以在自己的瀏覽器讀出自己的 session cookie，再用公開的 publishable key 直接呼叫 Supabase REST；而現有 Worker 用的正是玩家自己的 session，沒有任何特權憑證。所以凡是 RLS 允許經 Worker 寫入的東西，玩家也能繞過 Worker 直接寫。錢包連結因此需要一條只有伺服器能走的寫入路徑（第 3.2 節第 5 步）。
- 錢包供應商的「custom JWT」模式需要把 Mythseal 簽發的 JWT 交給供應商。這樣做有兩個代價：要把 token 暴露給瀏覽器；而且由營運方簽發的憑證能解鎖玩家錢包，營運方原則上就有控制權（第 3.5 節）。所以下文**不用 custom JWT**，讓錢包供應商用自己的登入因素。
- Supabase 的「Sign in with Web3」會建立一個沒有電郵的獨立用戶。[Supabase Web3](https://supabase.com/docs/guides/auth/auth-web3) 我們不要第二個帳號，所以錢包只作為連結，不作為登入方式。

### 3.2 Web 建議流程

1. **訪客先玩。** 沒有帳號也能玩，與現在一樣。
2. **需要時才登入。** 雲端存檔或交易時，用現有電郵六位數驗證碼登入；Supabase 帳號仍是唯一帳號紀錄。
3. **預設沒有錢包。** 只有玩家打開收藏功能時，才出現「啟用收藏錢包」。按地區與年齡限制顯示，並清楚寫明：錢包由玩家自己控制，可以匯出，卡可能一文不值。
4. **建立嵌入式錢包。** 用供應商自己的電郵驗證碼登入，再登記 passkey。Mythseal 不簽發解鎖錢包的憑證。候選：
   - **CDP Embedded Wallets**：密鑰在 AWS Nitro TEE 內生成和使用；玩家可匯出；每月首 5,000 次操作免費，之後每次 US$0.005；passkey MFA 只支援 web；可設定每次驗證只授權一個請求。[CDP 價格](https://docs.cdp.coinbase.com/wallets/pricing)、[安全](https://docs.cdp.coinbase.com/wallets/security-and-policies/security-overview)、[MFA](https://docs.cdp.coinbase.com/wallets/authentication/mfa/overview)
   - **Privy**：TEE 加 2-of-2 Shamir 分拆；一旦登記 MFA，簽名、在新裝置恢復和匯出都需要 MFA，驗證後 15 分鐘內有效；499 MAU 以下免費，之後 Core 每月 US$299（價格頁 2026-10-20）。注意預設情況下，玩家可用自己的 access token 經 Privy API 直接交易或匯出，不經 app；要 app 參與須另設 key quorum。[Privy MFA](https://docs.privy.io/authentication/user-authentication/mfa/verify/overview)、[匯出](https://docs.privy.io/wallets/wallets/export)、[價格](https://www.privy.io/pricing)
   - 兩者的 web 範例都以 React 為主；Mythseal 前端是原生 ES modules。Privy 的原生 JS 核心庫屬低階庫，官方要求先聯絡團隊。哪一個能在不加 React 的情況下乾淨接入，要先做一個 spike（第 8 節）。
5. **把錢包連結到帳號。** 連結決定誰能用哪張收藏卡，所以不能只靠玩家 session 的 RLS（第 3.1 節）：
   1. 伺服器發出一次性 nonce，綁定該帳號與期限。
   2. 客戶端組成 SIWE（EIP-4361）訊息，包含 domain、URI、chainId、nonce 與 issuedAt，交錢包簽名。
   3. 伺服器用支援 ERC-1271 與 ERC-6492 的驗證器核對（Coinbase smart wallet 的簽名帶 ERC-6492 包裝；viem 可處理）。[CDP 認證指南](https://docs.cdp.coinbase.com/coinbase-wallet/guides/authenticate-users)
   4. 驗證成功後，由一個**只在伺服器運行、權限最小的資料庫角色**寫入 `linked_wallets(user_id, chain, address, method, verified_at)`。表放在 `anon`／`authenticated` 角色碰不到的 schema，`(chain, address)` 唯一；玩家只能讀自己的連結投影，不能插入或修改。這就是 [BACKEND-STACK.md](BACKEND-STACK.md) 提議的獨立 `game_api` 類角色（它寫明不能以玩家範圍的 RLS 授權這條路徑），也符合 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md)「不能只接受使用者填入的地址」。
   5. 現有 Worker 沒有這種憑證，所以這是 T1 的新依賴：一個新的伺服器資料庫憑證、它的保管與輪替，以及兩條路徑各自的拒絕測試（玩家直接呼叫 REST 寫連結要失敗；經 Worker 但沒有有效 SIWE 證明也要失敗）。
   6. 解除連結需要再次電郵驗證碼。
6. **外接錢包。** 熟悉加密的玩家可用 Coinbase Wallet、MetaMask 等，走同一個 SIWE 連結流程；只在 web 提供，因為 Coinbase Wallet 用彈出視窗。
7. **對局留在鏈下。** 只有持有權變更（封印、上架、購買、轉送）上鏈，每一步都有確認畫面並由玩家簽名。沒有任何能轉移玩家資產的伺服器簽名者、委派存取或 session key。營運方仍有自己的鑄造、checkpoint 與 relayer 金鑰，但它們碰不到玩家的 token（權限上限見第 4.2 節）。
8. **封印、轉送與首次上架授權的 gas 由營運方代付**（第 4.2 節），做這些事不需要持有加密貨幣。**買賣不同**：一旦開市集（T3），買家要以可互換的加密資產付款，就要先持有它（第 4.3 節）。

### 3.3 iOS 商店版建議流程

1. **離線優先，不要求登入。** Apple 5.1.1(v) 不容許在沒有重要帳號功能時強迫登入。
2. **可選的雲端存檔／交易帳號。** 在 app 內輸入六位數驗證碼，不用 magic link，以免處理深層連結。這是自家帳號系統，所以 Apple 4.8 的替代登入要求不適用；日後若加入 Google 等社交登入，就要同時提供 Sign in with Apple 或同等選項。
3. **能建立帳號就要能在 app 內刪除帳號**（5.1.1(v)）。
4. **首次登入時把本地旅程併入帳號**，沿用現有雲端存檔流程。
5. **恢復帳號會改變私隱承諾。** `privacy.html` 的手機版部分與 iOS privacy manifest 現在都聲明不收集資料；T0 交易需要帳號，兩者都要修訂後才上架。網頁版部分也要隨每期修訂：它現在只列電郵、驗證碼、登入 cookie 與旅程備份，處理者為 Supabase、Resend 與 Cloudflare。T0 加入其他玩家看得到的交易紀錄；T1／T2 加入公開在鏈上並與帳號連結的錢包地址、CDP 或 Privy 等錢包處理者，以及年齡與地區核實；若營運方須按 CARF 申報，還有稅務身份（第 5.2 節）。各期的退出條件都包括相應修訂（第 6 節）。
6. **v1 不放錢包。** 錢包連結和交易留在 web。之後最多加一個唯讀展示頁，顯示已在 web 連結的收藏卡：持有權不解鎖任何東西，美國以外沒有站外購買按鈕。
7. **若日後 iOS 要有錢包：**
   - App Store 發行者已是組織帳號（[IOS-FIRST-FLIGHT.md](IOS-FIRST-FLIGHT.md)），符合 3.1.5(i)。
   - app 內出售的 NFT 鑄造、上架或轉移服務走 IAP。
   - Passkey 不能直接在 `capacitor://localhost` 頁面呼叫。推論（未在裝置上測試）：按瀏覽器的 RP ID 規則，打包頁的 origin 不能以遊戲網域作 RP ID；較穩妥的做法是原生 ASAuthorization 橋接，配合 `webcredentials` associated domain，或在 `ASWebAuthenticationSession` 內開啟 https 登入頁。[Apple passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys)、[Capacitor 設定](https://capacitorjs.com/docs/config)
   - CDP 的快速入門警告正式項目不要加入 localhost；`capacitor://localhost` 能否列入允許清單要向供應商確認。CDP 的匯出 iframe 也不能直接在 WebView 中顯示。Privy 的 Capacitor 範例則把 `capacitor://localhost` 列為允許來源，並提供託管的匯出頁。[Privy Capacitor](https://docs.privy.io/recipes/capacitor-oauth)

### 3.4 恢復與退出

- **恢復**：重新以供應商登入因素加 passkey 登入。玩家的 Mythseal 帳號與錢包是兩件事：刪除 Mythseal 帳號不會刪除自己控制的錢包，卡的 XP 歷史仍以 token 為鍵保存。
- **匯出**：提供「匯出私鑰」頁（CDP 或 Privy 的匯出流程），並寫入條款。
- **刪除帳號**前，提示玩家先匯出或轉出收藏卡。
- **服務終止**：事先說明停止營運後仍能取得哪些圖像、metadata 與歷練匯出；不把鏈上持有權描述成遊戲會永遠營運。

### 3.5 託管模式與監管後果（英國）

| 模式 | 例子 | 對營運方的意義 |
| --- | --- | --- |
| 託管 | 供應商的託管錢包附加服務 | 營運方持有存取手段；很可能屬 MLR 的託管錢包提供者 |
| TEE 非託管，供應商自有登入 | 第 3.2 節的建議 | 營運方不簽發解鎖憑證；仍需供應商與律師確認營運方沒有任何手段 |
| TEE 非託管，custom JWT | 營運方簽發 JWT | 營運方原則上能授權任何玩家的錢包；thirdweb 文件也說自訂認證下開發者可恢復用戶帳號 |
| 自我託管 | 外接錢包 | 營運方須證明自己確實沒有任何轉移手段 |

- **MLR 規例 14A 今天已適用。** 它把「安排以加密資產換錢或換另一種加密資產」列為交易所服務，包括以發行者身份進行；也把為客戶保管加密資產或私鑰列為託管錢包服務。FCA 要求開始前先註冊。[規例 14A](https://www.legislation.gov.uk/uksi/2017/692/regulation/14A)、[FCA 註冊](https://www.fca.org.uk/firms/financial-crime/cryptoassets-aml-ctf-regime)
- **NFT 可能落入 MLR 的定義。** PERG 18.12.1 指出 MLR 的加密資產定義可能涵蓋 NFT 與有限網絡 token；18.12.2 指出 MLR 註冊要與 FSMA 授權分開評估。推論：**最大的旗號是交易本身，不是託管。** 無論錢包模式如何，出售 NFT 換錢或開設 P2P 市集，都可能要先作 MLR 註冊。
- **FSMA 新制度（2027-10-25 起）。** 不可互換的加密資產不屬「合資格加密資產」，按實質逐案判斷；同一系列若市場視為可互換，可能被視為可互換（PERG 18.4）。推論：Mythseal 每張卡有序號、XP 和來歷，支持「不可互換」的論點；大量相同、未經使用的副本則會削弱它。
- **控制權測試。** PERG 18.6 以「能否以任何手段促成轉移」判斷控制，只有一份未達門檻的分片不算；沒有為技術供應商明文豁免。這是 FSMA 保管活動的測試，2027 年生效，與 MLR 的託管定義不同；PS26/18 也說明這份指引尚未反映政府其後的修訂規例，FCA 打算再諮詢。
- **結論**：不要託管附加服務；不要能轉移玩家資產的伺服器簽名者或 session key；營運方不持有玩家的可互換 token（封印與轉送的 gas 一律代付）。在開放封印（T2）之前，以及在任何收錢或 P2P 市集（T3）之前，分別取得英國律師意見。

## 4. 交易與 gas

### 4.1 鏈的比較（2026-10-21 價格）

下表的每次成本是推論：以假設的 gas 用量（鑄一張 110k、一宗 Seaport 成交 230k）乘以 2026-10-21 約 10:11–10:31 UTC 從公開 RPC 讀到的 `eth_gasPrice`，再按 CoinGecko 同日價格換算（ETH ≈ US$2,450、POL US$0.0957、IMX US$0.154、RON US$0.059、SOL ≈ US$106）。這些 gas 用量未在鏈上量度過（第 8 節）。OP Stack 鏈另有 L1 data fee，本表沒有計入；Base 的估算與 growthepie 的整體中位數量級相近，但未逐項核對。

| 鏈 | 2026 狀態 | 當日 gasPrice | 鑄一張 | 一宗成交 | 2026-10-20 交易成本中位數（growthepie） | 代付選項 |
| --- | --- | --- | --- | --- | --- | --- |
| **Base** | 主網；base fee 在 0.005 gwei 下限 | 0.006 gwei | ≈ US$0.0016 | ≈ US$0.0034 | US$0.0017 | CDP Paymaster（只限 Base／Base Sepolia，加 7%）、Pimlico、Alchemy、thirdweb |
| Base Sepolia | testnet；同一下限 | 0.006 gwei | 無價格意義 | — | — | CDP、Alchemy、Pimlico 在 testnet 免費代付 |
| OP Mainnet | 主網；base fee 約 0.000004 gwei | 0.001 gwei | ≈ US$0.0003 | ≈ US$0.0006 | — | 第三方 ERC-4337 |
| Arbitrum One | 主網；另有 L1 poster fee，以額外 L2 gas 收取（未計入本表） | 0.020 gwei | ≈ US$0.0054 | ≈ US$0.011 | US$0.0043 | 第三方 ERC-4337 |
| Polygon PoS | 主網；base fee 約 249 gwei | 277 gwei | ≈ US$0.0029 | ≈ US$0.0061 | US$0.0088 | 第三方 ERC-4337 |
| Immutable Chain | base fee 約 0，最低 priority fee 10 gwei；Operator Allowlist 強制；L2BEAT 列為「Other」，證明系統未完全運作 | 11 gwei | ≈ US$0.0002 | ≈ US$0.0004（另加任何訂單簿費用） | — | Passport 用戶代付 |
| Ronin | OP Stack Optimium；未達 Stage 0 | 21 gwei | ≈ US$0.0001 | ≈ US$0.0003 | US$0.0002 | 工作室代付需申請（列明合約、函數、交易數與日期） |
| Ethereum L1（參考） | 當日異常便宜；90 日中位數由 US$0.0026 至 US$0.19 | base fee ≈ 0.038 gwei | ≈ US$0.010 | ≈ US$0.021 | US$0.043 | — |
| Solana · Metaplex Core | 每 asset 約 0.003 SOL：0.0015 協議費加約 0.0015 rent | — | ≈ US$0.32（約一半是 rent；數字可能早於現行 rent 下調） | — | — | 原生 fee payer |
| Solana · Bubblegum v2 cNFT | 先付 tree rent；需要 DAS 索引 | — | ≈ US$0.012–0.014（16,384 容量 tree） | — | — | 原生 fee payer |

來源：[Base 網路費用](https://docs.base.org/base-chain/network-information/network-fees)、[growthepie](https://api.growthepie.com/v1/fundamentals.json)、[Arbitrum gas](https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees)、[Immutable Chain](https://docs.immutable.com/docs/products/immutable-chain/overview)、[L2BEAT Immutable](https://l2beat.com/scaling/projects/immutablezkevm)、[Ronin 代付](https://docs.skymavis.com/mavis/ronin-waypoint/guides/sponsor-gas)、[Metaplex Core](https://www.metaplex.com/docs/smart-contracts/core/create-asset)、[Bubblegum v2](https://www.metaplex.com/docs/smart-contracts/bubblegum-v2/create-trees)。

**本文的建議仍是 Base（先 Base Sepolia）。** 原因不是它最便宜：OP、Immutable、Ronin 每次更便宜，但 Immutable 的 Operator Allowlist 會限制普通 ERC-721 轉移，Ronin 的治理風險較高，Solana 要重寫合約與索引，Core 每張還貴二三百倍。Base 沿用現有 Solidity／OpenZeppelin／viem 準備，CDP Paymaster 與嵌入式錢包都在同一處。成本下限由治理決定，所以預算要留 10 倍緩衝。

**cambridgetcg/zerone** 的公開倉庫是一個簽名、雜湊鏈接、只可追加的紀錄規格與 Python 參考實作，沒有代幣、錢包、瀏覽器或審計，它連結的鏈倉庫公開時回傳 404。[zerone](https://github.com/cambridgetcg/zerone) 它不適合作交易結算層；頂多可以作為 XP checkpoint 雜湊的見證紀錄（推論）。

### 4.2 Gas 策略

**誰付：**

| 事件 | 建議（Base） |
| --- | --- |
| 對局中賺到卡 | 鏈下紀錄，不寫鏈 |
| 玩家封印一張卡（鑄造） | 營運方付。沿用實作計劃的 `mintWithAuthorization`（一張一 claim），由 relayer EOA 定時提交，不經 ERC-4337；可用通用的 multicall 把多張放進一宗交易，省下每宗的基本開銷。要做到每張約 75k 的真正批次，就要在合約加批次入口，這是對計劃介面的改動（第 0 節） |
| 第一次上架（T3） | 玩家簽一次 `setApprovalForAll`，由 paymaster 代付 |
| 上架（T3） | 玩家離線簽 Seaport 訂單，不用 gas；訂單設短期限（第 4.3 節） |
| 取消上架（T3） | 上鏈 `cancel` 或 `incrementCounter`，在限額內代付。不用自有 zone 做鏈下取消：zone 要伺服器簽名，key 洩漏或停機時，「已取消」的訂單可能照樣成交，或所有訂單都不能成交 |
| 成交（T3） | 買家以成交幣種付款（第 4.3 節）。若以 USDC 成交，gas 可由 paymaster 代付，買家就不用另外持有 ETH；是否以平台費回收，取決於第 7 節第 12、13 項與律師意見 |
| 轉送／轉出到外部錢包 | 在每人限額內代付 |
| XP checkpoint | 營運方付；沿用實作計劃的逐張 `publishCheckpoint(tokenId, …)`，每張有自己的 sequence、digest 與 URI hash。多張 checkpoint 可經 multicall 放進一宗交易；`BatchMetadataUpdate` 只用於真正連續的 token ID 範圍（[NFT-STACK.md](NFT-STACK.md)）。每段時間一個總雜湊只能作額外的稽核紀錄，不能取代逐張 checkpoint |

**Paymaster（2026-10-21 頁面）：**

| 供應商 | 主網加成 | 其他 | 鏈 |
| --- | --- | --- | --- |
| CDP Paymaster | 代付 gas 加 7%，按月結算 | 合約白名單、每用戶上限、全域上限；支援 ERC-4337 帳戶及經 EIP-7702 升級的 EOA | 只限 Base、Base Sepolia |
| Pimlico | 加 10%；testnet 無加成 | 每月含 10M credits；頁面上每次 userop 的價格前後不一致 | 100+ 條 EVM 鏈及 Solana |
| Alchemy Gas Manager | 加 8% | 免費層只限 testnet | — |
| thirdweb | 加 2.5% | 首 1,000 宗代付交易包含在內，之後每千宗 US$1；月費 US$99 起 | 多鏈 |

來源：[CDP Paymaster](https://docs.cdp.coinbase.com/paymaster/introduction/welcome)、[Pimlico](https://www.pimlico.io/pricing)、[Alchemy FAQ](https://www.alchemy.com/docs/wallets/reference/gas-manager-faqs)、[thirdweb（頁面 2026-10-15）](https://thirdweb.com/pricing)。

**營運方的金鑰與權限上限。** 「沒有伺服器簽名者」只指沒有能轉移玩家資產的簽名者。營運方仍有多把金鑰：沿用 [實作計劃](BLOCKCHAIN-IMPLEMENTATION-PLAN.md#minimal-contract-surface) 的分權，multisig 管理、鑄造 issuer、checkpoint publisher 與負責緊急暫停和撤銷的 guardian 各自分開；本文另加一個付 gas 的 relayer。

| 金鑰 | 能做什麼 | 洩漏的後果 | 限制 |
| --- | --- | --- | --- |
| relayer EOA | 付 gas，提交已由 issuer／publisher 簽好的 claim 與 checkpoint | 失去其中的 ETH；或拒絕提交，令封印與 checkpoint 停頓 | 只存少量 ETH，補充有上限，可隨時更換 |
| issuer（簽封印 claim） | 在各批次餘下的 cap 內鑄造 | 偽造鑄卡，攤薄同批次的持有人（計劃亦指出這一點） | claim 綁定 asset、edition、收件人與期限；建議在合約加每段時間的鑄造上限；guardian 可暫停發行並撤銷 signer epoch |
| publisher（簽 checkpoint） | 公布 XP metadata | 發假 XP，而 XP 正是卡的市場價值來源 | sequence 與 previous digest 防回蓋；公開 diff；可撤銷；不能鑄造或改 cap |
| guardian | 立即暫停新的發行與 checkpoint，撤銷 signer epoch | 惡意暫停，令封印與 checkpoint 停頓 | 不能鑄造、發佈或轉移；暫停不凍結持有人之間的轉移；解除暫停的政策要先測試（計劃要求） |
| multisig 管理 | 角色任免等敏感變更，例如更換 issuer、publisher 或 guardian | 影響最大：可換上自己控制的 issuer 與 publisher，取得兩者的全部權力 | 多簽；敏感變更延遲生效並發出角色事件，延遲期間可以察覺和應對；按計劃，不能提高 cap、重用 token ID 或任意轉移 token |

issuer 與 publisher 不應是同一把金鑰，也不應與 relayer 放在同一部機器。這些金鑰的保管、multisig 營運與事故演練，是第 4.6 節未定價的成本。

**批次。** 建議由 relayer EOA 直接提交，不經 ERC-4337，因為 UserOperation 本身的開銷不小：Alchemy 的 Base 基準（費用快照 2025-01-30）顯示，一次原生轉帳經 userop 執行約 151k–191k gas，而 EOA 只需 21k。[aa-benchmarks](https://github.com/alchemyplatform/aa-benchmarks) EIP-7702 讓 EOA 執行委派程式碼，支援原子批次與第三方代付；它已是 Final，並自 2025-05-07 隨 Pectra 在以太坊啟用。[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)、[Pectra](https://ethereum.org/roadmap/pectra/) Defender 已停，relayer 用自建的簡單 EOA 加 nonce 管理，或開源 Relayer。第 8 節記錄的「批次每張 75k」不含逐張驗簽；沿用一張一 claim 時，multicall 只省下交易的基本開銷，每張成本較接近單張鑄造的 110k。

**Lazy mint。** 封印上鏈本身就是 lazy：只有玩家選擇封印時才鑄造。預先鑄滿 cap 在 Base 上不貴（約 1 萬張十來美元），但會把未經遊玩賺得的供應放上鏈，也削弱「每張都有自己歷練」的非互換論點，所以不建議。

**代付的上限。** 代付只限白名單合約的指定方法；設每人及每月總額上限；達到上限時暫停代付並明示，不改為向玩家收費。封印不經 paymaster，也由營運方付錢，所以同樣要有每帳號每段時間的封印上限：電郵帳號可以免費開設，bot 可以用免費對局刷卡再大量封印，令鑄造與 pinning 成本隨濫用量而不是隨真實玩家增長。封印資格（已核實成年人、合資格來源與批次，第 7 節）本身也是限制。

### 4.3 市集（T3，取得律師意見之後）

- **自建遊戲內市集，以 Seaport 1.6 結算。** 賣家離線簽 EIP-712 訂單，一個簽名最多可涵蓋 2²⁴ 張訂單；成交原子結算，不需要託管。Seaport 1.6 部署在 26 個網絡（16 主網、10 testnet），包括 Base；倉庫為 MIT 授權。README 列出的唯一審計是 Trail of Bits 2022 年對原版 Seaport 的審計，不是針對 1.6。[Seaport](https://github.com/ProjectOpenSea/seaport)、[文件](https://github.com/ProjectOpenSea/seaport/blob/main/docs/SeaportDocumentation.md)
- 遊戲內市集可以顯示 XP、歷史與成交時的 XP 快照，並排除自買自賣價格；這些是外部市集做不到的。
- **OpenSea** 接受 Seaport 1.6 訂單，平台費 1%，可作為外部出口。
- **thirdweb MarketplaceV3** 的直接上架不託管 NFT，英式拍賣則託管 NFT 與出價。[設計文件](https://portal.thirdweb.com/tokens/design-docs/marketplace)
- 不用自訂交易所合約、可互換代幣、跨鏈橋或租借，與實作計劃一致。
- **成交幣種。** Seaport 訂單要指定付款資產，可以是 ETH／WETH 或 Base 上的 USDC；兩者都是可互換的加密資產。所以一旦開市集，「玩家不用碰加密貨幣」就不再成立：
  - 買家必須先持有付款資產，要經 onramp 取得（第 4.5 節）。營運方不替買家出資。
  - 遊戲中「賣卡收 ETH」「充值」之類的呼籲，可能構成對合資格加密資產的金融推廣：FPO 第 26F 段只把真正不可互換的 NFT 排除在外，付款一方仍在制度內，而未經授權者發出金融推廣受 FSMA 第 21 條限制（推論）。[FPO 26F](https://www.legislation.gov.uk/uksi/2005/1529/schedule/1/paragraph/26F)、[FSMA s21](https://www.legislation.gov.uk/ukpga/2000/8/section/21)
  - NFT 換 ETH 或 USDC 是加密資產換加密資產，不用等 NFT 定性，就直接落入 MLR 規例 14A 的交易所定義（第 3.5 節，推論）。
  - Google Play 要求買賣或持有加密貨幣經受規管地區的認證服務（[區塊鏈政策](https://support.google.com/googleplay/android-developer/answer/16302285)）；這是商店版不放市集的另一個理由。
  - 賣家收到可互換資產，有資本增值稅申報負擔；自建市集亦很可能令營運方成為 CARF 的申報者（第 5.2 節）。
  - 本文不在 T2 開市集，只開封印與轉送；成交幣種在 T3 之前與律師一起決定（第 7 節第 12 項）。
- **簽名釣魚與過期訂單。** 一個 0 價的 Seaport 訂單簽名，加上已有的 `setApprovalForAll`，就足以零成本轉走 NFT。2023 年 1 月，Moonbirds 創辦人因一個惡意的 Seaport 簽名失去 40 多件 NFT（[CryptoSlate 2023-01-27](https://cryptoslate.com/nfts-worth-millions-disappear-from-prominent-web3-builders-wallet/)，報道）；DeFiHackLabs 在新版 Seaport 上重現了同一攻擊（[2023-02-13](https://defihacklabs.substack.com/p/user-asset-security-lesson-7-offline)，社群）。遊戲若教玩家「簽名免費、不用 gas」，假網站就能照抄這個流程；三語介面也等於三語的釣魚面。所以：
  - 只在遊戲自己的網域要求簽名，並在簽名前以玩家的語言寫明：賣哪一張卡、價錢與幣種、何時到期。嵌入式錢包能否把 EIP-712 訂單顯示成人看得懂的內容，要在 T1 的 spike 驗證（第 8 節）。
  - 提供撤銷授權（`setApprovalForAll(false)`）的入口，並在風險說明中講清楚釣魚的樣子。
  - 已簽的訂單在鏈上一直有效，XP 升了以後舊價仍可成交，會被人搶購。訂單設短的 `endTime`，XP 變化時提示賣家重新上架（推論）。
  - 不用自有 zone 做鏈下取消，原因見第 4.2 節。

### 4.4 版稅

- **ERC-2981 只是報告版稅**，付不付由市集自願決定。[ERC-2981](https://eips.ethereum.org/EIPS/eip-2981)
- **ERC-721C**（Limit Break，MIT）加入轉移驗證器以強制版稅；OpenSea 對 721-C 集合以 Seaport hooks 與 SignedZone 執行，受限 token 的 Seaport 訂單必須指定這個 zone（文件 2026-08-17）。文件沒有說啟用時現有上架會失效；推論：啟用前建立、沒有指定 zone 的訂單可能無法成交，但未經核實（第 8 節）。721C 的 README 要求配合 OpenZeppelin 4.8.3，而我們用 5.6.1。[創作者費用](https://docs.opensea.io/docs/creator-fee-enforcement)、[creator-token-standards](https://github.com/limitbreakinc/creator-token-standards)
- **建議**：只用 ERC-2981，比率低或為零；不採用 721C。強制版稅會阻擋經未核准合約的轉移，包括部分智能錢包，與「普通 ERC-721 轉移」的設計相衝；它也帶有「轉賣替營運方賺錢」的味道，與擁有者的精神不合。

### 4.5 法幣結帳

| 選項 | 2026-10-21 狀況 |
| --- | --- |
| Crossmint | NFT 結帳仍提供；每用戶每日上限 US$2,000；正式使用需簽訂單與 KYB；Crossmint 承擔退款風險。2026-07-01 起，EEA、英國、巴西買家不能用代幣結帳（NFT 不在此限）。2026 年 1 月的歐盟披露：卡費 0.5–4.5%，非美元／歐元 FX 0.5–2%，合作夥伴費 0–10%（多為 0–2.5%）。[Crossmint](https://docs.crossmint.com/payments/introduction)、[價格披露](https://help.crossmint.com/articles/6270626721-pricing-disclosure) |
| Stripe onramp | 公開預覽，需申請；Stripe 為記錄商戶，承擔詐騙與爭議責任，處理 KYC 與制裁篩查。託管頁列出美國與歐盟可用貨幣，歐盟不支援 Base 資產，沒有提到英國，也沒有公開費率。[Stripe onramp](https://docs.stripe.com/crypto/onramp) |
| Coinbase Onramp | 信用卡 2.5%，ACH 0.5%；網絡費按成本轉嫁。託管小工具的訪客結帳已於 2026-06-30 停用，改用 Headless API。[FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq) |

Onramp 只是替錢包充值，本身不是 NFT 結帳；但它令玩家開始持有可互換的加密資產（第 4.3 節）。**建議 T0–T2 完全不收法幣，也不開市集**：收藏卡只能從遊玩中賺取再封印；任何首次出售或玩家之間的買賣，都是之後、取得法律意見後的另一個決定。

### 4.6 一季成本模型（推論）

假設一季 3 個月：10,000 次封印、30,000 次 XP checkpoint（每張已封印的卡平均三次；NFT-STACK 建議只在升級或有變化時、每日最多一次）、5,000 宗成交、2,000 次轉送、1,500 位首次上架的賣家、1,000 位啟用錢包的玩家；2026-10-21 價格；假設的 gas 用量見第 4.1 與第 8 節：封印按實作計劃的一張一 claim 每張 110k 計（括號內是每張 75k 的批次選項，第 4.2 節），轉送 60k、`setApprovalForAll` 46k，checkpoint 每次約 100k、ERC-4337 每次另加約 130k，都未量度。封印與 checkpoint 由 relayer 直接提交，CDP 的 7% 只計經 paymaster 的部分。成交與上架只在 T3 開市集後才會發生。

| 項目 | Base 估算 |
| --- | --- |
| 營運方只付封印鑄造 | ≈ US$16（批次約 US$11） |
| XP checkpoint（逐張） | ≈ US$44 |
| 成交由買家自付時的買家總和 | ≈ US$17 |
| 全部代付（含 ERC-4337 開銷，不含 checkpoint） | ≈ US$52；加 CDP 7% 約 US$55（批次約 US$47／49） |
| 全部代付，加 checkpoint 與 CDP 7% | ≈ US$99（批次約 US$94） |
| 10 倍壓力（下限再升或擁堵） | ≈ US$990（批次約 US$940） |
| 嵌入式錢包（CDP） | 按操作計（開戶與簽訊息各 1 次，送交易與 EIP-7702 委派各 2 次）：開戶 1,000、SIWE 1,000、首次上架授權 1,500 × 2、上架簽名至少 5,000、買家成交 5,000 × 2、轉送 2,000 × 2，約 24,000 次一季，即每月約 8,000 次。扣除每月 5,000 次免費後，約每月 US$15、一季 US$45；若每個錢包另需一次 EIP-7702 委派，再加約 US$10。這是上限：用外接錢包的玩家不計。T2 沒有市集時，每月約 2,000 次，在免費額內 |
| 嵌入式錢包（Privy，500–2,499 MAU） | 每月 US$299，一季約 US$900；499 MAU 以下免費 |
| Metadata pinning | 每次封印與每次 checkpoint 都產生新的 metadata JSON：一季約 40,000 個檔案。Pinata 免費方案上限 500 個檔案、1 GB；Picnic 方案每月 US$20，可放 500 萬個檔案（[價格頁 2026-08-14 版](https://pinata.cloud/pricing)），即一季約 US$60。[CONNECTIONS.md](CONNECTIONS.md) 記錄的是免費方案路線，所以 T1 之後付費與否要擁有者決定；NFT-STACK 要求的第二個獨立 pinning 位置另計，未定價 |
| 年齡與身份核實 | 每位交易者一筆：年齡核實（第 5.5 節）；若營運方須作 MLR 註冊或屬 CARF 申報者，還有客戶盡職審查與稅務身份收集（第 5.2 節）。隨用戶數增長；供應商單價未查（推論） |
| MLR 註冊與合規營運（若需要） | 不只是一份律師意見。據 Finance Magnates 整理 FCA 數字，至 2026-08-01 已處理的 391 宗加密資產註冊申請中，68 宗獲註冊、263 宗撤回（[2026-08-12](https://datalab.financemagnates.com/compliance-insights/two-thirds-of-fca-crypto-applications-were-withdrawn-before-the-2027-reset/)，報道）；FCA 2023-24 年報顯示當年約 13% 獲批（[Financial Planning Today 2024-09-06](https://financialplanningtoday.co.uk/news/just-1-in-10-crypto-applications-approved)，報道）。另有 MLRO、交易監控與 travel rule 的長期成本。未定價 |
| 金鑰與 multisig 營運 | 未定價（第 4.2 節） |
| 濫用 | 沒有每帳號封印上限時，鑄造、checkpoint 與 pinning 成本隨 bot 刷卡量增長（第 4.2 節） |
| 自建索引器與 RPC | 未定價 |
| 法律、稅務意見 | 未定價，相信是最大一項 |

**gas 不是決策重點。** 一宗全代付的成交約 US$0.0053（成交加 ERC-4337 開銷）；收 2.5% 平台費，售價約 US$0.22 即可打平。若加上 Pimlico 每次 userop 的費用，約 US$0.0164，售價約 US$0.66 打平。但用平台費回收不只是技術選擇：收費令營運方更像在安排加密資產交易（MLR）並控制交易平台（CARF），也影響 VAT 分析（第 5.2 節）。上表顯示一季的代付 gas 不到一百美元，不收費也負擔得起；所以本文建議 T3 開市集時先不收平台費，是否收費留待第 7 節第 12、13 項與律師意見決定。不收費也不等於不受規管（推論）。收不收錢、經哪條支付路線、商店規則和法律，才是決策重點。

同一假設下其他鏈全部代付的 gas（不含 checkpoint 與代付加成）約為：OP US$9、Immutable US$6（另加訂單簿費用）、Ronin US$4、Polygon US$94、Arbitrum US$174、Ethereum L1（當日低價）US$330。Solana Core 的鑄造約 US$3,200，其中約一半是可退 rent，rent 下調後會再降；cNFT 約 US$137。

## 5. 平台、法律與倫理

### 5.1 商店

- **Apple（指引 2026-10-16）**：3.1.1 容許經 IAP 出售 NFT 及相關服務；查看自己的 NFT 可以，但持有權不能解鎖功能；加密貨幣與錢包不能作為解鎖機制。瀏覽他人收藏時，美國以外不得放引向非 IAP 購買的按鈕（某些地區另有 External Purchase Link 權限）。付費隨機物品要先披露機率。3.1.5：錢包須由組織帳號發行，交易所功能須在各地持牌。5.3.3／5.3.4：IAP 不能購買真錢博彩的額度，真錢博彩須持牌並限地區。年齡評級把以真錢或可兌換真錢的遊戲貨幣下注定為「Gambling」，18+；loot box 全球為 9+，但澳洲為 16+、巴西為 A18。[年齡評級](https://developer.apple.com/help/app-store-connect/reference/age-ratings)
- **Google Play**：銷售或讓玩家賺取代幣化資產須在 Financial features 申報並標示產品；不得宣傳遊玩或交易賺錢；不得收取有金錢價值的東西換取內容價值不明的 NFT；不披露內容與價值的 NFT 套裝屬明列違規；不得以 NFT 下注。付款政策要求數位物品用 Play Billing，但 P2P 付款與網上拍賣不得用 Play Billing；玩家之間的 NFT 交易是否屬這個例外，Google 未有確認。英國的 user-choice billing 不包括遊戲。[付款政策](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)、[user-choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)
- **博彩定性會連帶影響商店版（推論）。** 若對局或卡包因 T2 的轉換鏈而被視為 gaming（第 5.2 節），即使 app 本身不顯示 NFT，用同一個帳號經濟的 iOS／Android 版也可能被當作真錢博彩處理：Apple 5.3.4 要求持牌、限地區、免費下載；Google 要求整合 NFT 的博彩 app 走 Real-Money Gambling 申請（[區塊鏈政策](https://support.google.com/googleplay/android-developer/answer/16302285)，頁面無日期）。所以第 5.2 節的律師分析也要涵蓋商店版。

### 5.2 英國

- **FCA**：MLR、FSMA 新制度與控制權，見第 3.5 節。
- **金融推廣**：《金融推廣令》第 26F 段把合資格加密資產定義為可互換且可轉讓（2026/102 號規例替代的文本只在特定用途生效，2023 年文本亦相同），所以真正不可互換的 NFT 一般不在加密推廣制度內。[FPO 26F](https://www.legislation.gov.uk/uksi/2005/1529/schedule/1/paragraph/26F)
- **ASA／CAP 廣告**：CAP 2024-05-23 的指引認為收藏式 NFT 容易被理解為投資產品；廣告須說明 NFT 不受規管、價值可跌，並披露鑄造與 gas 費、所需錢包與鏈，以及持有 NFT 未必帶有知識產權。[CAP 指引](https://www.asa.org.uk/news/cryptoassets-non-fungible-tokens.html) FanCraze（2023-11-15）的 NFT 板球卡裁決支持了未標明廣告、沒說錢包與鏈、投資框架和漏寫 gas 費、沒有風險警告等投訴，並要求說明 NFT 只存在於專屬系統、不能在外交易。[裁決](https://www.asa.org.uk/rulings/fancraze-technologies-inc-a23-1199796-fancraze-technologies-inc.html)
- **《2005 年賭博法》與博彩委員會。** 第 6 條：gaming 是為獎品而玩機會遊戲；同時含機會與技巧的遊戲仍算機會遊戲（s6(2)(a)(i)）；**不論玩家會否輸掉任何東西**，取得贏獎機會就算為獎品而玩（s6(4)）；獎品是「金錢或金錢價值」（s6(5)）。第 14 條的簡單彩票獎品包括物品與服務；第 33 條把無牌提供博彩設施列為罪行。[s6](https://www.legislation.gov.uk/ukpga/2005/19/section/6)、[s14](https://www.legislation.gov.uk/ukpga/2005/19/section/14)、[s33](https://www.legislation.gov.uk/ukpga/2005/19/section/33)
  - 委員會 2017 年 3 月的立場文件：可贏取、交易或出售的遊戲內物品，一旦能換成現金或有價物，就屬金錢價值（摘要）；這樣的話，**底層遊戲本身**也可能成為須持牌的博彩活動（第 5.13 段）；付費開箱的獎品若容易套現，相關部分很可能須持牌（第 3.17 段）。鎖在遊戲內、不能套現的物品，則不在此列。[文件頁](https://www.gamblingcommission.gov.uk/about-us/page/virtual-currencies-esports-and-social-gaming-discussion-paper)、[PDF](https://assets.ctfassets.net/j16ev64qyf6l/7jRMC5FrbFkfXKhmN2rajn/f77a0e6dd36f2e8157c4bbaf53dc2eb7/Virtual-currencies-eSports-and-social-casino-gaming.pdf)
  - DCMS 2022-07-18 的 loot box 回應稱能否合法套現是與博彩的「重要分別」，並表示委員會會對構成無牌博彩的物品交易採取行動。[政府回應](https://www.gov.uk/government/calls-for-evidence/loot-boxes-in-video-games-call-for-evidence/outcome/government-response-to-the-call-for-evidence-on-loot-boxes-in-video-games)
  - FutGalaxy（2017-02）：網站讓玩家用虛擬幣賭博，這些幣可換成 FIFA 金幣，再在未經授權的二級市場賣錢；兩名董事認罪，罰款連訟費合共 £265,000，法官指有兒童參與，稱罪行「very grave」。[委員會新聞 2017-02-07](https://www.gamblingcommission.gov.uk/news/article/two-men-convicted-after-offering-illegal-gambling-parasitic-upon-popular) 委員會的論點是這條轉換鏈構成金錢價值，即使遊戲商的條款禁止買賣金幣；因被告認罪，法院沒有就這點裁決。[Cornerstone Barristers](https://cornerstonebarristers.com/first-social-gaming-prosecution-succeeds/)（律師評論）
  - **推論，對 Mythseal 的意義。** 對局有隨機成分（抽牌洗牌、平手擲幣），也有技巧，屬第 6 條的機會遊戲範圍。T2 一開，卡可以封印並在 OpenSea 等外部市集出售，對局贏到的卡與 XP、以及在 T0 用金幣換到的卡，都經這條轉換鏈取得金錢價值，**即使營運方自己不開市集，即使對局沒有入場費**。所以「金幣只賺不買」只是必要條件；第 2.3 節所說的 T0「監管面較小」，在 T2 之前要重新評估；s6 與轉換鏈的分析要交英國律師，並且是 T2 的前提，不只是市集（T3）的前提。可以交律師一起考慮的設計選項包括：封印只限內容已知、不經對局得來的卡；可封印的批次不進入 T0 交易；封印卡是否繼續累積對局 XP。這些都會改變玩法，要擁有者取捨。
- **消費者法（CMA207，2025-11-18 更新）**：標價須包括必付費用，無法預先計算的要說明計算方法（推論：這包括 gas）；禁止直接催促兒童購買，指引以遊戲內橫額作例子；禁止虛假限時聲稱。[CMA207](https://www.gov.uk/government/publications/unfair-commercial-practices-cma207/unfair-commercial-practices) 數位內容的 14 日取消權，須在消費者明示同意並確認會失去取消權後才失去（《2013 年消費者合約規例》[第 37 條](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37)）。
- **VAT（HMRC GfC21，頁面標示 2026-10-21 更新）**：沒有特別的加密 VAT 規則，NFT 跟隨其背後的供應；設定條款或授權收費的平台一般須為第三方銷售負責 VAT；B2C 電子服務按客戶所在地徵稅，單靠錢包紀錄不足以證明客戶所在地。[GfC21](https://www.gov.uk/government/publications/help-with-vat-on-cryptoassets-gfc21/help-with-vat-treatment-of-cryptoassets-gfc21) 推論：營運方自設市集可能要為玩家之間的銷售負責 VAT，需要稅務意見。
- **CARF（加密資產申報框架）。** 《2025 年申報加密資產服務提供者規例》（SI 2025/744）自 2026-01-01 生效：申報者（RCASP）要對用戶做盡職審查，紀錄保存五年，每年 5 月 31 日前申報上一個曆年；個人用戶要申報姓名、地址、稅務居住地、TIN 與出生日期。首次申報期為 2027-01-01 至 05-31，並要在 2027-01-31 前登記及通知用戶。[SI 2025/744](https://www.legislation.gov.uk/uksi/2025/744/made)、[HMRC 指引（2026-01-01 更新）](https://www.gov.uk/guidance/check-if-youll-need-to-report-cryptoasset-data-to-hmrc)、[IEIM8000515](https://www.gov.uk/hmrc-internal-manuals/international-exchange-of-information/ieim8000515)
  - HMRC 手冊（2026-10-15 更新）：讓用戶完成交換交易的交易平台，就算執行交換；對平台有「control or sufficient influence」的人或實體就是 RCASP，軟件本身不是。手冊沒有以託管為條件。[IEIM8000150](https://www.gov.uk/hmrc-internal-manuals/international-exchange-of-information/ieim8000150)
  - 在市集交易的 NFT 推定為 relevant cryptoasset，除非 RCASP 能判斷四項條件全部成立，其中一項的例子是從未以超過 US$200 成交、自建立以來成交不超過 10 次。[IEIM8000280](https://www.gov.uk/hmrc-internal-manuals/international-exchange-of-information/ieim8000280)
  - **推論：** T3 的自建 Seaport 市集由營運方定費用與規則（例如排除自買自賣），符合 RCASP 的描述；付款一方的 ETH 或 USDC 更肯定屬 relevant cryptoasset。後果是每位交易者都要交出稅務身份，這與第 3.3 節的私隱承諾和第 5.5 節的未成年人保護都相關，也是第 4.6 節的成本。T2 只封印與轉送、不設市集時是否仍屬 RCASP，要律師確認。

### 5.3 歐盟、台灣、香港、美國

- **歐盟 MiCA**：第 2(3) 條排除獨一且不可互換的加密資產。[ESMA 單一規則手冊](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-2-scope) Recital 11 指出：大量系列發行是可互換的指標，唯一識別碼本身不足夠，按實質判斷；NFT 的分割部分不算獨一。[EUR-Lex 正式文本](https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng)（本次自動讀取被拒，Recital 11 的內容沿用先前研究，未重新逐字核對；第 8 節）消費者保護合作網絡 2025-03-21 對遊戲內虛擬貨幣的原則（不具約束力）要求以真錢標價、不隱藏成本、不迫玩家買不需要的貨幣，並照顧弱勢與兒童。[CPC 原則 PDF](https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en?filename=Key+principles+on+in-game+virtual+currencies.pdf)
- **台灣**：《虛擬資產服務法》第 3 條把具支付或投資用途的價值定為虛擬資產，並排除表彰價值具不可代替性的非同質化代幣；第 7 條規定服務提供者須取得金管會許可。施行日由行政院定（第 56 條）。[金管會法規系統（公發布日 115-07-22）](https://law.fsc.gov.tw/LawContent.aspx?id=GL004301)
- **香港**：證監會 2022-06-06 表示，真正代表收藏品的 NFT 一般不在其監管範圍；分割或可互換的 NFT 可能屬證券或集體投資計劃權益。這份聲明早於 2023 年的虛擬資產發牌制度。[證監會新聞稿 22PR34](https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/doc?refNo=22PR34)
- **美國**：Friel v. Dapper Labs（紐約南區聯邦地區法院，2023-02-22）駁回被告的撤案動議，認為原告合理地指稱 NBA Top Shot Moments 可能屬 Howey 定義下的證券；法官自言是「close call」。法院著眼於 Dapper 對 Flow 區塊鏈的控制，以及銷售與二級市場交易費用的去向。[DLA Piper 2023-02-28](https://www.dlapiper.com/insights/publications/2023/02/sdny-holds-nba-top-shots-nfts-may-be-unregistered-securities-under-howey)（律師評論）雙方於 2024-06-03 簽訂和解協議，協議引述了上述裁定；據報道金額為 US$400 萬，最終批准未核實。[和解協議](https://storage.courtlistener.com/recap/gov.uscourts.nysd.562991/gov.uscourts.nysd.562991.67.0_1.pdf)、[The Block](https://www.theblock.co/news/web3/2024-06-03-dapper-labs-settles-nba-top-shot-moments-lawsuit-for-4-million-298286)（報道）推論：營運方控制的自建市集，加上由營運方決定的 XP 規則與平衡改動（每次改平衡都會影響卡價），與該案屬同一類事實。本文沒有做美國法律分析，所以建議 T2 起在美國封鎖，直至有美國律師意見（第 7 節第 14 項）。

### 5.4 這些規則排除了什麼

1. **付費隨機 NFT 卡包。** 英國博彩法、Google Play、PEGI（付費隨機 16、可交易 NFT 購買 18）與 Apple 的 Gambling 定義都指向同一方向。現有文件說「不要把神秘卡包變成付費隨機 NFT」；研究支持把它當作永久規則，而不是「暫時」。
2. **可用錢買的遊戲金幣。** 金幣一旦可購買，金幣卡包加上封印出售，就重新構成上一條。反過來不成立：金幣只賺不買，並不足以令對局與卡包避開博彩法（第 5.2 節）。
3. **NFT 持有權解鎖 iOS 功能。**
4. **商店版的隱藏交易功能**（Apple 2.5.19）。
5. **向未成年人開放封印與鏈上交易，或讓未成年人賺到的卡經 T0 流入可封印的經濟**（第 5.5 節）。
6. **回購、分享版稅收益、質押或「升值」承諾。**
7. **託管錢包附加服務，以及有轉移權限的伺服器簽名者。**

### 5.5 倫理：沒有壓力，不承諾價值，保護未成年人

這條路線之所以值得做，是因為它讓玩家**擁有**自己花時間培養的卡，而不是讓遊戲向玩家**收錢**。以下做法都由此而來：

- **沒有壓力。** 不設限時促銷、倒數、「只剩幾張」或連續登入懲罰。封印與交易永遠是選擇，不封印的玩家玩到的遊戲完全一樣。
- **不承諾價值。** 介面與宣傳不顯示價格走勢、地板價或「投資」字眼；清楚寫明收藏卡可能一文不值，遊戲不保證永遠營運。Google 禁止宣傳賺錢，ASA 要求風險說明，兩者都支持這一點。
- **不獎勵交易量。** 交易不給 XP、排名或活動獎勵；偵測自買自賣，不把其成交價當作市場價。Chainalysis 2022-02-02 的研究發現，110 名有利可圖的洗售交易者合共賺約 890 萬美元，利潤很可能來自不知情的買家。[Chainalysis](https://www.chainalysis.com/blog/2022-crypto-crime-report-preview-nft-wash-trading-money-laundering/)
- **保護未成年人。** 封印與鏈上交易只限經年齡核實的成年人。單說「全年齡遊戲本身不受影響」並不足夠：
  - T0 的金幣與卡交易沒有年齡限制。T2 一開，兒童賺到的卡可經 T0 轉入成年人手中再封印出售，等於兒童替人刷卡，也會引來場外付款的騙局；FutGalaxy 案的法官正是因兒童參與而稱罪行「very grave」（第 5.2 節）。建議：T2 開始前，可封印批次的卡只能在已核實的成年人之間經 T0 交易，或者完全不進入 T0（第 7 節第 14 項）。
  - **ICO 兒童守則今天已適用。** 它涵蓋「likely to be accessed by children」的線上遊戲，即使遊戲不是為兒童而設；不適合兒童的服務，應阻止兒童使用，而不是改到適合兒童。[ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/)（頁面無日期）
  - **Online Safety Act。** Ofcom 2025-10-14 的遊戲指引說，讓用戶產生或分享其他用戶會看到的內容的遊戲屬 user-to-user 服務，例子包括聊天、以配對系統連接陌生玩家；這類服務要做非法內容風險評估與兒童接觸評估，適用時還要做兒童風險評估。[Ofcom](https://www.ofcom.org.uk/online-safety/the-online-safety-act-and-gaming-know-the-risks-know-the-rules-know-how-to-comply) 指引沒有提到玩家交易；推論：T0 公開的上架與交易紀錄，以及 M2 的線上配對，都可能令遊戲落入這個制度。
  - 年齡怎樣核實、收什麼資料、保存多久，本文未定（第 8 節）。
  - 博彩委員會 2025-11-13 的統計顯示，在知道遊戲內物品的 11–17 歲青少年中，55% 曾用遊戲貨幣開驚喜箱，6% 曾在遊戲以外的網站用遊戲物品下注。[統計](https://www.gamblingcommission.gov.uk/report/young-people-and-gambling-2025-official-statistics/ypg-2025-gambling-activities-and-gaming-gaming) Zendle 與 Cairns（2018）的大型相關研究發現 loot box 消費與問題賭博的嚴重程度相關，但無法證明因果。[PLOS ONE 論文](https://eprints.whiterose.ac.uk/139116/1/journal.pone.0206767.pdf)
- **隨機只用於賺來、不可交易的東西。** 出售的東西內容固定，並公開供應上限。
- **每種語言都完整。** 擁有者 2026-10-21 表示，遊戲要有英文、繁體中文與簡體中文，之後按語言熱度再加。風險說明、費用、錢包與鏈的資料，在每種已上線的語言中都要完整，不在任何語言中省略警告。遊戲今天只有繁體中文，也沒有語言層；語言層的計劃仍在另一條研究分支（PR #20），所以語言層是 T0 多語交易介面的依賴；T2 是否等三種語言都上線，見第 7 節第 16 項。

## 6. 分期路徑

每一期都有明確的退出點；任何一期都可以停在原地而不損害遊戲。把 T0 放在 T1 之前，是本文對實作計劃次序的偏離（第 0 節）；若擁有者選計劃的次序，T1 只需要 P1、P2 與 NFT entitlement 用到的 P3 命令族，T0 可以並行。

| 期 | 內容 | 退出證據 | 依賴與擁有者決定 |
| --- | --- | --- | --- |
| **T0 · 鏈下交易** | M2 權威對局與每卡 XP → M3 線上經濟 → 玩家之間以賺來的金幣買賣賺來的卡；費用、取消、過期、對局鎖、交易歷史；防自買自賣規則 | ROADMAP M3 的驗收：金幣與卡守恆、一次性獎勵、失敗回滾、並發買賣；賣出的卡保留 UID／XP／歷史，只在買家出現一次。網頁私隱文字加入其他玩家看得到的交易紀錄；按 Ofcom 指引確認遊戲是否已屬 user-to-user 服務 | 決定 1–4、16；交易介面要多語時，依賴語言層 |
| **T1 · testnet 試點** | Base Sepolia；一個內容已知、上限已定的批次；封印流程（普通副本換成收藏身份）；經伺服器專用寫入路徑的 SIWE 連結；嵌入式錢包的原生 JS spike（包括 EIP-712 訂單能否以人看得懂的方式顯示）；testnet 免費代付；自建索引器；測試帳號之間的 Seaport 上架與成交；金鑰分權與暫停演練 | 實作計劃 P2 與 P4 的驗收：A 封印 → 賺 XP → 逐張 checkpoint → 轉給 B；B 看到同一身份與歷史；A 在確認後失去使用；重組、RPC 中斷、索引重建、錢包恢復、IPFS 還原。另加：玩家直接呼叫 Supabase REST 寫 `linked_wallets` 會失敗；issuer／publisher 撤銷後不能再鑄造或發佈；在鏈上實測鑄造、checkpoint 與成交的 gas 和確認時間；若試點有真實玩家參與，網頁私隱文字先加入與帳號連結的錢包地址（testnet 上同樣公開）與錢包處理者 | 決定 5–9；依賴 T0（本文次序）或 P1、P2 與 NFT entitlement 需要的 P3 命令族（計劃次序）；一個新的伺服器資料庫憑證 |
| **T2 · web 主網：封印與轉送** | 只限 web、已核實的成年人、律師許可的地區（美國先封鎖）；只開封印與轉送，**不開市集**；代付有每人與每月上限，封印有每帳號上限 | 英國律師意見：s6 與轉換鏈（包括 T0 與對局獎勵，也涵蓋商店版）、MLR、是否屬 CARF 申報者；稅務意見；獨立安全審核；P5 封版條件；符合 ASA 的文案；年齡核實方式已選定；未成年人賺到的卡不能經 T0 流入可封印的經濟；網頁私隱文字加入鏈上公開並與帳號連結的錢包地址、錢包處理者，以及年齡與地區核實；風險說明（含釣魚警告）在每種已上線語言都完整；一季實際成本與預算對照 | 決定 10、11、14、16；若按第 16 項等三語上線，依賴語言層 |
| **T3 · web 市集** | 自建 Seaport 市集；成交幣種已定；買家經受規管的第三方 onramp 取得付款資產；短期訂單、簽名前的說明與撤銷授權入口 | 律師意見涵蓋成交幣種（金融推廣、MLR 交易所、CARF）；需要時完成 MLR 註冊與 CARF 盡職審查流程；私隱文字加入稅務身份（若需要）；VAT 處理已定 | 決定 12、13 |
| **T4 · 商店版展示** | iOS（之後 Android）唯讀收藏頁：持有權不解鎖任何東西，沒有購買按鈕 | 先確認年齡評級（PEGI／Apple）與 Google Play 預查；商店版私隱披露與 privacy manifest 已修訂；整個功能完整上架，沒有隱藏部分；第 5.2 節的博彩分析已涵蓋商店版 | 決定 15 |

T0 本身就有價值：即使永遠不上鏈，玩家之間交換卡也是收藏卡遊戲應有的玩法。

## 7. 擁有者決定

1. **重開的性質。** 建議：現階段只記錄「重新研究」；退役文字保持為歷史。到選擇開始 T1 時，才按 HANDOVER 所指，先更新 ROADMAP 的退役段落。
2. **分期次序。** 實作計劃的次序是 P1 加並行的 P2，再加 NFT entitlement 需要的 P3 命令族；玩家交易不必擋住固定內容試點。本文建議偏離它：先做完 T0 鏈下交易，才開 T1。理由：交易是擁有者想要的玩法，本身就有價值；它建的正是 NFT 要坐上去的那一層；經濟可以先在不涉錢的環境試。代價是 T1 較遲開始。另一選擇是沿用計劃次序，讓 T0 與 T1 並行。
3. **金幣永遠只能賺取。** 建議：是，並寫入設計原則。這是令卡包與交易不變成博彩的必要條件，但不是充分條件（第 5.2 節）。
4. **商店版恢復帳號。** T0 交易在手機上需要帳號。建議：先在 web 完成 T0，再決定商店版是否加入帳號（連同私隱披露與 app 內刪除帳號）。
5. **哪些卡可以封印。** 建議：v1 只容許內容已知的來源，例如指定批次或 西行印 兌換的指定卡；從隨機卡包抽到的卡，等法律意見再決定。原因：一旦有變現渠道，隨機來源的卡最接近博彩定義與 Google 的規則。律師對 s6 的意見可能令範圍再收窄（第 5.2 節）。
6. **批次、上限與發行方式。** 實作計劃要求在凍結介面前定下三件事：哪些限量印刷成為收藏卡、每個批次的終身上限與保留數、試點是免費領取還是定價出售；現有印刷不會自動成為稀有批次（[實作計劃](BLOCKCHAIN-IMPLEMENTATION-PLAN.md#ordered-implementation-packets)）。本文還要回答：賺到某印刷的玩家多於上限時怎麼辦。先到先得會把封印變成搶購，與「沒有壓力」相違。建議：每個收藏批次只對一個已封閉、已點算的合資格集合開放（例如某日期之前賺到的指定卡），上限等於合資格的數目，封印不設期限；不設團隊保留，或只設一個事先公開的小數目；試點免費封印，不出售。
7. **封印怎樣對應普通副本。** 建議：封印是單向兌換，普通副本在所有平台退出庫存，換成新的收藏身份，並以出處連結保留原副本的歷史（第 2.1 節）。代價是那張卡離開手機牌組。另一選擇是保留普通副本、另發一張紀念式收藏卡；但那樣同一張卡既可出戰又可出售，「封印」也會變成免費多拿一張卡的方法，所以不建議。
8. **鏈。** 建議：Base，先 Base Sepolia；Solana 保留為備選，只在有明確玩家或合作需要時才開 spike。
9. **錢包。** 建議：非託管嵌入式錢包，由供應商自己的登入因素加 passkey；外接錢包經 SIWE 連結；不用 custom JWT、session key 或託管附加服務。CDP 與 Privy 之間，以 T1 的原生 JS spike 結果決定。
10. **誰付 gas。** 建議：營運方經 relayer 付封印鑄造與 checkpoint；轉送與首次上架授權在限額內代付。做這些事的玩家不需要持有加密貨幣。市集開了以後，買家要持有成交幣種，這一點不能靠代付消除（第 4.3 節）。
11. **代付預算上限。** 建議：定一個每月硬上限。按第 4.6 節，沿用一張一 claim、連 checkpoint，一季的 gas 約 US$99，10 倍緩衝約 US$990；到上限時暫停並明示，不轉嫁玩家。
12. **收不收錢、開不開市集。** 建議：T0–T2 不收法幣，不做首次出售，也不開市集；市集（T3）在取得英國律師意見之後另作決定，成交幣種（ETH 或 USDC）在那時與律師一起定。
13. **平台費與版稅。** 建議：T3 開市集時先不收平台費（代付 gas 一季不到一百美元）；之後收不收，取決於第 12 項與律師意見，因為收費會加重 MLR、CARF 與 VAT 的問題。ERC-2981 版稅低或為零；不採用 ERC-721C。
14. **年齡與地區。** 建議：封印與鏈上交易只限經核實的成年人；T0 鏈下交易不設年齡限制，但可封印批次的卡在 T0 只能在已核實的成年人之間交易，或不進入 T0；地區按律師意見開放，美國在有美國律師意見之前封鎖。年齡核實方式要在 T2 之前選定。
15. **商店版中的收藏卡。** 建議：T2 運作一段時間後才考慮 T4；封印卡在 iOS 只顯示、不出戰，並在封印確認畫面寫明那張卡會離開手機牌組。
16. **語言。** 擁有者 2026-10-21 已表示：遊戲要有英文、繁體中文、簡體中文，之後按熱度再加。這是有依賴的偏好，不是待決的建議：遊戲今天只有繁體中文，語言層的計劃仍在研究分支（PR #20）。待決的只是時序：T2 是否等三種語言都上線才開。建議：等，因為風險說明不應只有部分玩家看得懂；選錢包供應商時，把登入郵件與彈窗的語言支援列為條件。

## 8. 本次未確立

- **Gas 用量。** 鑄造 110k、批次每張 75k、轉移 60k、`setApprovalForAll` 46k 這些數字來自一次未公開的本地 Foundry 基準，無法重現；本文只把它們當作假設。批次的 75k 不含逐張驗簽；checkpoint 的 100k 是估計，連基準也沒有。T1 要在鏈上實測。
- **Seaport 成交 gas。** 兩筆樣本（約 221k、246k）沒有交易 hash，無法核對。另一次抽樣看到直接成交 188k–254k，經 ERC-4337 EntryPoint 的成交 269k–288k，但樣本也很小。
- **Reservoir NFT API 的關閉。** 只有搜尋摘要支持 2025-10-15 關閉；原文 404。其文件網址現在轉向 Relay，只是間接跡象。
- **custom JWT 加 MFA 能否完全消除營運方控制。** 前提都有來源，但結論是法律推論，營運方或可停用或重設 MFA；需要供應商確認與英國律師意見。
- **Base 的 finality 時間**（NFT-STACK.md 記約 20 分鐘）本次沒有重新核對。
- **Passkey 在 `capacitor://localhost` 的實際行為**，未在裝置上測試。
- **供應商細節**：CDP 的 `@coinbase/cdp-core` 能否在不加 React 的原生 JS 或 Capacitor 中獨立使用；`capacitor://localhost` 能否列入 CDP 的允許清單；CDP 支援哪些 EVM 鏈；Privy 的 policy engine、key quorum 與 custom JWT 是否只限較高方案；供應商登入郵件與彈窗的英文、繁中、簡中支援；嵌入式錢包能否把 Seaport 的 EIP-712 訂單顯示成人看得懂的內容。
- **Supabase**：原生 passkey 支援；`signInWithWeb3` 是否驗證 ERC-1271／6492；能否以 `linkIdentity` 把 Web3 身份連到現有電郵用戶。
- **英國法律問題**：封印開放後，對局、金幣與卡包在《賭博法》第 6 條下的分析（第 5.2 節，這是 T2 的前提）；不設市集時營運方是否屬 CARF 申報者；遊戲內以可互換資產標價或呼籲充值是否屬金融推廣；Mythseal 的卡在大批次時是否被視為可互換；NFT 換 NFT 是否屬「安排交易」；遊戲物品有否豁免；固定內容卡包在博彩法下的分析；FCA 2026 年 10 月就技術供應商與非託管介面的諮詢結果；MLR 規例 14A 尚待適用的 2026/621 號規例修訂。
- **FCA 首次投資者的 24 小時冷靜期**：該數字出自 PS23/6，本次沒有打開原文；而且只適用於可互換加密資產。
- **PEGI**：IARC 是否已把 2026 年 6 月的準則放進 Google Play 問卷；只作展示的 NFT 會否觸發 18 級。
- **Google Play**：P2P 付款例外是否涵蓋玩家之間的 NFT 交易；二級市場立場自 2023 年未見更新。
- **費用**：Immutable 的訂單簿費用與合併確切日期；Metaplex Core 燒毀是否退還 rent、有否轉移費用；Base Gasless 計劃的現況；Alchemy Gas Manager 的 compute unit 收費；OpenSea 對 Ronin 0.5% 與全鏈 1% 何者適用；Stripe onramp 的費率與英國可用性。
- **未建模的鏈**：Soneium、ApeChain、Abstract（ZKsync VM 的 gas 不能直接比較）、Sui。
- **年齡核實**：用什麼方法、哪個供應商、收什麼資料、保存多久、每人成本多少，本次沒有研究。
- **OpenSea 與 ERC-721C**：啟用強制版稅時，現有上架會否失效；OpenSea 文件與說明頁都沒有寫（第 4.4 節）。
- **MiCA Recital 11**：EUR-Lex 本次拒絕自動讀取，內容沿用先前研究，未逐字重核。
- **美國**：沒有做美國法律分析；Dapper Labs 和解的最終批准未核實。
- **其他未研究**：歐盟各國 loot box 規則與《數位公平法》；託管市集的制裁篩查、travel rule 與 KYC 責任；Apple 2026-10-01 起的歐盟條款與完整的 External Purchase 地區清單；Apple 美國導流佣金的最終裁決。
- **價格**：代幣與 gas 價格都是 2026-10-21 的單一快照；10 倍壓力是假設，不是預測。
