# 背包、卡牌實體與牌組 · v0.4

`collection.mjs` 管理每一張實際持有的卡、它自己的成長及最多三套牌組。貨幣、抽卡、NPC 售價、回購付款及對局結算屬於 `progression.mjs`；本模組不操作儲存、網路或隨機數。引擎角色 ID 仍代表人物規則，UID 則代表玩家背包中的某一張副本。

## 保存格式

```js
{
  collectionVersion: 1,
  instanceSerial: 17,
  instances: [{
    uid: 'card-000017', cardId: 'wukong',
    level: 2, xp: 105, locked: false,
    battles: 5, wins: 3,
    acquiredAt: '2026-09-21T12:00:00.000Z', origin: 'classics-pack'
  }],
  deckSlots: [{ id: 'deck-1', name: '山海初陣', instanceIds: [/* 八個 UID */] }],
  activeDeckId: 'deck-1',
  merchantVault: [{
    instance: {/* 出售前同一張卡的完整資料 */},
    sellPrice: 180, buybackPrice: 225, soldAt: '2026-09-21T12:00:00.000Z'
  }]
}
```

UID 只在這份本地存檔內唯一。它不是鏈上資產、NFT、全球身分或跨玩家交易憑證。`instanceSerial` 單調增加，發卡時也會檢查背包及商人保管區內用過的編號；售卡不會回收序號。回購應把保管中的同一筆 instance 搬回背包，不能呼叫 mint 另造一張。

同一人物的兩張副本可有不同經驗、等級、鎖定狀態、對局次數及取得來源。舊的 `inventory`、`levels`、`deck` 只是相容欄位：`syncCollection()` 從 instances 與出戰牌組重算，不能再直接修改這些相容欄位來增加卡牌或升級。

## 成長

| 等級 | 累積經驗門檻 |
| --- | --- |
| 1 | 0 |
| 2 | 80 |
| 3 | 200 |
| 4 | 400 |
| 5 | 700 |

經驗是累積值，上限 700；level 必須由 xp 推導。只有獲指定的 UID 得到經驗，其他同名副本保持原樣。對局獲得零經驗時仍可增加出戰、勝局記錄，例如自由切磋。對局結果的單次結算與實際上場 UID 核對由 progression 模組負責。

`setInstanceXP()` 不允許降低經驗，也不允許在未完對局期間修練當局鎖定的實體。正常的已鎖卡、已入牌組卡仍可修練；鎖定是出售保護，不是成長禁令。`awardInstanceXP()` 可在結算時獎勵 pending 卡，拒絕重複 UID，避免同一次呼叫重複計數。

`getPreferredInstance()` 選同角色中經驗最高的一张，同經驗取較早 UID。它不代表當前實際出戰卡。`getDeckLevels()` 使用 active deck 選中的精確實體；相容 `levels` 中，出戰牌組的選擇優先，其他人物才使用最高經驗副本。角色相容介面的升級按鈕若要升級正在使用的一張，應先讀 active deck，而非直接用 preferred。

## 牌組及保護

- 一套牌組須有八個本人持有的 UID，而且八位角色不同；不能用同人物兩張副本繞過唯一角色限制。角色星數總和不超過 25。
- 槽位固定為 `deck-1`、`deck-2`、`deck-3`。保存、切換牌組不會複製或消耗卡牌；可以在多套牌組使用同一張卡。
- 至少保留一套已存在的有效牌組。刪除出戰中的槽位時，切換到其餘第一套；目前對局的 snapshot 不隨牌組切換改動。
- `getInstanceProtection()` 對出售回傳原因，優先檢查未完對局、手動鎖定、任何已保存牌組、該角色最後一張；沒有保護才回傳 `null`。
- `pending.instanceIds` 保護當局的精確八張副本。即使中途改換牌組、把某張移出所有保存牌組，當局結束或放棄前仍不能賣掉或修練它。
- 商人保管區不計作玩家持有；不能拿尚未回購的卡入陣，也不能把它算作出售最後一張的保護副本。

## 遷移及損壞資料處理

`hydrateCollection(profile, {now})` 保留外層已驗證的 profile 欄位，只整理 collection 相關資料。當沒有 `instances` 欄位、也沒有 `collectionVersion: 1` 標記時，才從舊 inventory／levels／deck 遷移。每一張原有副本取得不同 UID，並繼承舊角色等級對應的經驗門檻；原創起始角色的最少一張規則只適用此舊格式遷移。經典角色歡迎贈禮仍由 progression 決定。

一旦是 canonical 格式，instances 是所有權依據。空陣列、錯誤的 instances 型別或只有 collectionVersion 標記，都不會藉舊 inventory 重新發卡。缺少八位可用角色時保留空牌組，讓外層顯示存檔問題；不能為了讓畫面看起來正常而補造遺失的卡。

有效 UID、人物 ID、經驗、取得資料、鎖定及對局紀錄會保留。level 從 xp 重算；非法計數修正到合理範圍。重複 UID 保留第一筆有效 instance，背包優先於商人保管區，兩者不能同時擁有同一 UID。即使某筆資料因無效而被移除，其可解析的序號仍留作發卡序號下限，避免重用舊編號。商人條目保留原本的卡、售價、回購價及售出日期；回購價小於售價等無效條目會被捨棄。

無效牌組會移除；如果沒有留下有效牌組，依序嘗試舊的角色牌組、起始八張牌、現有角色中星數最低的八位，選用各人物最高經驗副本。只有實際持有且符合 25 星規則才建立牌組。已保存的有效 UID 選擇不會擅自換成另一張更高等級的同名卡。

## 主要函式

`createCollection`、`migrateCollection` 是 `hydrateCollection` 的別名；都會辨認 canonical 資料，不會強制重新發卡。

```js
getInstance(profile, uid)                  // 找不到時拋出錯誤
getInstances(profile, cardId?)              // 背包副本，不包括 merchantVault
getPreferredInstance(profile, cardId)      // 最高經驗副本或 null
getActiveDeck(profile)                     // {id,name,instanceIds} 或 null
getDeckLevels(profile)                     // active deck 的 cardId → level
validateInstanceDeck(profile, instanceIds) // {valid,errors,stars,cardIds,instanceIds}
getInstanceProtection(profile, uid)        // 出售保護原因或 null
getXPThreshold(level)
getInstanceLevel(xp)
getXPProgress(instanceOrXP)                // level,xp,currentThreshold,nextThreshold,
                                          // progressXP,neededXP,progress(0..1),maxed
mintInstance(profile, cardId, {source,now}) // {profile,instance}；新卡 Lv.1 / XP 0
setInstanceXP(profile, uid, xp)             // profile
awardInstanceXP(profile, uids, amount, {win}) // {profile,changes}
toggleInstanceLock(profile, uid)           // profile
saveInstanceDeck(profile, {slotId,name,instanceIds}) // profile
activateDeck(profile, slotId)              // profile
deleteDeck(profile, slotId?)               // profile，預設 active deck
syncCollection(profile)                   // 重算相容欄位；不發卡、不修復所有權
```

Getter 回傳不可修改的副本。寫入函式回傳新 profile，輸入不變；失敗交易不得保存中間狀態。`awardInstanceXP().changes` 每張包含 `{uid,cardId,beforeXP,afterXP,beforeLevel,afterLevel,gainedXP}`。貨幣扣除、實體移出／回購及保存必須由 progression／UI 合成一次交易完成。
