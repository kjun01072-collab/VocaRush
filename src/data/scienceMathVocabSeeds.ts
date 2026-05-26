import { Importance, TargetScore, VocabDifficulty, VocabLevel, VocabSubject } from "../types";

export type ScienceMathVocabSeed = {
  word: string;
  reading: string;
  meaningKo: string;
  level: VocabLevel;
  subject: VocabSubject;
  part: string;
  questionTypes: string[];
  relatedWords: string[];
  synonyms?: string[];
  antonyms?: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
  frequencyScore?: number;
  difficulty?: VocabDifficulty;
  importance?: Importance;
  targetScore?: TargetScore;
};

type ScienceMathInput = {
  word: string;
  reading: string;
  meaningKo: string;
  part: "이과 수학" | "하이레벨 수학" | "생물 생태·환경";
  tags: string[];
  relatedWords?: string[];
  level?: VocabLevel;
  difficulty?: VocabDifficulty;
  frequencyScore?: number;
  exampleJa?: string;
  exampleKo?: string;
  explanationKo?: string;
};

const COURSE1_MATH: ScienceMathInput[] = [
  { word: "集合", reading: "しゅうごう", meaningKo: "집합", part: "이과 수학", tags: ["수학 코스1", "집합"] },
  { word: "命題", reading: "めいだい", meaningKo: "명제", part: "이과 수학", tags: ["수학 코스1", "명제"] },
  { word: "多項式", reading: "たこうしき", meaningKo: "다항식", part: "이과 수학", tags: ["수학 코스1", "식의 계산"] },
  { word: "加法", reading: "かほう", meaningKo: "덧셈, 가법", part: "이과 수학", tags: ["수학 코스1", "계산"] },
  { word: "減法", reading: "げんぽう", meaningKo: "뺄셈, 감법", part: "이과 수학", tags: ["수학 코스1", "계산"] },
  { word: "乗法", reading: "じょうほう", meaningKo: "곱셈, 승법", part: "이과 수학", tags: ["수학 코스1", "계산"] },
  { word: "偶数", reading: "ぐうすう", meaningKo: "짝수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["奇数"] },
  { word: "奇数", reading: "きすう", meaningKo: "홀수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["偶数"] },
  { word: "同類項", reading: "どうるいこう", meaningKo: "동류항", part: "이과 수학", tags: ["수학 코스1", "식의 계산"] },
  { word: "次数", reading: "じすう", meaningKo: "차수", part: "이과 수학", tags: ["수학 코스1", "식의 계산"] },
  { word: "定数項", reading: "ていすうこう", meaningKo: "상수항", part: "이과 수학", tags: ["수학 코스1", "식의 계산"] },
  { word: "展開", reading: "てんかい", meaningKo: "전개", part: "이과 수학", tags: ["수학 코스1", "식의 계산"], relatedWords: ["因数分解"] },
  { word: "因数分解", reading: "いんすうぶんかい", meaningKo: "인수분해", part: "이과 수학", tags: ["수학 코스1", "식의 계산"], relatedWords: ["展開"] },
  { word: "実数", reading: "じっすう", meaningKo: "실수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["無理数", "有理数"] },
  { word: "分数", reading: "ぶんすう", meaningKo: "분수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["分母"] },
  { word: "小数", reading: "しょうすう", meaningKo: "소수", part: "이과 수학", tags: ["수학 코스1", "수와 식"] },
  { word: "素数", reading: "そすう", meaningKo: "소수, prime number", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["約数", "倍数"] },
  { word: "循環小数", reading: "じゅんかんしょうすう", meaningKo: "순환소수", part: "이과 수학", tags: ["수학 코스1", "수와 식"] },
  { word: "数直線", reading: "すうちょくせん", meaningKo: "수직선", part: "이과 수학", tags: ["수학 코스1", "좌표"] },
  { word: "距離", reading: "きょり", meaningKo: "거리", part: "이과 수학", tags: ["수학 코스1", "좌표"] },
  { word: "値", reading: "あたい", meaningKo: "값", part: "이과 수학", tags: ["수학 코스1", "계산"] },
  { word: "求める", reading: "もとめる", meaningKo: "구하다", part: "이과 수학", tags: ["수학 코스1", "문제 지시어"] },
  { word: "分母", reading: "ぶんぼ", meaningKo: "분모", part: "이과 수학", tags: ["수학 코스1", "수와 식"] },
  { word: "有理化", reading: "ゆうりか", meaningKo: "유리화", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["分母"] },
  { word: "四捨五入", reading: "ししゃごにゅう", meaningKo: "반올림", part: "이과 수학", tags: ["수학 코스1", "계산"] },
  { word: "連立不等式", reading: "れんりつふとうしき", meaningKo: "연립부등식", part: "이과 수학", tags: ["수학 코스1", "방정식·부등식"] },
  { word: "約数", reading: "やくすう", meaningKo: "약수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["倍数"] },
  { word: "倍数", reading: "ばいすう", meaningKo: "배수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["約数"] },
  { word: "要素", reading: "ようそ", meaningKo: "원소, 요소", part: "이과 수학", tags: ["수학 코스1", "집합"] },
  { word: "真偽", reading: "しんぎ", meaningKo: "참과 거짓, 진위", part: "이과 수학", tags: ["수학 코스1", "명제"] },
  { word: "条件", reading: "じょうけん", meaningKo: "조건", part: "이과 수학", tags: ["수학 코스1", "명제"] },
  { word: "必要十分条件", reading: "ひつようじゅうぶんじょうけん", meaningKo: "필요충분조건", part: "이과 수학", tags: ["수학 코스1", "명제"], difficulty: 3 },
  { word: "逆", reading: "ぎゃく", meaningKo: "역", part: "이과 수학", tags: ["수학 코스1", "명제"], relatedWords: ["裏", "対偶"] },
  { word: "対偶", reading: "たいぐう", meaningKo: "대우", part: "이과 수학", tags: ["수학 코스1", "명제"], relatedWords: ["命題", "逆"] },
  { word: "無理数", reading: "むりすう", meaningKo: "무리수", part: "이과 수학", tags: ["수학 코스1", "수와 식"], relatedWords: ["有理数"] },
  { word: "関数", reading: "かんすう", meaningKo: "함수", part: "이과 수학", tags: ["수학 코스1", "함수"] },
  { word: "平行", reading: "へいこう", meaningKo: "평행", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "移動", reading: "いどう", meaningKo: "이동", part: "이과 수학", tags: ["수학 코스1", "함수"] },
  { word: "軸", reading: "じく", meaningKo: "축", part: "이과 수학", tags: ["수학 코스1", "좌표"] },
  { word: "頂点", reading: "ちょうてん", meaningKo: "꼭짓점, 정점", part: "이과 수학", tags: ["수학 코스1", "함수"] },
  { word: "放物線", reading: "ほうぶつせん", meaningKo: "포물선", part: "이과 수학", tags: ["수학 코스1", "함수"], relatedWords: ["二次関数"] },
  { word: "対称", reading: "たいしょう", meaningKo: "대칭", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "最大値", reading: "さいだいち", meaningKo: "최댓값", part: "이과 수학", tags: ["수학 코스1", "함수"], relatedWords: ["最小値"] },
  { word: "最小値", reading: "さいしょうち", meaningKo: "최솟값", part: "이과 수학", tags: ["수학 코스1", "함수"], relatedWords: ["最大値"] },
  { word: "領域", reading: "りょういき", meaningKo: "영역", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "直角", reading: "ちょっかく", meaningKo: "직각", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "長方形", reading: "ちょうほうけい", meaningKo: "직사각형", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "面積", reading: "めんせき", meaningKo: "면적, 넓이", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "斜辺", reading: "しゃへん", meaningKo: "빗변", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "象限", reading: "しょうげん", meaningKo: "사분면", part: "이과 수학", tags: ["수학 코스1", "좌표"] },
  { word: "接点", reading: "せってん", meaningKo: "접점", part: "이과 수학", tags: ["수학 코스1", "도형"] },
  { word: "座標", reading: "ざひょう", meaningKo: "좌표", part: "이과 수학", tags: ["수학 코스1", "좌표"] },
];

const ADVANCED_MATH: ScienceMathInput[] = [
  { word: "既約分数", reading: "きやくぶんすう", meaningKo: "기약분수", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], difficulty: 3 },
  { word: "等式", reading: "とうしき", meaningKo: "등식", part: "하이레벨 수학", tags: ["하이레벨 수학", "식의 계산"] },
  { word: "符号", reading: "ふごう", meaningKo: "부호, 기호", part: "하이레벨 수학", tags: ["하이레벨 수학", "식의 계산"] },
  { word: "根号", reading: "こんごう", meaningKo: "근호", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], relatedWords: ["二重根号"] },
  { word: "自然数", reading: "しぜんすう", meaningKo: "자연수", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"] },
  { word: "定数", reading: "ていすう", meaningKo: "상수", part: "하이레벨 수학", tags: ["하이레벨 수학", "식의 계산"] },
  { word: "整数", reading: "せいすう", meaningKo: "정수", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"] },
  { word: "方程式", reading: "ほうていしき", meaningKo: "방정식", part: "하이레벨 수학", tags: ["하이레벨 수학", "방정식·부등식"] },
  { word: "小数部分", reading: "しょうすうぶぶん", meaningKo: "소수 부분", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], difficulty: 3 },
  { word: "最小公倍数", reading: "さいしょうこうばいすう", meaningKo: "최소공배수", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], relatedWords: ["最大公約数"] },
  { word: "最大公約数", reading: "さいだいこうやくすう", meaningKo: "최대공약수", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], relatedWords: ["最小公倍数"] },
  { word: "二重根号", reading: "にじゅうこんごう", meaningKo: "이중근호", part: "하이레벨 수학", tags: ["하이레벨 수학", "수와 식"], difficulty: 4 },
  { word: "対称軸", reading: "たいしょうじく", meaningKo: "대칭축", part: "하이레벨 수학", tags: ["하이레벨 수학", "함수"], relatedWords: ["放物線"] },
  { word: "中心", reading: "ちゅうしん", meaningKo: "중심", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "平行移動", reading: "へいこういどう", meaningKo: "평행이동", part: "하이레벨 수학", tags: ["하이레벨 수학", "함수"], relatedWords: ["x軸方向", "y軸方向"] },
  { word: "共有点", reading: "きょうゆうてん", meaningKo: "공유점", part: "하이레벨 수학", tags: ["하이레벨 수학", "함수"] },
  { word: "範囲", reading: "はんい", meaningKo: "범위", part: "하이레벨 수학", tags: ["하이레벨 수학", "문제 지시어"] },
  { word: "判別式", reading: "はんべつしき", meaningKo: "판별식", part: "하이레벨 수학", tags: ["하이레벨 수학", "방정식·부등식"], difficulty: 4 },
  { word: "交わる", reading: "まじわる", meaningKo: "교차하다, 만나다", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "線分", reading: "せんぶん", meaningKo: "선분", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "実数解", reading: "じっすうかい", meaningKo: "실수해", part: "하이레벨 수학", tags: ["하이레벨 수학", "방정식·부등식"], difficulty: 3 },
  { word: "二次関数", reading: "にじかんすう", meaningKo: "이차함수", part: "하이레벨 수학", tags: ["하이레벨 수학", "함수"], relatedWords: ["放物線"] },
  { word: "三角比", reading: "さんかくひ", meaningKo: "삼각비", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"], difficulty: 3 },
  { word: "相互関係", reading: "そうごかんけい", meaningKo: "상호 관계", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"] },
  { word: "対称式", reading: "たいしょうしき", meaningKo: "대칭식", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"], difficulty: 4 },
  { word: "外接円", reading: "がいせつえん", meaningKo: "외접원", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"], relatedWords: ["半径", "正弦定理"] },
  { word: "半径", reading: "はんけい", meaningKo: "반지름", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "直角三角形", reading: "ちょっかくさんかくけい", meaningKo: "직각삼각형", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"] },
  { word: "正弦定理", reading: "せいげんていり", meaningKo: "사인 법칙, 정현 정리", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"], difficulty: 4, relatedWords: ["余弦定理"] },
  { word: "余弦定理", reading: "よげんていり", meaningKo: "코사인 법칙, 여현 정리", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"], difficulty: 4, relatedWords: ["正弦定理"] },
  { word: "二等辺三角形", reading: "にとうへんさんかくけい", meaningKo: "이등변삼각형", part: "하이레벨 수학", tags: ["하이레벨 수학", "삼각비"] },
  { word: "内接円", reading: "ないせつえん", meaningKo: "내접원", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"], relatedWords: ["外接円"] },
  { word: "二等分線", reading: "にとうぶんせん", meaningKo: "이등분선", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "必要条件", reading: "ひつようじょうけん", meaningKo: "필요조건", part: "하이레벨 수학", tags: ["하이레벨 수학", "명제"], relatedWords: ["十分条件"] },
  { word: "十分条件", reading: "じゅうぶんじょうけん", meaningKo: "충분조건", part: "하이레벨 수학", tags: ["하이레벨 수학", "명제"], relatedWords: ["必要条件"] },
  { word: "場合の数", reading: "ばあいのかず", meaningKo: "경우의 수", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"], difficulty: 3 },
  { word: "組合せ", reading: "くみあわせ", meaningKo: "조합", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"], relatedWords: ["順列"] },
  { word: "順列", reading: "じゅんれつ", meaningKo: "순열", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"], relatedWords: ["組合せ"] },
  { word: "確率", reading: "かくりつ", meaningKo: "확률", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"] },
  { word: "期待値", reading: "きたいち", meaningKo: "기댓값", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"], difficulty: 3 },
  { word: "余事象", reading: "よじしょう", meaningKo: "여사건", part: "하이레벨 수학", tags: ["하이레벨 수학", "확률"], difficulty: 4 },
  { word: "対角線", reading: "たいかくせん", meaningKo: "대각선", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"] },
  { word: "内接する四角形", reading: "ないせつするしかくけい", meaningKo: "원에 내접하는 사각형", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"], difficulty: 4 },
  { word: "方べきの定理", reading: "ほうべきのていり", meaningKo: "방멱의 정리", part: "하이레벨 수학", tags: ["하이레벨 수학", "도형"], difficulty: 5 },
];

const BIOLOGY_ECOLOGY: ScienceMathInput[] = [
  { word: "生態系", reading: "せいたいけい", meaningKo: "생태계", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["生物群集", "非生物的環境"] },
  { word: "生物群集", reading: "せいぶつぐんしゅう", meaningKo: "생물 군집", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "非生物的環境", reading: "ひせいぶつてきかんきょう", meaningKo: "비생물적 환경", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "物質循環", reading: "ぶっしつじゅんかん", meaningKo: "물질 순환", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["エネルギーの流れ"] },
  { word: "エネルギーの流れ", reading: "エネルギーのながれ", meaningKo: "에너지 흐름", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["物質循環"] },
  { word: "消費者", reading: "しょうひしゃ", meaningKo: "소비자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["生産者", "分解者"] },
  { word: "生産者", reading: "せいさんしゃ", meaningKo: "생산자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["消費者", "分解者"] },
  { word: "分解者", reading: "ぶんかいしゃ", meaningKo: "분해자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["菌類", "細菌"] },
  { word: "相互作用", reading: "そうごさよう", meaningKo: "상호작용", part: "생물 생태·환경", tags: ["생물", "생태와 환경"] },
  { word: "食物連鎖", reading: "しょくもつれんさ", meaningKo: "먹이 사슬", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["食物網"] },
  { word: "食物網", reading: "しょくもつもう", meaningKo: "먹이 그물", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["食物連鎖"] },
  { word: "捕食者", reading: "ほしょくしゃ", meaningKo: "포식자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["被食者"] },
  { word: "被食者", reading: "ひしょくしゃ", meaningKo: "피식자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["捕食者"] },
  { word: "一次消費者", reading: "いちじしょうひしゃ", meaningKo: "1차 소비자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["二次消費者"] },
  { word: "二次消費者", reading: "にじしょうひしゃ", meaningKo: "2차 소비자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["一次消費者", "高次消費者"] },
  { word: "高次消費者", reading: "こうじしょうひしゃ", meaningKo: "고차 소비자", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "菌類", reading: "きんるい", meaningKo: "균류", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["細菌", "分解者"] },
  { word: "細菌", reading: "さいきん", meaningKo: "세균", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["菌類", "分解者"] },
  { word: "土壌有機物", reading: "どじょうゆうきぶつ", meaningKo: "토양 유기물", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "腐食連鎖", reading: "ふしょくれんさ", meaningKo: "부식 연쇄", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 4, relatedWords: ["食物連鎖"] },
  { word: "生物量", reading: "せいぶつりょう", meaningKo: "생물량, 바이오매스", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["現存量"] },
  { word: "栄養段階", reading: "えいようだんかい", meaningKo: "영양 단계", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3, relatedWords: ["生態ピラミッド"] },
  { word: "植物プランクトン", reading: "しょくぶつプランクトン", meaningKo: "식물 플랑크톤", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], relatedWords: ["動物プランクトン"] },
  { word: "動物プランクトン", reading: "どうぶつプランクトン", meaningKo: "동물 플랑크톤", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], relatedWords: ["植物プランクトン"] },
  { word: "栄養塩類", reading: "えいようえんるい", meaningKo: "영양염류", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], difficulty: 3, relatedWords: ["大陸棚", "湧昇域"] },
  { word: "大陸棚", reading: "たいりくだな", meaningKo: "대륙붕", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], difficulty: 3 },
  { word: "湧昇", reading: "ゆうしょう", meaningKo: "용승", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], difficulty: 4, relatedWords: ["湧昇域", "栄養塩類"] },
  { word: "湧昇域", reading: "ゆうしょういき", meaningKo: "용승역, 용승 구역", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], difficulty: 4, relatedWords: ["湧昇"] },
  { word: "生態ピラミッド", reading: "せいたいピラミッド", meaningKo: "생태 피라미드", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], relatedWords: ["栄養段階"] },
  { word: "個体数ピラミッド", reading: "こたいすうピラミッド", meaningKo: "개체수 피라미드", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "生物量ピラミッド", reading: "せいぶつりょうピラミッド", meaningKo: "생물량 피라미드", part: "생물 생태·환경", tags: ["생물", "생태와 환경"], difficulty: 3 },
  { word: "生産力", reading: "せいさんりょく", meaningKo: "생산력", part: "생물 생태·환경", tags: ["생물", "물질 생산"], relatedWords: ["純生産量", "総生産量"] },
  { word: "現存量", reading: "げんそんりょう", meaningKo: "현존량", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 3, relatedWords: ["生物量"] },
  { word: "補償深度", reading: "ほしょうしんど", meaningKo: "보상 심도", part: "생물 생태·환경", tags: ["생물", "해양 생태계"], difficulty: 5 },
  { word: "生物多様性", reading: "せいぶつたようせい", meaningKo: "생물다양성", part: "생물 생태·환경", tags: ["생물", "생물다양성"], relatedWords: ["遺伝的多様性", "種多様性", "生態系多様性"] },
  { word: "遺伝的多様性", reading: "いでんてきたようせい", meaningKo: "유전적 다양성", part: "생물 생태·환경", tags: ["생물", "생물다양성"], difficulty: 3 },
  { word: "種多様性", reading: "しゅたようせい", meaningKo: "종 다양성", part: "생물 생태·환경", tags: ["생물", "생물다양성"], difficulty: 3 },
  { word: "生態系多様性", reading: "せいたいけいたようせい", meaningKo: "생태계 다양성", part: "생물 생태·환경", tags: ["생물", "생물다양성"], difficulty: 3 },
  { word: "土壌動物", reading: "どじょうどうぶつ", meaningKo: "토양 동물", part: "생물 생태·환경", tags: ["생물", "조사 방법"], relatedWords: ["採集", "調査"] },
  { word: "採集", reading: "さいしゅう", meaningKo: "채집", part: "생물 생태·환경", tags: ["생물", "조사 방법"], relatedWords: ["調査"] },
  { word: "調査", reading: "ちょうさ", meaningKo: "조사", part: "생물 생태·환경", tags: ["생물", "조사 방법"], relatedWords: ["採集"] },
  { word: "ツルグレン装置", reading: "ツルグレンそうち", meaningKo: "툴그렌 장치", part: "생물 생태·환경", tags: ["생물", "조사 방법"], difficulty: 4 },
  { word: "定量的", reading: "ていりょうてき", meaningKo: "정량적", part: "생물 생태·환경", tags: ["생물", "조사 방법"], difficulty: 3 },
  { word: "指標", reading: "しひょう", meaningKo: "지표, 기준", part: "생물 생태·환경", tags: ["생물", "조사 방법"] },
  { word: "物質生産", reading: "ぶっしつせいさん", meaningKo: "물질 생산", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 3 },
  { word: "純生産量", reading: "じゅんせいさんりょう", meaningKo: "순생산량", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 4, relatedWords: ["総生産量", "呼吸量"] },
  { word: "総生産量", reading: "そうせいさんりょう", meaningKo: "총생산량", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 4, relatedWords: ["純生産量"] },
  { word: "呼吸量", reading: "こきゅうりょう", meaningKo: "호흡량", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 3 },
  { word: "物質収支", reading: "ぶっしつしゅうし", meaningKo: "물질 수지", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 4 },
  { word: "熱帯多雨林", reading: "ねったいたうりん", meaningKo: "열대다우림", part: "생물 생태·환경", tags: ["생물", "물질 생산"], relatedWords: ["純生産量"] },
  { word: "照葉樹林", reading: "しょうようじゅりん", meaningKo: "조엽수림", part: "생물 생태·환경", tags: ["생물", "물질 생산"], difficulty: 3 },
];

function scoreForPart(part: ScienceMathInput["part"]) {
  if (part === "생물 생태·환경") return 86;
  if (part === "하이레벨 수학") return 84;
  return 80;
}

function levelForPart(part: ScienceMathInput["part"], difficulty?: VocabDifficulty): VocabLevel {
  if (difficulty && difficulty >= 4) return "350+ 목표";
  if (part === "생물 생태·환경") return "300점 목표";
  if (part === "하이레벨 수학") return "300점 목표";
  return "200점 목표";
}

function defaultExample(input: ScienceMathInput) {
  const { word, meaningKo, part, tags } = input;

  if (word === "実数") {
    return {
      exampleJa: "xを実数とするとき、x^2-5x+6=0を満たすxの値をすべて求めなさい。",
      exampleKo: "x를 실수라고 할 때, x^2-5x+6=0을 만족하는 x의 값을 모두 구하시오.",
      explanationKo: "실수는 수학 문제에서 변수의 범위를 정할 때 자주 쓰입니다. 자연수·정수·유리수·무리수와 범위를 구분해서 읽어야 합니다.",
    };
  }

  if (word === "実数解") {
    return {
      exampleJa: "二次方程式 x^2-2x-a=0 が2つの実数解をもつようなaの範囲を求めなさい。",
      exampleKo: "이차방정식 x^2-2x-a=0이 두 개의 실수해를 갖도록 하는 a의 범위를 구하시오.",
      explanationKo: "실수해는 방정식의 해가 실수 범위에 존재한다는 뜻입니다. 판별식, 그래프의 교점, 해의 개수 문제와 함께 나옵니다.",
    };
  }

  if (part === "생물 생태·환경") {
    if (tags.includes("물질 생산")) {
      return {
        exampleJa: `森林における${word}と呼吸量の関係から、純生産量を求めなさい。`,
        exampleKo: `숲에서 ${meaningKo}와 호흡량의 관계를 이용해 순생산량을 구하시오.`,
        explanationKo: `${meaningKo}는 생물 생태·환경 단원에서 에너지 흐름, 물질 생산, 생물량 계산과 함께 읽어야 하는 핵심 개념입니다.`,
      };
    }
    if (tags.includes("해양 생태계")) {
      return {
        exampleJa: `海洋生態系で${word}が増加する条件を、栄養塩類の供給と関連づけて説明しなさい。`,
        exampleKo: `해양 생태계에서 ${meaningKo}가 증가하는 조건을 영양염류 공급과 연결해 설명하시오.`,
        explanationKo: `${meaningKo}는 해양 생태계 문항에서 영양염류, 생산자, 먹이 관계를 해석할 때 자주 필요한 개념입니다.`,
      };
    }
    if (tags.includes("조사 방법")) {
      return {
        exampleJa: `土壌動物の調査で${word}を用いる目的を答えなさい。`,
        exampleKo: `토양 동물 조사에서 ${meaningKo}를 사용하는 목적을 답하시오.`,
        explanationKo: `${meaningKo}는 생물 조사 방법 문제에서 장치, 표본 수집, 정량적 비교를 이해할 때 쓰입니다.`,
      };
    }
    return {
      exampleJa: `ある池の${word}について、生産者・消費者・分解者の関係を説明しなさい。`,
      exampleKo: `어떤 연못의 ${meaningKo}에 대해 생산자·소비자·분해자의 관계를 설명하시오.`,
      explanationKo: `${meaningKo}는 생태계 구조, 먹이 관계, 비생물적 환경을 함께 묶어 이해해야 하는 생물 핵심 어휘입니다.`,
    };
  }

  if (tags.includes("집합")) {
    return {
      exampleJa: `集合A={1,2,3,4}について、${word}に当てはまるものを答えなさい。`,
      exampleKo: `집합 A={1,2,3,4}에 대해 ${meaningKo}에 해당하는 것을 답하시오.`,
      explanationKo: `${meaningKo}는 집합 단원에서 원소, 부분집합, 조건 표현을 읽을 때 기본이 되는 용어입니다.`,
    };
  }
  if (tags.includes("명제")) {
    return {
      exampleJa: `次の${word}が真であるか偽であるかを判定し、理由を述べなさい。`,
      exampleKo: `다음 ${meaningKo}가 참인지 거짓인지 판정하고 이유를 쓰시오.`,
      explanationKo: `${meaningKo}는 명제, 조건, 역·대우 문제에서 논리 관계를 읽는 데 필요한 표현입니다.`,
    };
  }
  if (tags.includes("함수")) {
    return {
      exampleJa: `二次関数 y=x^2-4x+1 のグラフについて、${word}を求めなさい。`,
      exampleKo: `이차함수 y=x^2-4x+1의 그래프에 대해 ${meaningKo}를 구하시오.`,
      explanationKo: `${meaningKo}는 함수 그래프의 이동, 축, 꼭짓점, 최댓값·최솟값을 읽을 때 자주 나오는 표현입니다.`,
    };
  }
  if (tags.includes("방정식·부등식")) {
    return {
      exampleJa: `次の方程式または不等式について、${word}に注意して解きなさい。`,
      exampleKo: `다음 방정식 또는 부등식을 ${meaningKo}에 주의하여 푸시오.`,
      explanationKo: `${meaningKo}는 방정식·부등식에서 해의 범위, 조건, 개수를 판단할 때 쓰입니다.`,
    };
  }
  if (tags.includes("삼각비")) {
    return {
      exampleJa: `直角三角形ABCにおいて、${word}を用いて辺の長さを求めなさい。`,
      exampleKo: `직각삼각형 ABC에서 ${meaningKo}를 이용해 변의 길이를 구하시오.`,
      explanationKo: `${meaningKo}는 삼각비, 정현정리·여현정리, 도형 조건을 연결해서 읽어야 하는 용어입니다.`,
    };
  }
  if (tags.includes("확률")) {
    return {
      exampleJa: `袋から玉を取り出す試行について、${word}を求めなさい。`,
      exampleKo: `주머니에서 공을 꺼내는 시행에 대해 ${meaningKo}를 구하시오.`,
      explanationKo: `${meaningKo}는 경우의 수와 확률에서 조건을 세고 계산식을 세울 때 필요한 표현입니다.`,
    };
  }
  if (tags.includes("도형")) {
    return {
      exampleJa: `図の三角形で、${word}の長さまたは位置を求めなさい。`,
      exampleKo: `그림의 삼각형에서 ${meaningKo}의 길이 또는 위치를 구하시오.`,
      explanationKo: `${meaningKo}는 도형 문제에서 선분, 각, 원, 교점 같은 조건을 정확히 읽는 데 필요합니다.`,
    };
  }

  return {
    exampleJa: `次の計算で、${word}に注意して値を求めなさい。`,
    exampleKo: `다음 계산에서 ${meaningKo}에 주의하여 값을 구하시오.`,
    explanationKo: `${meaningKo}는 ${part} 문제의 조건과 지시문을 정확히 읽기 위한 핵심 어휘입니다.`,
  };
}

function makeSeed(input: ScienceMathInput, index: number): ScienceMathVocabSeed {
  const difficulty = input.difficulty ?? (input.part === "이과 수학" ? 2 : input.part === "하이레벨 수학" ? 3 : 3);
  const tags = ["EJU 이과", "이과 과목", ...input.tags];
  const level = input.level ?? levelForPart(input.part, difficulty);
  const frequencyScore = input.frequencyScore ?? Math.min(94, scoreForPart(input.part) + Math.floor((index % 7) * 1.5));
  const generated = defaultExample(input);
  return {
    word: input.word,
    reading: input.reading,
    meaningKo: input.meaningKo,
    level,
    subject: "EJU 이과",
    part: input.part,
    questionTypes: tags,
    relatedWords: input.relatedWords ?? tags.slice(1, 4),
    exampleJa: input.exampleJa ?? generated.exampleJa,
    exampleKo: input.exampleKo ?? generated.exampleKo,
    explanationKo: input.explanationKo ?? generated.explanationKo,
    frequencyScore,
    difficulty,
  };
}

export const SCIENCE_MATH_VOCAB_SEEDS: ScienceMathVocabSeed[] = [
  ...COURSE1_MATH.map((input, index) => makeSeed(input, index)),
  ...ADVANCED_MATH.map((input, index) => makeSeed(input, COURSE1_MATH.length + index)),
  ...BIOLOGY_ECOLOGY.map((input, index) => makeSeed(input, COURSE1_MATH.length + ADVANCED_MATH.length + index)),
];
