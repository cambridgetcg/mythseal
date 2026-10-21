# 萬象契 · 交易／NFT／收藏卡路線：鏈上玩法、登入與 gas

狀態：**proposal · 2026-10-21**。沒有選定任何鏈、錢包供應商或市集；沒有部署合約、鑄造 token、開設付費服務或改變遊戲權益。外部來源全部於 **2026-10-21** 查閱；有頁面日期者另行註明。本文是研究與建議，不是法律或稅務意見；標示「推論」的地方需要律師、會計師或平台預審確認。

擁有者今天的方向很清楚：逼玩家課金不道德，想走的是交易、NFT 與收藏卡。本文回答三件事：鏈上玩法怎樣接上現有遊戲、登入流程怎樣設計、實際交易的 gas 由誰付和怎樣付；並列出平台、法律與倫理上的界線，以及一條每步都可停下的分期路徑。

## 0. 目前位置

- **2026-09-23 的退役仍然有效。** [ROADMAP](../ROADMAP.md#retired-collectible-launch-phases) 把 M6／M7 收藏發行從交付目標中移除；本文不改寫那段文字，也不重新排入工作隊列。
- **2026-10-21 擁有者重新打開研究。** ROADMAP 已加一條日期紀錄，指向本文；退役文字保留為歷史，直到擁有者作出決定。
- **從實作計劃的依賴重新開始。** ROADMAP 指明若重開收藏，應從 [區塊鏈實作計劃](BLOCKCHAIN-IMPLEMENTATION-PLAN.md) 的依賴出發：P1 可信對局（M1–M2）→ P3 線上經濟（M3）→ P2 本地收藏核心 → P4 testnet 整合試點 → P5 正式決策與審核。本文沿用這個次序，並補上 09-23 之後的變化。
- **今天實際有的東西：**
  - 伺服器只有電郵登入與旅程備份；它不授權卡牌、XP、貨幣、交易或 NFT（[server/README.md](../server/README.md)）。沒有伺服器端卡牌身份、XP 帳或交易表。
  - 每張卡的編號、XP 與歷史只存在可自行修改的本地存檔（[BACKPACK.md](BACKPACK.md)）。
  - `contracts/` 只有一個本地 ERC-721 測試 fixture，沒有遊戲合約或部署腳本（[contracts/README.md](../contracts/README.md)）。
  - iOS 商店版不含帳號登入（[IOS-FIRST-FLIGHT.md](IOS-FIRST-FLIGHT.md)），所以手機上暫時沒有連結錢包的入口。
  - 實作計劃的基線（`ed60996`、433 項測試、v0.5.1）已過時；今天 `main` 為 `3f3d351`。

這份文件延續 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) 與 [NFT-STACK.md](NFT-STACK.md) 的設計：三層身份（人物、批次、每一張）、ERC-721 一張一枚、cap 計算曾經鑄造的總數、XP 由後端權威保存並隨卡轉手。這些原則在本次研究中沒有被推翻，下文不重複其細節。

## 1. 2026-09-21／23 之後的變化

### 政策

