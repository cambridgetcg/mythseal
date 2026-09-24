/** Original continuation episodes inspired by Journey to the West. Pure authored content. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export const CAMPAIGN_LOANER_DECK = freeze(['tangsanzang', 'bailong', 'wukong', 'bajie', 'wujing', 'guanyin', 'baigu', 'huangfeng']);

// Each row supplies its own arrival, aftermath, retry, opponent roster and public tactical note.
// No node adds an invisible hazard, stat multiplier or a requirement to draw one particular card.
const volumes = [
  {
    name: '續卷一 · 同行初誓', subtitle: '經頁失去的，是誰的聲音？',
    description: '取經歸來，無字經忽然聽不見沿途人聲。從長安夜札重走初路，請每位同行者把自己的願望說完。',
    inscription: '同行初誓圖', seal: '誓', rows: [
      ['長安夜札', '燈下少一行', '夜札只剩取經人的名字，送行者卻全成空白。守札僧邀你留一盞燈，等第一句話回來。', '長安守札僧', '燈芯輕響，唐三藏寫下：願聽見每個人的路。經頁第一次有了聲音。', '守札僧添了燈油。話未說完，明夜仍有一張空凳。', 'tangsanzang bailong qingxiao yaoheng cuixian yunya wujing bajie', '低星同行者與回復技能，適合練習分配四回合的仙丹。'],
      ['鷹愁照影', '借一步踏水', '澗中倒影比岸上的馬先走了一步。照影客要你分清，是攻擊加成，還是多押的仙丹。', '鷹愁照影客', '白龍馬踏碎虛影，留下自己的蹄聲。這回，經頁記住了載人的人。', '水面重新平靜。先看清攻擊加成，再借下一步。', 'bailong cuixian nezha qingxiao tangsanzang wujing duying huangfeng', '白龍馬、翠弦與哪吒帶有攻擊加成；零丹也有不同分量。'],
      ['禪院餘燈', '火後尚有席', '禪院只記得失火，忘了有人整夜送水。守燈人收起鋒芒，請你為後兩局留些餘力。', '禪院守燈人', '一桶水的重量被寫回經頁。殘燈不再替所有人背負同一句評語。', '燈火未滅。守燈人提醒：不必把每一局都押成最後一局。', 'guanyin lindaiyu cangjiao kongzi yunya baigu yanxin yinjiao', '減傷與回復較多；先觀察對手，把重要傷害留到合適的回合。'],
      ['雲棧留客', '願望不必漂亮', '雲棧主人問八戒，除去取經還想要甚麼。答案尚未出口，案上的棋子已先替他挺起身。', '雲棧聽願人', '八戒說想有一頓不用趕路的飯。經頁沒有刪去，反而留了整行。', '飯菜仍溫。聽願人請你重新估量那些力量高、傷害輕的落子。', 'bajie luzhishen qingxiao diaochan yanxin huangfeng cuixian bailong', '高力量、較低傷害的組合，讓留丹與取捨更重要。'],
      ['黃風問路', '逆風也有名字', '風口的路牌全指向同一處。問路人用一陣逆風，試你是否還會照舊下注。', '黃風問路人', '黃沙散去，一條送水小路重新出現。經頁承認，走慢的人也曾抵達。', '路牌仍在搖。看過敵方減力技能，再決定下一枚仙丹。', 'huangfeng puti duying diaochan zhugeliang baigu yanxin wujing', '黃風怪、菩提、渡影與貂蟬削弱力量；慣用的下注未必仍夠。'],
      ['流沙夜渡', '落下的也算數', '流沙只記過岸者，不記下水修船的人。渡者請你讓一局，再看餘丹如何回到掌中。', '流沙修船客', '悟淨把沉在水裡的名字擦乾。失去的一局，也能托住下一程。', '船還繫在岸邊。修船客說，退讓之前也能先算好回程。', 'wujing baigu wangxifeng yanxin zhenyuan yaoheng tieshan bailong', '多張敗北回丹卡讓犧牲有回報；別把回丹當作勝利回復。'],
      ['四人一願', '同行不是同聲', '四個願望擠在同一行，誰也讀不清。借來這副同行牌，試着讓不同聲音各有位置。', '同願試筆人', '四行字各自站穩。眾人沒有說同一句話，卻仍決定一起走。', '試筆人把借牌收好又推回。無論行囊留下甚麼，這副同行牌都可再借。', 'tangsanzang bailong wukong bajie wujing guanyin baigu huangfeng', '可選借用同行牌組；不必持有先前得到的同伴，也能完成此境。'],
      ['燈外有聲', '把空白留給人', '燈外傳來未被邀請的聲音。封札人以逆風與回丹守住末頁，問你願不願再留一席。', '燈外封札人', '你沒有填滿空白。陌生人的一句謝謝落在頁邊，指向五莊觀的長春樹。', '封札人沒有合卷。那個聲音仍在燈外，等你帶着餘力再聽。', 'puti huangfeng wujing baigu tieshan zhenyuan qingxiao jinjiao', '減力與敗北回丹同時出現；先辨認值得爭勝的回合。'],
    ],
  },
  {
    name: '續卷二 · 長春迷局', subtitle: '留下記憶，也會留下錯誤。',
    description: '五莊觀的長春樹把每一次道歉保存成春天。想救回失去的聲音，先要分清修補與假裝從未破碎。',
    inscription: '長春問根圖', seal: '根', rows: [
      ['五莊門風', '春天停在門外', '觀門年年新綠，送果人的腳印卻沒有變過。迎風童子請你先看一次重來的代價。', '五莊迎風童子', '門栓鬆開。經頁聽見一聲遲來的「我記得」，並非「沒發生過」。', '童子仍在門前掃葉。每次重來，都可以換一種分配。', 'zhenyuan yunya kongzi tangsanzang bailong wujing huangfeng cuixian', '回復卡較多；比較每次勝利帶來的生命與仙丹代價。'],
      ['果影小徑', '落果有回聲', '樹影將落果托回枝頭，卻托不起摔倒孩子的手。拾果人要你在兩份回報間作選擇。', '長春拾果人', '一枚果實留在地上。孩子終於說出那天痛在哪裡，樹影沒有搶答。', '拾果人把兩枚棋子放開。先分清想保住的是生命，還是下一局的仙丹。', 'zhenyuan guanyin yaoheng bailong baigu wujing yanxin diaochan', '生命回復與敗北回丹並存；不同結果回復不同資源。'],
      ['斷根舊案', '錯處也要署名', '舊案抹去了折樹的手，只留下「意外」二字。看案人請你以低星牌先把真話放下。', '斷根看案人', '案末添了署名。錯誤沒有消失，修補才終於有了起點。', '案紙尚未封存。攻擊接近時，也別忘記星數如何決勝。', 'bailong tangsanzang huangfeng yinjiao baigu wujing cuixian lindaiyu', '八張低星卡組成對手；同攻時的星數判定尤其重要。'],
      ['袖裏春秋', '暫藏不是遺忘', '袖中裝得下整座春天，卻裝不下當事人的沉默。袖守以封鎖技能，留下一刻真正的空白。', '袖裏藏春人', '袖口展開，沉默自己成了一句話。經頁不再急着替人填滿。', '藏春人鬆開袖口。把被封鎖後仍可依靠的基礎能力算進去。', 'yinjiao shuangli xuanjian wukong tangsanzang bailong cuixian yunya', '封鎖技能的角色較多；能力被封後，基礎力量仍在。'],
      ['甘露井邊', '水能救誰', '井邊排着求水的人，舊碑只刻了仙家的名字。汲水人請你別只看最響亮的一次回復。', '甘露汲水人', '井沿多出幾筆小名。救樹的水，也曾被人一桶一桶提上來。', '汲水人留好繩索。回復不能超過十二點，滿盈時也可留力。', 'guanyin zhenyuan kongzi yaoheng tangsanzang yunya duying baigu', '回復上限仍是十二；對手滿血時，回復技能的價值會改變。'],
      ['空枝留果', '護住未熟時', '只有一枚青果不肯被催熟。護枝客以減傷守候，問你是否願意讓一次大攻擊落空。', '空枝護果客', '青果仍青，卻不再被責怪。經頁第一次記下一件尚未完成的好事。', '護果客仍在樹下。先引出減傷，再決定把重擊交給哪一局。', 'guanyin cangjiao tieshan lindaiyu zhenyuan cuixian huangfeng bailong', '四種減傷威脅與回復相配；先考慮重擊可能被削去多少。'],
      ['千春一息', '長春也須換氣', '每次敗局都被藏成下一枚仙丹，庭院因而遲遲不肯入夜。聽息人邀你打破這個循環。', '千春聽息人', '庭院終於有了夜色。保存不是讓每個人永遠留在同一刻。', '聽息人將棋盤翻回正面。看清哪些退讓會讓對手多出餘丹。', 'wujing baigu yanxin wangxifeng zhenyuan puti tieshan kongzi', '敗北回丹與減力形成續航；不要只把對手的失利當成消耗。'],
      ['長春還願', '把道歉種回土裡', '鎮元在樹下放下最後一局：既然錯已發生，你準備拿甚麼去修補，而不是改寫？', '長春還願人', '鎮元把一粒種子交給你。經頁留下斷痕，也留下眾人一起扶起樹的那一天。', '種子仍在掌心。還願人請你帶着清楚的取捨，再走一次春秋。', 'zhenyuan guanyin puti wujing baigu qingxiao jinjiao cuixian', '回復、減力與高傷害混合；讀清四張明牌後再安排重點。'],
    ],
  },
  {
    name: '續卷三 · 白骨三相', subtitle: '同一段相逢，容得下幾種說法？',
    description: '白骨嶺的三份口供彼此相反，平頂洞的葫蘆卻只肯收下一個答案。經頁要學的，是讓不同的見證並排存在。',
    inscription: '三相照心圖', seal: '相', rows: [
      ['嶺前野飯', '誰先看見誰', '飯香先於人影到達。記餐人問你，那天的第一眼究竟看見了饑餓，還是埋伏。', '白骨記餐人', '經頁收下兩種第一眼。白骨嶺仍冷，故事卻不再只有一張嘴。', '飯盞放回原處。重新辨認那些表面溫和、實際擅長回丹的卡。', 'baigu tangsanzang wujing yanxin diaochan cuixian kongzi yunya', '低星與敗北回丹居多；小額下注仍要計算後續資源。'],
      ['老人回頭', '遲到的一句話', '老者的背影總被寫在追趕之後。回頭客請你先承受一點不確定，再作判斷。', '山徑回頭客', '那句未能出口的話回到頁上。經頁沒有裁決，只把時間排回原位。', '回頭客站在轉彎處。保留一局不爭，未必等於把整局讓掉。', 'baigu wangxifeng tieshan lindaiyu duying bailong yaoheng huangfeng', '減傷與敗北回丹相搭；正面勝利未必換到足夠傷害。'],
      ['少女空籃', '空着也有重量', '籃裡沒有證物，只有被問過太多次的名字。持籃人請你別讓最大的牌替每個人說話。', '空籃持名人', '名字被完整地寫下。空籃並未裝滿，經頁也學會不急着填補。', '持籃人握穩籃柄。看看低星卡同攻時能否先一步決勝。', 'baigu diaochan yinjiao lindaiyu bailong wujing huangfeng tangsanzang', '低星對局中，同攻的先後手與星數判定會反覆影響選擇。'],
      ['三影石壁', '讓見證並肩', '石壁把三個人影疊成一個怪物。拓影人用三種不同技能，請你分別回應。', '三影拓壁人', '三道影子各有輪廓。你不用相信每句話，也能先不把人抹去。', '石壁留下未乾的墨。把封鎖、減力與回丹分開計算。', 'baigu shuangli duying liuer huangfeng bailong tangsanzang cuixian', '封鎖、減力與回丹各有作用；逐張看明牌，不靠同一套下注。'],
      ['平頂借名', '名字不是籠子', '洞口借走旅人的名字，便說知道了他的一生。借名客在低星牌間藏了一次高傷害。', '平頂借名客', '名字被還給主人。經頁留下稱呼，卻不再把稱呼當作完整的答案。', '借名客鬆開葫蘆口。低星牌也能護住高傷害的一擊。', 'jinjiao yinjiao baigu honghaier yanxin wujing bailong duying', '金角的高傷害與低星支援相配；別只按星數估計威脅。'],
      ['金角問答', '不接同一道題', '金角把所有問題都改成是或不是。答題人請你留下一個回合，換一種回答的方法。', '金角執問人', '葫蘆收不下那句「還要再聽」。封口鬆了，三份口供一同滑出。', '執問人重新擺好題目。攻擊減少時，算準再押，毋須急答。', 'jinjiao zhugeliang duying puti bailong yinjiao wujing yanxin', '減攻與減力同時存在；預估攻擊未計敵方效果，要自行比較。'],
      ['銀角封口', '沉默由誰選', '銀角要每份口供先交出技能，才准開口。封口人讓你試試：沒有天賦時，還剩甚麼。', '銀角封口人', '沉默回到說話的人手中。被迫安靜與自願停頓，終於不再寫作同一件事。', '封條仍鬆着。先以基礎力量判斷，再看共鳴能否留下。', 'yinjiao shuangli xuanjian wukong baigu huangfeng cuixian kongzi', '多種封鎖技能；同族共鳴與基礎能力仍須按實際效果判讀。'],
      ['白骨留白', '三相皆未完', '白骨把三份口供放在同一頁，請你落完此局，卻不要替她添上一句永遠。', '白骨留白人', '白骨同行，經頁保留三份說法與一處空白。翠雲的風捎來一封尚未拆的家書。', '留白人把墨放下。未完的見證，可以留到下一次再聽。', 'baigu liuer tieshan jinjiao shuangli wujing huangfeng bailong', '回丹、減傷與封鎖互相掩護；最後一局前仍要留意剩餘仙丹。'],
    ],
  },
  {
    name: '續卷四 · 翠雲借扇', subtitle: '一陣風，不能替兩個人道歉。',
    description: '一封家書被火焰山的熱浪擋住。循火雲洞與翠雲山的舊事，聽見怒氣背後仍未說出的牽掛。',
    inscription: '翠雲借風圖', seal: '扇', rows: [
      ['火雲家書', '字還沒燒完', '家書只燒去稱呼，正文仍緊緊捲着。護信童子以短促重擊，催你快些作答。', '火雲護信童子', '稱呼補回去了，信卻沒有被代拆。經頁先學會替人送到，而不是替人決定。', '童子攏好餘燼。短局重擊面前，也能用留丹換後手。', 'honghaier yanxin huangfeng nezha guanyu bailong wujing cuixian', '紅孩兒、關羽與哪吒形成直接壓力；留意小注的傷害回報。'],
      ['炭路拾鞋', '誰替誰走過', '炭路邊堆着送水人磨穿的鞋。拾鞋客讓每次退讓都回來一點仙丹，像一次接力。', '炭路拾鞋客', '一雙無名草鞋被寫進經頁。過山不再只是那一把扇的功勞。', '炭火仍暖。先看哪些失利會把仙丹送回對方手裡。', 'wujing yanxin baigu wangxifeng honghaier bailong yunya kongzi', '多張敗北回丹卡支援火系傷害；把整場的資源一起看。'],
      ['翠雲叩門', '先把聲音放低', '門後不是敵意，而是一夜未眠。叩門人以減傷相迎，要你先把最急的一擊收住。', '翠雲叩門人', '門只開了一線，已足夠遞進家書。經頁沒有把沉默寫成拒絕。', '門前仍有位置。試着分配重擊，不必每次都正撞減傷。', 'tieshan lindaiyu guanyin cangjiao yinjiao bailong cuixian yanxin', '四種減傷角色；高攻擊得勝，也可能只留下很小傷害。'],
      ['芭蕉試風', '借來的不屬我', '小扇一揮，風卻倒灌回袖中。試風人請你算清每次加力，又會把哪一局吹空。', '芭蕉試風人', '風向終於對準炭路。借來的力量有了去處，也有了歸還的時候。', '試風人把扇柄轉回你手中。先看敵方減力，再決定投入。', 'tieshan puti huangfeng duying diaochan cuixian bailong bajie', '減力與固定攻擊加成同時出現，少一枚仙丹也可能改變勝負。'],
      ['積雷舊宴', '空杯仍留座', '舊宴只剩兩只杯子，誰也不肯先撤。留席人用高力量的普通落子，守住未散的席面。', '積雷留席人', '空杯沒有被撤走，只移到窗邊。經頁留下一個可回來的座位。', '留席人重斟清水。高力量不一定要以最多仙丹去接。', 'niumowang bajie luzhishen qingxiao yanxin bailong baigu wujing', '力量支援與牛魔王重擊相配；辨認哪張牌值得保留資源回應。'],
      ['父子隔火', '怒氣有兩岸', '火中兩個聲音都說自己沒有等。聽火人讓爆發與回丹相接，請你別把急切當作全部。', '隔火聽聲人', '一聲小名穿過火牆。誰也沒有立即道歉，但誰也沒有走開。', '火牆還在，路已近了。先撐過重擊，下一回合未必需要再搶。', 'honghaier niumowang wujing yanxin baigu guanyu tieshan bailong', '紅孩兒與牛魔王的傷害加成，加上敗北回丹，讓早期消耗未必可靠。'],
      ['借風不借怒', '扇前先停一息', '鐵扇把怒氣與芭蕉扇分放兩邊。借風客請你選擇要接住哪一樣，別兩樣都搶。', '借風息怒客', '你借到一陣風，沒有借走她的怒氣。家書終於可以由收信人自己打開。', '扇仍放在案旁。封鎖與減傷相遇時，先看清技能的方向。', 'tieshan guanyin yinjiao shuangli honghaier bailong wujing huangfeng', '封鎖、減傷與重擊交錯；明牌提供的資訊比慣用順序更可靠。'],
      ['火山開隙', '風中各走一步', '火勢讓出窄縫，兩岸仍需各走一步。鐵扇請你以最後四次落子，護住這條剛出現的路。', '翠雲護路人', '鐵扇收起扇，與你同行一程。經頁記下兩個人的腳步，沒有說是誰替誰走完。', '窄縫沒有閉合。護路人等你整備，再把這陣風接下去。', 'tieshan niumowang honghaier guanyin baigu yanxin bailong wujing', '兩張高傷害、兩種保護與回丹支援；優先安排能真正改變生命差的回合。'],
    ],
  },
  {
    name: '續卷五 · 真假同行', subtitle: '模樣相同，選擇仍可不同。',
    description: '兩個一模一樣的行者都記得往事。經頁無法只憑相貌判真，於是請同行者把每一次選擇重新說清。',
    inscription: '真假聽心圖', seal: '聽', rows: [
      ['雙履晨霜', '足印走向兩邊', '晨霜留下兩行一樣深的腳印，一行向前，一行回頭。認路客請你先看方向，再看模樣。', '雙履認路客', '經頁在兩行腳印旁各畫一箭。相同的來處，不必抵達相同的回答。', '霜沒有化盡。先讀四張明牌，再選這一局要走的方向。', 'liuer wukong bailong wujing baigu huangfeng kongzi cuixian', '兩位行者的星數與技能不同；外形故事不能代替卡面規則。'],
      ['真假餞別', '誰記得那碗湯', '兩人都說記得餞別，卻只有一人問碗洗好了沒有。餞行人邀你留心不顯眼的回復。', '餞別問湯人', '碗底的名字被擦亮。經頁多記了一個細節，仍沒有急着蓋印。', '湯還熱着。生命回復與傷害抵消不是同一回事，再算一遍。', 'liuer tangsanzang yaoheng zhenyuan kongzi bailong yunya huangfeng', '回復型隊伍延長生命差；每次勝利的後效也要計入。'],
      ['六聲林口', '聽見尚未說的', '林口同時傳來六句回答，問話卻還沒出口。聽林人用減力打斷熟悉的計算。', '六聲聽林人', '你等問題問完。六個聲音終於各有停頓，空白沒有再被搶走。', '林葉仍在說話。把對手的減力效果放進計算，再選仙丹。', 'liuer puti duying diaochan huangfeng yinjiao wujing bailong', '多種減力與封鎖搭配；別只看自己的預估攻擊。'],
      ['照面古潭', '倒影不替我選', '古潭能照出每一道疤，照不出誰曾伸手。照面客給你兩組相近力量，卻不同的回報。', '古潭照面客', '你把選擇寫在潭外。倒影依舊相似，經頁卻能分清每次伸出的手。', '潭水沒有替誰作證。多看一眼傷害與勝負後的資源變化。', 'liuer qingxiao shuangli wangxifeng bajie baigu yunya bailong', '相近力量搭配不同傷害、回丹與封鎖；不要只比較最大數字。'],
      ['珞珈問心', '問題可以不一樣', '觀音沒有問誰先出現，只問誰願意留下。問心人守住減傷，讓你自己決定何時重押。', '珞珈問心人', '經頁停下辨認面孔，開始記錄承諾。每個人都要為自己的下一步作答。', '問心人仍坐在原處。減傷有下限，攻擊得勝仍有意義。', 'guanyin tieshan lindaiyu cangjiao liuer bailong wujing huangfeng', '減傷較多而重擊有限；比較實際生命差，別只追求最大攻擊。'],
      ['不借前聲', '不用舊話取勝', '六耳收起模仿來的答案。留聲人以封鎖試你，失去熟悉技能後，還能否自己落子。', '留聲試答人', '六耳說出一句不漂亮、也不相像的話。經頁把它留下，沒有修改。', '舊話已收進匣中。先用基礎力量站穩，再等新的機會。', 'liuer yinjiao shuangli xuanjian wukong baigu wujing bailong', '封鎖密集且星數較高；低星同攻與資源保存都可能開出缺口。'],
      ['兩路一橋', '回頭也是前行', '橋容得下兩個行者，卻容不下誰取代誰。護橋人以回丹與高傷害，問你是否願意改道。', '兩路護橋人', '橋中央多了一道分岔。有人回頭，有人向前，經頁沒有把其中一條擦去。', '護橋人仍留着燈。對手讓掉一局時，別忘了數回來的仙丹。', 'liuer jinjiao honghaier wangxifeng baigu wujing yanxin cuixian', '高傷害由敗北回丹支撐；前三回合的輸贏會改變最後可押多少。'],
      ['六耳留名', '相逢不必替身', '六耳請你在卷末寫他的名字，而不是誰的另一個。命名人擺開最後一局，讓選擇自己作證。', '六耳命名人', '六耳成了同行者，也仍是六耳。經頁終於帶着各人的聲音，走向雷音的空席。', '名字的位置已留好。命名人請你休息，再把自己的答案帶回來。', 'liuer wukong puti tieshan baigu wujing bailong yanxin', '行者重擊、減力與減傷同場；最後一枚仙丹仍值得仔細安排。'],
    ],
  },
  {
    name: '續卷六 · 無字真經', subtitle: '經文要留下的，不只勝者。',
    description: '雷音殿為圓滿的故事備好空席，眾人卻帶回斷痕、猶疑與未完的約定。最後一卷，決定讓誰的聲音留下。',
    inscription: '無字回聲圖', seal: '聲', rows: [
      ['雷音空席', '圓滿之外的人', '殿內每席都寫着功德，門外卻站着送水與修船的人。排席客請你把餘力留給後來者。', '雷音排席客', '門外添了席位。經頁沒有多一個勝者，卻多了幾個完整的人。', '空席仍留着。多看一回合以後的資源，再決定眼前的取捨。', 'tangsanzang wujing bailong zhenyuan guanyin baigu yanxin huangfeng', '回復、減傷與回丹交織；短期領先不等於已經勝定。'],
      ['經頁聽雨', '小聲也算一句', '雨聲把殿外的話打得細碎。聽雨人以低星卡迎你，要你從很小的差距裡辨出一句真話。', '經頁聽雨人', '雨滴各自有聲。經頁把小字寫得清楚，沒有再拿大小決定輕重。', '聽雨人把傘移近。攻擊相同時，先看星數，再看先手。', 'bailong tangsanzang baigu wujing huangfeng cuixian yinjiao diaochan', '全低星對手；同攻與先後手判定是公開而重要的資訊。'],
      ['歸路拾字', '掉下的不是贅字', '歸路散着被刪掉的抱怨與笑話。拾字人用直接傷害相迎，請你別在急行中把它們踩碎。', '歸路拾字人', '抱怨與笑話一同裝進行囊。經頁終於聽起來像有人生活過。', '字還在路邊。要趕路，也先想好哪一次傷害值得承受。', 'honghaier guanyu wusong jinjiao niumowang yanxin bailong wujing', '高傷害角色較多；保護生命與保存仙丹需要同時衡量。'],
      ['舊願重讀', '願望也會長大', '最初的願望被抄得太整齊，誰都不敢再改一字。重讀人用回復守候一個新的答案。', '舊願重讀人', '第一卷添了一張薄箋：我現在還想……。經頁接受了改變，沒有說是背叛。', '薄箋尚未黏牢。先觀察對手何時能回復，再落最重的一子。', 'tangsanzang zhenyuan yaoheng kongzi yunya guanyin bajie bailong', '回復集中的陣容；掌握有效傷害與回復發生的時機。'],
      ['無字渡口', '不替故事封門', '最初的渡口又在眼前，掌燈人卻不再問你從哪裡來。他只問，還願不願意等下一班船。', '無字候船人', '你把燈放低，照見下一班船。經頁的結尾第一次像一個入口。', '船期不催促任何人。試着換一種對高星牌的回應。', 'wukong liuer guanyin puti bailong wujing baigu huangfeng', '高星主力由低星支援；同攻時，低星並不一定吃虧。'],
      ['眾聲不齊', '不必唱同一調', '每個人都想把自己的結尾唱得最響。和聲客以封鎖與回丹，請你在嘈雜裡找回節奏。', '眾聲和聲客', '歌沒有變齊，卻終於能一起唱。經頁不再把不同的拍子當作錯誤。', '和聲客輕敲案邊。封鎖出現時，重新數一次真正可回來的仙丹。', 'shuangli yinjiao xuanjian wangxifeng baigu wujing yanxin qingxiao', '封鎖可能打斷敗北回丹；資源回收要按當回合實際效果判斷。'],
      ['末筆由誰', '留一筆給未來', '封卷人遞來一支能寫定所有結局的筆。你可以借同行牌再走一次，看看誰仍未被問過。', '末筆守卷人', '筆尖停在空白上。眾人決定把最後一筆交給下一個讀經的人。', '筆還在案頭。同行牌仍可借用；先把生命與仙丹留到能改變結果的回合。', 'wukong niumowang guanyin puti baigu wujing bailong huangfeng', '高傷害、減傷與減力相配；提供同一副可借牌組，無須保留獎勵卡。'],
      ['萬聲歸卷', '無字也是相逢', '所有未完的話在卷中輕響。收卷人邀你落完最後四子，把勝負之外的聲音也帶回家。', '萬聲收卷人', '無字經仍有空白，卻不再寂靜。每位同行者留下自己的回聲；你獲得稱號「聽見萬聲」。', '收卷人沒有催你合卷。那些聲音已被聽見，最後一局可以慢慢來。', 'wukong liuer guanyin zhenyuan baigu wujing bailong huangfeng', '完整混合陣容；結合前五卷的減傷、回復、封鎖與留丹經驗。'],
    ],
  },
];

const coordinates = [[12, 78], [27, 58], [17, 30], [40, 18], [52, 46], [66, 72], [82, 49], [85, 17]];
const rewardCharacters = { 'echo-1-1': 'tangsanzang', 'echo-1-2': 'bailong', 'echo-1-4': 'bajie', 'echo-1-6': 'wujing', 'echo-2-8': 'zhenyuan', 'echo-3-8': 'baigu', 'echo-4-8': 'tieshan', 'echo-5-8': 'liuer' };
export const CAMPAIGN_WORLDS = freeze(volumes.map((volume, index) => ({
  id: `westward-echo-${index + 1}`, campaign: true, name: volume.name,
  source: '西遊記啟發 · 萬象原創續章', subtitle: volume.subtitle, description: volume.description,
  map: 'assets/maps/westward.png', inscription: volume.inscription, seal: volume.seal,
  nodeIds: volume.rows.map((_, order) => `echo-${index + 1}-${order + 1}`),
})));
export const CAMPAIGN_NODES = freeze(volumes.flatMap((volume, index) => volume.rows.map((row, order) => {
  const [name, subtitle, description, enemyName, victory, defeat, deck, tactic] = row;
  const id = `echo-${index + 1}-${order + 1}`;
  return { id, worldId: CAMPAIGN_WORLDS[index].id, campaign: true, order, name, subtitle, description,
    enemyName, victory, defeat, tactic, encounterType: order === 7 ? 'finale' : order >= 5 ? 'tactical' : 'ordinary',
    x: coordinates[order][0], y: coordinates[order][1], level: Math.min(5, index + 1 + Math.floor(order / 4)),
    requiresNode: order ? `echo-${index + 1}-${order}` : index ? `echo-${index}-8` : 'west-spirit-mountain',
    opponentDeck: deck.split(' '), winReward: { coins: 60, dust: 3, xp: 30 },
    firstClearReward: { coins: 90, dust: 5, xp: 40 }, dailyReward: { coins: 0, dust: 0, xp: 0 },
    volumeFinal: order === 7, ...(rewardCharacters[id] ? { rewardCharacter: rewardCharacters[id] } : {}),
    ...(['echo-1-7', 'echo-6-7'].includes(id) ? { loanerDeck: [...CAMPAIGN_LOANER_DECK] } : {}),
  };
})));

export const CAMPAIGN_TITLE = freeze({ id: 'heard-all-voices', name: '聽見萬聲', description: '走完六卷，為未完的話留一席。' });