| 範圍 | 變化 | 對本路線的影響 |
| --- | --- | --- |
| Apple | App Review Guidelines 於 2026-10-16 更新。3.1.1 對 NFT 的用語是「可以」用 IAP 出售 NFT 及鑄造、上架、轉移服務；IAP 之所以必須，是來自 3.1.1 對數位內容的一般規則。新增 2.5.19：不得含隱藏或休眠功能。5.1.1(ix) 自 2025-11-13 把加密貨幣交易所列為高度受規管服務。[指引](https://developer.apple.com/app-store/review/guidelines/)、[更新說明](https://developer.apple.com/news/?id=app-review-guidelines) | 交易功能不能先藏在商店版再開啟；要麼完整上架並通過審核，要麼不放進 app |
| Apple 美國導流 | 第九巡迴法院 2025-12-11 維持藐視裁定，但推翻「零佣金」並發回重定費率；最高法院 2026-06-30 受理（限第一問題），2026-08-13 拒絕暫停地區法院程序。據報道 Apple 8 月提出 15% 佣金，未見裁決（美國最高法院案卷 25-1311）。 | 美國外連結帳不應預算為免費 |
| 英國 CMA | 2026-06-30 至 07-28 就 Apple 導流行為要求諮詢，08-14 公布回應；尚無最終要求。[個案頁](https://www.gov.uk/cma-cases/apples-mobile-platform) | 英國商店版目前仍不能放站外購買按鈕 |
| Google Play | 區塊鏈內容政策自 2023 年未見 NFT 條文改動。美國外部內容連結的下載回報及收費期限延至 2026-12-01（只限外部內容連結；替代計費仍為 2026-10-01）。[區塊鏈政策](https://support.google.com/googleplay/android-developer/answer/16302285)、[美國計劃](https://support.google.com/googleplay/android-developer/answer/15582165?hl=en) | [MOBILE-RELEASE.md](MOBILE-RELEASE.md) 的 2026-10-01 日期需按此更正 |
| PEGI | 2026-03-12 公布，6 月起送審的遊戲適用：涉及可交易、遊玩必需或屬核心玩法的 NFT 購買評為 18；付費隨機物品評為 16（PEGI 標籤頁及新聞稿）。 | 全年齡遊戲的最大新限制 |
| 英國 FCA | 新 FSMA 加密資產制度 2027-10-25 生效；最終規則 2026-06-30 公布；申請窗口 2026-09-30 至 2027-02-28，已註冊 MLR 的公司不會自動轉換。PS26/18 周邊指引於 2026-09-16 公布（PERG 18）。[新制度](https://www.fca.org.uk/firms/new-regime-cryptoasset-regulation/how-gateway-will-operate)、[PS26/18](https://www.fca.org.uk/publication/policy/ps26-18.pdf) | 見第 5 節；舊文件以為 NFT 周邊待定，現在已有指引 |
| 台灣 | 《虛擬資產服務法》2026-06-30 三讀、07-22 公布，施行日由行政院定。 | 見第 5 節 |
| 認證標準 | WebAuthn Level 3 於 2026-08-25 成為 W3C Recommendation。[WebAuthn L3](https://www.w3.org/TR/webauthn-3/) | passkey 規則以此為準 |

### 鏈

- **Base 的成本下限由治理決定。** 最低 L2 base fee 於 2025-12-04 在主網首次啟用（200,000 wei），之後分五步升至 5,000,000 wei（0.005 gwei），2026-02-19 生效，約 2.5 個月內升 25 倍。2026-10-21 實測 Base 與 Base Sepolia 都正好在這個下限。[網路費用](https://docs.base.org/base-chain/network-information/network-fees)、[設定變更紀錄](https://docs.base.org/base-chain/network-information/configuration-changelog)
- **Base 升級。** Isthmus（2025-05-09）帶入 Pectra 的 EIP，包括 EIP-7702；Cobalt 於 2026-09-30；Denim 目標 2026 年 11 月；Everest 計劃原生批次與代付（EIP-8430），日期未定。[升級總覽](https://docs.base.org/upgrades/overview)
- **Ronin** 於 2026-05-12 改為以 OP Stack 建造、資料放在 EigenDA 的 Optimium；L2BEAT 認為它未達 Stage 0，5-of-6 多簽可即時升級。[L2BEAT](https://l2beat.com/scaling/projects/ronin-network)
- **Immutable X** 已於 2026 年初併入 Immutable Chain（官方文件未給確切日期），寫入停止、原市集移除。所有 ERC-721／1155 必須實作 Operator Allowlist，否則被排除於生態市集並向 Passport 用戶顯示仿冒警告。[合併說明](https://docs.immutable.com/x/migration-guides)、[Operator Allowlist](https://docs.immutable.com/docs/products/asset-contracts/operator-allowlist)
- **Solana rent 下調。** SIMD-0437 第二步（每 byte 5,080 lamports）已在主網生效，第三至五步預期 2026 年 11 月隨 Agave 4.4 降至 696。[Solana reduced rent](https://solana.com/upgrades/reduced-rent)

### 錢包與基建

- Base Account SDK 文件已搬到 CDP，改稱 Coinbase Wallet SDK，套件仍是 `@base-org/account`；[NFT-STACK.md](NFT-STACK.md) 提到的 SDK 遷移以此為準。[CDP 說明](https://docs.cdp.coinbase.com/coinbase-wallet/overview)
- Phantom Connect 的開發者入口目前不接受新申請。[Phantom Portal](https://docs.phantom.com/phantom-portal/portal)
- Ronin Waypoint 改名 Ronin Stash，改用 Privy。[Sky Mavis](https://docs.skymavis.com/mavis/ronin-waypoint/overview)
- Sequence 價格頁顯示 Polygon Labs 正在收購它；Dynamic 價格頁註明 2025 年 10 月被 Fireblocks 收購。
- OpenZeppelin Defender 已於 2026-07-01 停止服務，改為自行運行的開源 Relayer／Monitor。[公告](https://www.openzeppelin.com/news/doubling-down-on-open-source-and-phasing-out-defender)
- Magic Eden 於 2026-03-09 結束 EVM NFT 市集（[Cointelegraph](https://cointelegraph.com/news/magic-eden-winds-down-evm-bitcoin-nft-markets-to-focus-on-gambling)）；Alchemy 於 2026-09-30 停用 `getNFTSales` 等 NFT 端點，銷售資料沒有直接替代（[變更紀錄](https://www.alchemy.com/docs/changelog/2026/8/18)）。
- OpenSea 平台費自 2025-09-15 起所有鏈由 0.5% 改為 1%。[OpenSea changelog](https://docs.opensea.io/changelog/opensea-fee-update)

### 成本

在 L2 上，gas 已不是主要成本：以 2026-10-21 價格估算，Base 上鑄一張約 US$0.0016，一宗 Seaport 成交約 US$0.0034（第 4 節）。真正較大的是卡費、市集費、代付服務的每次操作費，以及法律與合規成本。

## 2. 鏈上玩法怎樣接上遊戲

### 2.1 持有權與對局

**後端仍是 XP 的權威。** 對局、反作弊與 XP 計算由伺服器負責；鏈只記錄發行與持有權。這與 [BLOCKCHAIN-DESIGN.md](BLOCKCHAIN-DESIGN.md) 一致，原因也不變：把 XP 寫上鏈不會令伺服器算錯的戰果變成正確，反而令每局都要等鏈。

建議的接法：

1. **「封印上鏈」，不是預先鑄造。** 玩家在遊戲中賺到的卡，平時只是後端紀錄。玩家主動選擇把某一張「封印」成收藏卡時，伺服器才排程鑄造；那張普通副本從此綁定到 `(chainId, contract, tokenId)`，沿用同一個 `assetId`、XP 與歷史。這等於「lazy mint」：沒人要的卡不會佔用鏈上供應，營運方也不用預付。v1 只做單向封印，不做解封；解封等於把 token 交回營運方保管，會帶出託管問題（第 3.5 節）。
2. **XP 跟 token 走，帳號金幣不跟。** 成長事件以 `matchId + assetId + rewardType` 為唯一鍵；轉手後新持有人讀同一條事件帳。XP 只來自對局，不來自交易，避免自買自賣刷 XP。
3. **轉手的時點。** 索引器讀到轉移事件並達到選定的確認門檻後，才把卡的使用權交給新持有人。看到 mempool 或剛送出的交易都不算。
4. **進行中的對局。** 開局時凍結精確的卡、持有人和已確認區塊，並對該卡設短期對局占用；提交與結算時再核對。若結算前確認轉出，按事先公布的規則作廢該局對這張卡的未結算獎勵；已結算的歷練留在卡上。
5. **索引與重組。** 因 Alchemy 的 NFT 銷售端點已停、Reservoir 不能依靠（第 8 節），自建索引器讀 `Transfer` 與 Seaport 事件，保存區塊 hash 與 log 身份，可重播、可重建。資料庫只是可重建的索引，不是持有權的來源。
6. **Metadata。** XP 變化經版本化的 `tokenURI` 公開；變更時發出 ERC-4906 `MetadataUpdate` 或 `BatchMetadataUpdate`，鑄造時不發（ERC-4906 建議如此）。[ERC-4906](https://eips.ethereum.org/EIPS/eip-4906) 市集快取可能落後，所以買家應在遊戲內看到成交時的 XP 快照。
7. **遊戲鎖不是鏈鎖。** 遊戲內「鎖定」只是 UI 保護；錢包仍可在遊戲外轉出。轉出後舊持有人的牌組標記缺卡。

### 2.2 收藏卡在各平台能做什麼

| 平台 | 可以 | 不可以 | 根據 |
| --- | --- | --- | --- |
| **Web** | 封印、連結錢包、查看、轉送；若法律意見許可，上架和購買 | 讓未成年人交易；把卡價當投資宣傳 | 第 5 節 |
| **iOS 商店版** | 查看自己的 NFT（ownership 不能解鎖任何功能）；普通遊戲副本照常遊玩 | 以 NFT 持有權解鎖戰鬥能力；在美國以外放站外購買按鈕；把加密錢包當解鎖機制；先藏後開的交易功能 | Apple 3.1.1、3.1.1(a)、2.5.19 |
| **Android（Google Play）** | 經申報與標示後，NFT 內容可存在 | 收錢換取內容不明的 NFT；宣傳賺錢；拿 NFT 下注 | Google 區塊鏈政策 |

**兩家商店有一處相反。** Google 希望玩家購買的 NFT 能在遊戲中使用；Apple 不容許 NFT 持有權解鎖功能。推論：同一件 app 內出售的 NFT 很難同時滿足兩者。最乾淨的做法，是讓可玩的卡永遠是後端遊戲副本；封印後的收藏卡在 iOS 只作展示，不在 app 內出售。Google 方面要預先向 Play 查詢。

**封印後的卡在 iOS 能否出戰** 是要擁有者決定的事（第 7 節）。保守建議：v1 在 iOS 上，封印卡只顯示不出戰；普通副本完全不受影響。這樣錢包持有權就不會成為手機上的功能門檻。

**年齡評級是另一層。** PEGI 的標籤頁把「可交易、遊玩必需或屬核心」的 NFT 購買評為 18，但新聞稿的措辭更廣，提到 NFT 或區塊鏈機制。只作展示的 NFT 會否也觸發 18，目前沒有答案（第 8 節）。所以商店版加入任何 NFT 內容之前，先要確認評級。

### 2.3 M3 玩家交易與 NFT 的關係

**建議先做鏈下交易（T0）：用賺來的遊戲金幣，買賣賺來的卡。** 理由：

1. **地基相同。** 任何 NFT 路線都需要伺服器卡牌身份、XP 帳、交易鎖、收據與 outbox。實作計劃把 P1／P3 放在 P4 試點之前，舊 M6 也要求先有 M2–M3 的權威身份。先做鏈下交易，就是在建 NFT 將來要坐上去的那一層。
2. **鏈下交易避開了大部分規則。** 不涉真錢、不涉加密資產，就不觸發商店 NFT 條款、PEGI 的 NFT 18 級，也不觸發 MLR 的「交易所」定義。代價是商店版要恢復帳號，並更新私隱披露（第 3.3 節）。
3. **可以在不傷人的情況下試經濟。** 費用、取消、過期、對局鎖、防自買自賣，都可以先在不涉錢的環境驗證，錯了也能用可稽核的補正事件修正。
4. **NFT 可以之後再疊上去。** 封印是 opt-in 的一層；收藏卡 ID 不需要等於普通卡 ID。鏈下交易成功與否，不會把遊戲鎖死在某條鏈上。

[ROADMAP M3](../ROADMAP.md#m3--move-the-daily-economy-online-then-add-player-trading) 已有驗收條件：賣出的卡保留 UID、XP 與歷史，離開賣家可用牌組，只在買家庫存出現一次。T0 沿用這個條件，不另訂一套。

**金幣必須永遠只能賺取，不能購買。** 一旦金幣能用錢買，「用金幣開隨機卡包，再把卡封印賣錢」就把隨機卡包變成有金錢價值的抽獎（第 5.3 節）。

## 3. 登入流程

### 3.1 前提

- 現有 Worker 代理 Supabase Auth：瀏覽器沒有 Supabase SDK，也不持有 session token，cookie 是 `HttpOnly`（[server/README.md](../server/README.md)）。這是好的安全邊界，下列流程保留它。
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
5. **把錢包連結到帳號。**
   1. 伺服器（現有 Worker）發出一次性 nonce。
   2. 客戶端組成 SIWE（EIP-4361）訊息，包含 domain、URI、chainId、nonce 與 issuedAt，交錢包簽名。
   3. 伺服器用支援 ERC-1271 與 ERC-6492 的驗證器核對（Coinbase smart wallet 的簽名帶 ERC-6492 包裝；viem 可處理）。[CDP 認證指南](https://docs.cdp.coinbase.com/coinbase-wallet/guides/authenticate-users)
   4. 寫入 `linked_wallets(user_id, chain, address, method, verified_at)`：`(chain, address)` 唯一，RLS 以 `auth.uid()` 限制。
   5. 解除連結需要再次電郵驗證碼。
6. **外接錢包。** 熟悉加密的玩家可用 Coinbase Wallet、MetaMask 等，走同一個 SIWE 連結流程；只在 web 提供，因為 Coinbase Wallet 用彈出視窗。
7. **對局留在鏈下。** 只有持有權變更（封印、上架、購買、轉送）上鏈，每一步都有確認畫面並由玩家簽名。初期沒有伺服器簽名者、委派存取或有轉移權限的 session key。
8. **Gas 由營運方代付**（第 4.2 節），玩家不需持有或存入任何加密貨幣。

### 3.3 iOS 商店版建議流程

1. **離線優先，不要求登入。** Apple 5.1.1(v) 不容許在沒有重要帳號功能時強迫登入。
2. **可選的雲端存檔／交易帳號。** 在 app 內輸入六位數驗證碼，不用 magic link，以免處理深層連結。這是自家帳號系統，所以 Apple 4.8 的替代登入要求不適用；日後若加入 Google 等社交登入，就要同時提供 Sign in with Apple 或同等選項。
3. **能建立帳號就要能在 app 內刪除帳號**（5.1.1(v)）。
4. **首次登入時把本地旅程併入帳號**，沿用現有雲端存檔流程。
5. **恢復帳號會改變私隱承諾。** 商店版的 `privacy.html` 與 iOS privacy manifest 現在都聲明不收集資料；T0 交易需要帳號，兩者都要修訂後才上架。
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
- **結論**：不要託管附加服務；不要伺服器簽名者或有轉移權限的 session key；營運方不持有玩家的可互換 token（gas 一律代付）。在任何收錢或 P2P 交易之前，取得英國律師意見。

## 4. 交易與 gas

### 4.1 鏈的比較（2026-10-21 價格）

下表的每次成本是推論：以假設的 gas 用量（鑄一張 110k、一宗 Seaport 成交 230k）乘以 2026-10-21 約 10:11–10:31 UTC 從公開 RPC 讀到的 `eth_gasPrice`，再按 CoinGecko 同日價格換算（ETH ≈ US$2,450、POL US$0.0957、IMX US$0.154、RON US$0.059、SOL ≈ US$106）。這些 gas 用量未在鏈上量度過（第 8 節）。

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
| 玩家封印一張卡（鑄造） | 營運方付。伺服器 relayer EOA 定時批次鑄造，不經 ERC-4337 |
| 第一次上架 | 玩家簽一次 `setApprovalForAll`，由 paymaster 代付 |
| 上架 | 玩家離線簽 Seaport 訂單，不用 gas |
| 取消上架 | Seaport 預設要上鏈 `cancel` 或 `incrementCounter`；用自有 zone 可改為鏈下取消 |
| 成交 | 由 paymaster 代付，平台費回收；或買家自付 |
| 轉送／轉出到外部錢包 | 在每人限額內代付 |
| XP checkpoint | 營運方付；每段時間一個雜湊，加一個 `BatchMetadataUpdate` |

**Paymaster（2026-10-21 頁面）：**

| 供應商 | 主網加成 | 其他 | 鏈 |
| --- | --- | --- | --- |
| CDP Paymaster | 代付 gas 加 7%，按月結算 | 合約白名單、每用戶上限、全域上限；支援 ERC-4337 帳戶及經 EIP-7702 升級的 EOA | 只限 Base、Base Sepolia |
| Pimlico | 加 10%；testnet 無加成 | 每月含 10M credits；頁面上每次 userop 的價格前後不一致 | 100+ 條 EVM 鏈及 Solana |
| Alchemy Gas Manager | 加 8% | 免費層只限 testnet | — |
| thirdweb | 加 2.5% | 首 1,000 宗代付交易包含在內，之後每千宗 US$1；月費 US$99 起 | 多鏈 |

來源：[CDP Paymaster](https://docs.cdp.coinbase.com/paymaster/introduction/welcome)、[Pimlico](https://www.pimlico.io/pricing)、[Alchemy FAQ](https://www.alchemy.com/docs/wallets/reference/gas-manager-faqs)、[thirdweb（頁面 2026-10-15）](https://thirdweb.com/pricing)。

**批次。** 建議由伺服器 relayer EOA 直接批次鑄造，因為 ERC-4337 UserOperation 本身的開銷不小：Alchemy 的 Base 基準（費用快照 2025-01-30）顯示，一次原生轉帳經 userop 執行約 151k–191k gas，而 EOA 只需 21k。[aa-benchmarks](https://github.com/alchemyplatform/aa-benchmarks) EIP-7702 讓 EOA 執行委派程式碼，支援原子批次與第三方代付；它已是 Final，並自 2025-05-07 隨 Pectra 在以太坊啟用。[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)、[Pectra](https://ethereum.org/roadmap/pectra/) Defender 已停，relayer 用自建的簡單 EOA 加 nonce 管理，或開源 Relayer。

**Lazy mint。** 封印上鏈本身就是 lazy：只有玩家選擇封印時才鑄造。預先鑄滿 cap 在 Base 上不貴（約 1 萬張十來美元），但會把未經遊玩賺得的供應放上鏈，也削弱「每張都有自己歷練」的非互換論點，所以不建議。

**代付的上限。** 代付只限白名單合約的指定方法；設每人及每月總額上限；達到上限時暫停代付並明示，不改為向玩家收費。

### 4.3 市集

- **自建遊戲內市集，以 Seaport 1.6 結算。** 賣家離線簽 EIP-712 訂單，一個簽名最多可涵蓋 2²⁴ 張訂單；成交原子結算，不需要託管。Seaport 1.6 部署在 26 個網絡（16 主網、10 testnet），包括 Base；倉庫為 MIT 授權。README 列出的唯一審計是 Trail of Bits 2022 年對原版 Seaport 的審計，不是針對 1.6。[Seaport](https://github.com/ProjectOpenSea/seaport)、[文件](https://github.com/ProjectOpenSea/seaport/blob/main/docs/SeaportDocumentation.md)
- 遊戲內市集可以顯示 XP、歷史與成交時的 XP 快照，並排除自買自賣價格；這些是外部市集做不到的。
- **OpenSea** 接受 Seaport 1.6 訂單，平台費 1%，可作為外部出口。
- **thirdweb MarketplaceV3** 的直接上架不託管 NFT，英式拍賣則託管 NFT 與出價。[設計文件](https://portal.thirdweb.com/tokens/design-docs/marketplace)
- 不用自訂交易所合約、可互換代幣、跨鏈橋或租借，與實作計劃一致。

### 4.4 版稅

- **ERC-2981 只是報告版稅**，付不付由市集自願決定。[ERC-2981](https://eips.ethereum.org/EIPS/eip-2981)
- **ERC-721C**（Limit Break，MIT）加入轉移驗證器以強制版稅；OpenSea 對 721-C 集合以 Seaport hooks 與 SignedZone 執行，啟用時會令現有上架失效（文件 2026-08-17）。721C 的 README 要求配合 OpenZeppelin 4.8.3，而我們用 5.6.1。[創作者費用](https://docs.opensea.io/docs/creator-fee-enforcement)、[creator-token-standards](https://github.com/limitbreakinc/creator-token-standards)
- **建議**：只用 ERC-2981，比率低或為零；不採用 721C。強制版稅會阻擋經未核准合約的轉移，包括部分智能錢包，與「普通 ERC-721 轉移」的設計相衝；它也帶有「轉賣替營運方賺錢」的味道，與擁有者的精神不合。

### 4.5 法幣結帳

| 選項 | 2026-10-21 狀況 |
| --- | --- |
| Crossmint | NFT 結帳仍提供；每用戶每日上限 US$2,000；正式使用需簽訂單與 KYB；Crossmint 承擔退款風險。2026-07-01 起，EEA、英國、巴西買家不能用代幣結帳（NFT 不在此限）。2026 年 1 月的歐盟披露：卡費 0.5–4.5%，非美元／歐元 FX 0.5–2%，合作夥伴費 0–10%（多為 0–2.5%）。[Crossmint](https://docs.crossmint.com/payments/introduction)、[價格披露](https://help.crossmint.com/articles/6270626721-pricing-disclosure) |
| Stripe onramp | 公開預覽，需申請；Stripe 為記錄商戶，承擔詐騙與爭議責任，處理 KYC 與制裁篩查。託管頁列出美國與歐盟可用貨幣，歐盟不支援 Base 資產，沒有提到英國，也沒有公開費率。[Stripe onramp](https://docs.stripe.com/crypto/onramp) |
| Coinbase Onramp | 信用卡 2.5%，ACH 0.5%；網絡費按成本轉嫁。託管小工具的訪客結帳已於 2026-06-30 停用，改用 Headless API。[FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq) |

Onramp 只是替錢包充值，本身不是 NFT 結帳。**建議 T0–T2 完全不收法幣**：收藏卡只能從遊玩中賺取再封印；任何首次出售都是之後、取得法律意見後的另一個決定。

### 4.6 一季成本模型（推論）

假設一季 3 個月：10,000 次封印（批次）、5,000 宗成交、2,000 次轉送、1,500 位首次上架的賣家、1,000 位啟用錢包的玩家；2026-10-21 價格；假設的 gas 用量見第 4.1 節，ERC-4337 每次另加約 130k gas。

| 項目 | Base 估算 |
| --- | --- |
| 營運方只付封印鑄造 | ≈ US$11 |
| 成交由買家自付時的買家總和 | ≈ US$17 |
| 全部代付（含 ERC-4337 開銷） | ≈ US$48 |
| 全部代付，加 CDP 7% | ≈ US$51 |
| 10 倍壓力（下限再升或擁堵） | ≈ US$476，加 7% 約 US$510 |
| 嵌入式錢包（CDP） | 首月約 US$10，之後每月約 US$5，一季約 US$20 |
| 嵌入式錢包（Privy，500–2,499 MAU） | 每月 US$299，一季約 US$900；499 MAU 以下免費 |
| 自建索引器與 RPC | 未定價 |
| 法律、稅務意見 | 未定價，相信是最大一項 |

**用平台費回收代付 gas。** 一宗全代付的成交約 US$0.0053（成交加 ERC-4337 開銷）；收 2.5% 平台費，售價約 US$0.22 即可打平。若加上 Pimlico 每次 userop 的費用，約 US$0.0164，售價約 US$0.66 打平。所以 gas 不是決策重點；收不收錢、經哪條支付路線、商店規則和法律才是。

同一假設下其他鏈全部代付的 gas 約為：OP US$8、Immutable US$5（另加訂單簿費用）、Ronin US$4、Polygon US$86、Arbitrum US$159、Ethereum L1（當日低價）US$303。Solana Core 的鑄造約 US$3,200，其中約一半是可退 rent，rent 下調後會再降；cNFT 約 US$137。

## 5. 平台、法律與倫理

### 5.1 商店

- **Apple（指引 2026-10-16）**：3.1.1 容許經 IAP 出售 NFT 及相關服務；查看自己的 NFT 可以，但持有權不能解鎖功能；加密貨幣與錢包不能作為解鎖機制。瀏覽他人收藏時，美國以外不得放引向非 IAP 購買的按鈕（某些地區另有 External Purchase Link 權限）。付費隨機物品要先披露機率。3.1.5：錢包須由組織帳號發行，交易所功能須在各地持牌。5.3.3／5.3.4：IAP 不能購買真錢博彩的額度，真錢博彩須持牌並限地區。年齡評級把以真錢或可兌換真錢的遊戲貨幣下注定為「Gambling」，18+；loot box 全球為 9+，但澳洲為 16+、巴西為 A18。[年齡評級](https://developer.apple.com/help/app-store-connect/reference/age-ratings)
- **Google Play**：銷售或讓玩家賺取代幣化資產須在 Financial features 申報並標示產品；不得宣傳遊玩或交易賺錢；不得收取有金錢價值的東西換取內容價值不明的 NFT；不披露內容與價值的 NFT 套裝屬明列違規；不得以 NFT 下注。付款政策要求數位物品用 Play Billing，但 P2P 付款與網上拍賣不得用 Play Billing；玩家之間的 NFT 交易是否屬這個例外，Google 未有確認。英國的 user-choice billing 不包括遊戲。[付款政策](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)、[user-choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)

### 5.2 英國

- **FCA**：MLR、FSMA 新制度與控制權，見第 3.5 節。
- **金融推廣**：《金融推廣令》第 26F 段把合資格加密資產定義為可互換且可轉讓（2026/102 號規例替代的文本只在特定用途生效，2023 年文本亦相同），所以真正不可互換的 NFT 一般不在加密推廣制度內。[FPO 26F](https://www.legislation.gov.uk/uksi/2005/1529/schedule/1/paragraph/26F)
- **ASA／CAP 廣告**：CAP 2024-05-23 的指引認為收藏式 NFT 容易被理解為投資產品；廣告須說明 NFT 不受規管、價值可跌，並披露鑄造與 gas 費、所需錢包與鏈，以及持有 NFT 未必帶有知識產權。FanCraze（2023-11-15）的 NFT 板球卡裁決支持了未標明廣告、沒說錢包與鏈、投資框架和漏寫 gas 費、沒有風險警告等投訴，並要求說明卡只能在專屬平台交易。
- **博彩委員會**：《2005 年賭博法》第 6 條以「金錢或金錢價值」定義獎品；第 14 條的簡單彩票獎品包括物品與服務；第 33 條把無牌提供博彩設施列為罪行。委員會 2017 年的立場是：鎖在遊戲內、不能套現的 loot box 物品，不太可能構成須持牌的博彩；能套現或交易換取有價物的物品，就屬金錢價值。DCMS（2022-07-18）稱能否合法套現是與博彩的「重要分別」，並表示委員會會對構成無牌博彩的交易行動。推論：一旦營運方自設市集讓卡換錢，付費隨機卡包很可能屬須持牌的博彩。
- **消費者法（CMA207，2025-11-18 更新）**：標價須包括必付費用，無法預先計算的要說明計算方法，這包括 gas；禁止直接催促兒童購買，指引以遊戲內橫額作例子；禁止虛假限時聲稱。數位內容的 14 日取消權，須在消費者明示同意並確認會失去取消權後才失去。
- **VAT（HMRC GfC21，2026-10-21 更新）**：沒有特別的加密 VAT 規則，NFT 跟隨其背後的供應；設定條款或授權收費的平台一般須為第三方銷售負責 VAT；B2C 電子服務按客戶所在地徵稅，單靠錢包紀錄不足以證明客戶所在地。推論：營運方自設市集可能要為玩家之間的銷售負責 VAT，需要稅務意見。

### 5.3 歐盟、台灣、香港

- **歐盟 MiCA**：第 2(3) 條排除獨一且不可互換的加密資產。Recital 11 指出：大量系列發行是可互換的指標，唯一識別碼本身不足夠，按實質判斷；NFT 的分割部分不算獨一。消費者保護合作網絡 2025-03-21 對遊戲內虛擬貨幣的原則（不具約束力）要求以真錢標價、不隱藏成本、不迫玩家買不需要的貨幣，並照顧弱勢與兒童。
- **台灣**：《虛擬資產服務法》第 3 條把具支付或投資用途的價值定為虛擬資產，並排除表彰價值具不可代替性的 NFT；服務提供者須取得金管會許可。施行日由行政院定。來源為非官方法規鏡像與律師事務所通訊，正式文本以公報為準。
- **香港**：證監會 2022-06-06 表示，真正代表收藏品的 NFT 一般不在其監管範圍；分割或可互換的 NFT 可能屬證券或集體投資計劃權益。這份聲明早於 2023 年的虛擬資產發牌制度。

### 5.4 這些規則排除了什麼

1. **付費隨機 NFT 卡包。** 英國博彩法、Google Play、PEGI（付費隨機 16、可交易 NFT 購買 18）與 Apple 的 Gambling 定義都指向同一方向。現有文件說「不要把神秘卡包變成付費隨機 NFT」；研究支持把它當作永久規則，而不是「暫時」。
2. **可用錢買的遊戲金幣。** 金幣一旦可購買，金幣卡包加上封印出售，就重新構成上一條。
3. **NFT 持有權解鎖 iOS 功能。**
4. **商店版的隱藏交易功能**（Apple 2.5.19）。
5. **向未成年人開放交易。**
6. **回購、分享版稅收益、質押或「升值」承諾。**
7. **託管錢包附加服務，以及有轉移權限的伺服器簽名者。**

### 5.5 倫理：沒有壓力，不承諾價值，保護未成年人

這條路線之所以值得做，是因為它讓玩家**擁有**自己花時間培養的卡，而不是讓遊戲向玩家**收錢**。以下做法都由此而來：

- **沒有壓力。** 不設限時促銷、倒數、「只剩幾張」或連續登入懲罰。封印與交易永遠是選擇，不封印的玩家玩到的遊戲完全一樣。
- **不承諾價值。** 介面與宣傳不顯示價格走勢、地板價或「投資」字眼；清楚寫明收藏卡可能一文不值，遊戲不保證永遠營運。Google 禁止宣傳賺錢，ASA 要求風險說明，兩者都支持這一點。
- **不獎勵交易量。** 交易不給 XP、排名或活動獎勵；偵測自買自賣，不把其成交價當作市場價。Chainalysis 2022-02-02 的研究發現，110 名有利可圖的洗售交易者合共賺約 890 萬美元，利潤很可能來自不知情的買家。
- **保護未成年人。** 交易只限經年齡核實的成年人，與全年齡遊戲分開。博彩委員會 2025-11-13 的統計顯示，在知道遊戲內物品的 11–17 歲青少年中，55% 曾用遊戲貨幣開驚喜箱，6% 曾在站外用遊戲物品下注。Zendle 與 Cairns（2018）的大型相關研究發現 loot box 消費與問題賭博的嚴重程度相關，但無法證明因果。
- **隨機只用於賺來、不可交易的東西。** 出售的東西內容固定，並公開供應上限。
- **三種語言同時提供。** 風險說明、費用、錢包與鏈的資料，從第一天起以英文、繁體中文、簡體中文提供；不在任何語言中省略警告。

## 6. 分期路徑

每一期都有明確的退出點；任何一期都可以停在原地而不損害遊戲。

| 期 | 內容 | 退出證據 | 需要擁有者決定 |
| --- | --- | --- | --- |
| **T0 · 鏈下交易** | M2 權威對局與每卡 XP → M3 線上經濟 → 玩家之間以賺來的金幣買賣賺來的卡；費用、取消、過期、對局鎖、交易歷史；防自買自賣規則 | ROADMAP M3 的驗收：金幣與卡守恆、一次性獎勵、失敗回滾、並發買賣；賣出的卡保留 UID／XP／歷史，只在買家出現一次 | 1、2、3、4 |
| **T1 · testnet 試點** | Base Sepolia；一個內容已知的批次；封印流程；SIWE 連結；一個嵌入式錢包 spike；testnet 免費代付；自建索引器；測試帳號之間的 Seaport 上架與成交 | 實作計劃 P2 與 P4 的驗收：A 封印 → 賺 XP → checkpoint → 轉給 B；B 看到同一身份與歷史；A 在確認後失去使用；重組、RPC 中斷、索引重建、錢包恢復、IPFS 還原；在鏈上實測 gas 與確認時間 | 5、6、7 |
| **T2 · web 主網，代付 gas** | 只限 web、成年人、律師許可的地區；先只開封印與轉送，市集在法律意見許可後才開；代付有每人及每月上限；三語風險說明 | 英國律師意見（MLR 註冊與否）、稅務意見（VAT）、獨立安全審核、P5 封版條件；符合 ASA 的文案；一季實際成本與預算對照 | 8、9、10、11、12 |
| **T3 · 商店版展示** | iOS（之後 Android）唯讀收藏頁：持有權不解鎖任何東西，沒有購買按鈕 | 先確認年齡評級（PEGI／Apple）與 Google Play 預查；私隱披露與 privacy manifest 已修訂；整個功能完整上架，沒有隱藏部分 | 13 |

T0 本身就有價值：即使永遠不上鏈，玩家之間交換卡也是收藏卡遊戲應有的玩法。

## 7. 擁有者決定

1. **重開的性質。** 建議：現階段只記錄「重新研究」；退役文字保持為歷史。到選擇開始 T1 時，才按 HANDOVER 所指，先更新 ROADMAP 的退役段落。
2. **先做鏈下交易（T0）。** 建議：是。它是所有 NFT 路線的地基，也避開了幾乎所有平台與監管問題。
3. **金幣永遠只能賺取。** 建議：是，並寫入設計原則；這是令卡包與交易不變成博彩的關鍵。
4. **商店版恢復帳號。** T0 交易在手機上需要帳號。建議：先在 web 完成 T0，再決定商店版是否加入帳號（連同私隱披露與 app 內刪除帳號）。
5. **哪些卡可以封印。** 建議：v1 只容許內容已知的來源，例如指定批次或 西行印 兌換的指定卡；從隨機卡包抽到的卡，等法律意見再決定。原因：一旦有變現渠道，隨機來源的卡最接近博彩定義與 Google 的規則。
6. **鏈。** 建議：Base，先 Base Sepolia；Solana 保留為備選，只在有明確玩家或合作需要時才開 spike。
7. **錢包。** 建議：非託管嵌入式錢包，由供應商自己的登入因素加 passkey；外接錢包經 SIWE 連結；不用 custom JWT、session key 或託管附加服務。CDP 與 Privy 之間，以 T1 的原生 JS spike 結果決定。
8. **誰付 gas。** 建議：營運方以 relayer 批次付封印鑄造；第一次上架授權與轉送在限額內代付；成交由 paymaster 代付，以平台費回收。玩家永遠不需要持有加密貨幣。
9. **代付預算上限。** 建議：定一個每月硬上限（按第 4.6 節，以 10 倍緩衝計，一季數百美元已足夠）；到上限時暫停並明示。
10. **收不收錢。** 建議：T0–T2 不收法幣，不做首次出售；任何收錢或 P2P 市集，都在取得英國律師意見之後另作決定。
11. **平台費與版稅。** 建議：平台費只用來回收代付 gas；ERC-2981 版稅低或為零；不採用 ERC-721C。
12. **年齡與地區。** 建議：交易只限經核實的成年人；地區按律師意見開放；全年齡遊戲本身不受影響。
13. **商店版中的收藏卡。** 建議：T2 運作一段時間後才考慮 T3；封印卡在 iOS 只顯示、不出戰。
14. **語言。** 建議：錢包、交易與風險說明從第一天起提供英文、繁體中文、簡體中文；選供應商時把其登入郵件與彈窗的語言支援列為條件。

## 8. 本次未確立

- **Gas 用量。** 鑄造 110k、批次每張 75k、轉移 60k、`setApprovalForAll` 46k 這些數字來自一次未公開的本地 Foundry 基準，無法重現；本文只把它們當作假設。T1 要在鏈上實測。
- **Seaport 成交 gas。** 兩筆樣本（約 221k、246k）沒有交易 hash，無法核對。另一次抽樣看到直接成交 188k–254k，經 ERC-4337 EntryPoint 的成交 269k–288k，但樣本也很小。
- **Reservoir NFT API 的關閉。** 只有搜尋摘要支持 2025-10-15 關閉；原文 404。其文件網址現在轉向 Relay，只是間接跡象。
- **custom JWT 加 MFA 能否完全消除營運方控制。** 前提都有來源，但結論是法律推論，營運方或可停用或重設 MFA；需要供應商確認與英國律師意見。
- **Base 的 finality 時間**（NFT-STACK.md 記約 20 分鐘）本次沒有重新核對。
- **Passkey 在 `capacitor://localhost` 的實際行為**，未在裝置上測試。
- **供應商細節**：CDP 的 `@coinbase/cdp-core` 能否在不加 React 的原生 JS 或 Capacitor 中獨立使用；`capacitor://localhost` 能否列入 CDP 的允許清單；CDP 支援哪些 EVM 鏈；Privy 的 policy engine、key quorum 與 custom JWT 是否只限較高方案；供應商登入郵件與彈窗的英文、繁中、簡中支援。
- **Supabase**：原生 passkey 支援；`signInWithWeb3` 是否驗證 ERC-1271／6492；能否以 `linkIdentity` 把 Web3 身份連到現有電郵用戶。
- **英國法律問題**：Mythseal 的卡在大批次時是否被視為可互換；NFT 換 NFT 是否屬「安排交易」；遊戲物品有否豁免；固定內容卡包在博彩法下的分析；FCA 2026 年 10 月就技術供應商與非託管介面的諮詢結果；MLR 規例 14A 尚待適用的 2026/621 號規例修訂。
- **FCA 首次投資者的 24 小時冷靜期**：該數字出自 PS23/6，本次沒有打開原文；而且只適用於可互換加密資產。
- **PEGI**：IARC 是否已把 2026 年 6 月的準則放進 Google Play 問卷；只作展示的 NFT 會否觸發 18 級。
- **Google Play**：P2P 付款例外是否涵蓋玩家之間的 NFT 交易；二級市場立場自 2023 年未見更新。
- **費用**：Immutable 的訂單簿費用與合併確切日期；Metaplex Core 燒毀是否退還 rent、有否轉移費用；Base Gasless 計劃的現況；Alchemy Gas Manager 的 compute unit 收費；OpenSea 對 Ronin 0.5% 與全鏈 1% 何者適用；Stripe onramp 的費率與英國可用性。
- **未建模的鏈**：Soneium、ApeChain、Abstract（ZKsync VM 的 gas 不能直接比較）、Sui。
- **其他未研究**：歐盟各國 loot box 規則與《數位公平法》；託管市集的制裁篩查、travel rule 與 KYC 責任；ICO 兒童守則是否適用；Apple 2026-10-01 起的歐盟條款與完整的 External Purchase 地區清單；Apple 美國導流佣金的最終裁決。
- **價格**：代幣與 gas 價格都是 2026-10-21 的單一快照；10 倍壓力是假設，不是預測。
