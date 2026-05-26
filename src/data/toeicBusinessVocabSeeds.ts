import { Importance, TargetScore, VocabDifficulty, VocabLevel, VocabSubject } from "../types";

export type ToeicBusinessVocabSeed = {
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

type ToeicRaw = {
  word: string;
  meaningKo: string;
  part: string;
  tags: string[];
  example: string;
  exampleKo: string;
  related: string[];
  difficulty?: VocabDifficulty;
};

// Supplemental TOEIC/business seeds. The TOEIC 5 book-derived frequency list
// lives in toeicBookVocabSeeds.ts so the app can prioritize the user's book data
// without copying copyrighted passages.
const RAW_LINES = `
accommodate|수용하다, 맞추다|TOEIC 핵심 동사|TOEIC,TOEIC RC,고빈출 동사|The conference room can accommodate up to 80 people.|그 회의실은 최대 80명을 수용할 수 있습니다.|capacity,venue,attendee|2
accurate|정확한|TOEIC 핵심 형용사|TOEIC,TOEIC RC,자료 확인|Please make sure the billing address is accurate.|청구 주소가 정확한지 확인해 주세요.|accuracy,invoice,record|2
agenda|회의 안건|회의·행사|TOEIC,TOEIC LC,회의 표현|The agenda will be sent before the staff meeting.|직원 회의 전에 안건이 발송될 예정입니다.|meeting,minutes,action items|2
applicant|지원자|채용·인사|TOEIC,TOEIC RC,채용|Each applicant must submit a resume by Friday.|각 지원자는 금요일까지 이력서를 제출해야 합니다.|candidate,resume,interview|2
appointment|예약, 약속|예약·일정|TOEIC,TOEIC LC,일정 조정|I need to reschedule my dental appointment.|치과 예약을 다시 잡아야 합니다.|schedule,reservation,availability|1
approval|승인|사무·행정|TOEIC,TOEIC RC,사내 절차|The budget requires approval from the director.|그 예산은 이사의 승인이 필요합니다.|authorize,request,budget|2
arrange|준비하다, 정리하다|TOEIC 핵심 동사|TOEIC,TOEIC LC,일정 조정|The assistant arranged transportation for the visitors.|비서가 방문객을 위한 교통편을 준비했습니다.|organize,schedule,transportation|2
attach|첨부하다|이메일·문서|TOEIC,TOEIC RC,이메일|Please attach the signed contract to your reply.|서명한 계약서를 답장에 첨부해 주세요.|attachment,document,email|1
attend|참석하다|회의·행사|TOEIC,TOEIC LC,회의 표현|All team members are expected to attend the workshop.|모든 팀원은 워크숍에 참석해야 합니다.|participant,conference,workshop|1
availability|가능한 시간, 재고|예약·일정|TOEIC,TOEIC LC,일정 조정|Could you let me know your availability next week?|다음 주 가능한 시간을 알려 주시겠어요?|schedule,appointment,stock|3
benefits|복리후생, 혜택|채용·인사|TOEIC,TOEIC RC,채용|The company offers competitive benefits to full-time staff.|그 회사는 정규직 직원에게 경쟁력 있는 복리후생을 제공합니다.|salary,insurance,employee|2
budget|예산|회계·청구|TOEIC,TOEIC RC,회계|The marketing budget was increased this quarter.|이번 분기에 마케팅 예산이 늘었습니다.|expense,revenue,approval|2
candidate|후보자, 지원자|채용·인사|TOEIC,TOEIC RC,채용|The strongest candidate has five years of sales experience.|가장 유력한 후보자는 5년의 영업 경력이 있습니다.|applicant,interview,qualification|2
capacity|수용 능력, 용량|시설·운영|TOEIC,TOEIC RC,시설|The warehouse is operating at full capacity.|그 창고는 최대 수용 능력으로 운영되고 있습니다.|facility,warehouse,accommodate|3
cater|음식을 제공하다|회의·행사|TOEIC,TOEIC LC,행사 준비|A local restaurant will cater the awards ceremony.|지역 식당이 시상식 음식을 제공할 예정입니다.|banquet,venue,refreshments|3
commute|통근하다|일상 업무|TOEIC,TOEIC LC,교통|Many employees commute by train.|많은 직원이 기차로 통근합니다.|transportation,employee,route|1
complaint|불만, 항의|고객응대|TOEIC,TOEIC RC,고객 서비스|The manager responded to the customer's complaint.|관리자가 고객의 불만에 답변했습니다.|customer service,refund,issue|2
comply|준수하다|규정·정책|TOEIC,TOEIC RC,규정|All vendors must comply with safety regulations.|모든 공급업체는 안전 규정을 준수해야 합니다.|policy,regulation,requirement|3
confirm|확인하다|예약·일정|TOEIC,TOEIC LC,일정 조정|Please confirm your reservation by noon.|정오까지 예약을 확인해 주세요.|verify,reservation,schedule|1
considerable|상당한|TOEIC 핵심 형용사|TOEIC,TOEIC RC,어휘 문제|The new system saved a considerable amount of time.|새 시스템은 상당한 시간을 절약했습니다.|significant,substantial,amount|3
convenient|편리한|예약·일정|TOEIC,TOEIC LC,일정 조정|The hotel is conveniently located near the station.|그 호텔은 역 근처에 편리하게 위치해 있습니다.|location,access,nearby|1
deadline|마감일|사무·행정|TOEIC,TOEIC RC,이메일|The deadline for the report has been extended.|보고서 마감일이 연장되었습니다.|due date,submit,extension|1
delay|지연, 지연시키다|배송·물류|TOEIC,TOEIC LC,배송|The shipment was delayed because of bad weather.|악천후로 배송이 지연되었습니다.|postpone,shipping,schedule|2
delegate|위임하다, 대표|사무·행정|TOEIC,TOEIC RC,관리|The supervisor delegated the task to a senior assistant.|관리자는 그 업무를 선임 보조원에게 위임했습니다.|assign,responsibility,task|3
department|부서|사무·행정|TOEIC,TOEIC LC,회사 생활|Please contact the accounting department.|회계 부서에 연락해 주세요.|division,team,office|1
discount|할인|구매·판매|TOEIC,TOEIC RC,판매|Members receive a 15 percent discount on all items.|회원은 모든 품목에 대해 15% 할인을 받습니다.|promotion,coupon,price|1
distribute|배포하다|사무·행정|TOEIC,TOEIC RC,문서|The updated handbook will be distributed on Monday.|개정된 안내서가 월요일에 배포됩니다.|handout,document,send|2
document|문서, 기록하다|이메일·문서|TOEIC,TOEIC RC,문서|The document must be signed before processing.|그 문서는 처리 전에 서명되어야 합니다.|file,form,contract|1
due|마감인, 예정된|사무·행정|TOEIC,TOEIC RC,문법|The final payment is due at the end of the month.|최종 결제는 월말까지입니다.|deadline,payment,invoice|2
efficient|효율적인|TOEIC 핵심 형용사|TOEIC,TOEIC RC,업무 개선|The new checkout system is faster and more efficient.|새 결제 시스템은 더 빠르고 효율적입니다.|productivity,process,system|2
eligible|자격이 있는|채용·인사|TOEIC,TOEIC RC,복리후생|Only full-time employees are eligible for the bonus.|정규직 직원만 보너스를 받을 자격이 있습니다.|qualification,benefits,requirement|3
estimate|견적, 추정하다|회계·청구|TOEIC,TOEIC RC,견적|The contractor sent an estimate for the repairs.|계약업체가 수리 견적을 보냈습니다.|quote,cost,repair|2
evaluate|평가하다|채용·인사|TOEIC,TOEIC RC,성과 평가|The committee will evaluate each proposal carefully.|위원회는 각 제안서를 신중히 평가할 것입니다.|review,assess,performance|3
executive|임원|사무·행정|TOEIC,TOEIC LC,회사 생활|The executive team approved the expansion plan.|임원진이 확장 계획을 승인했습니다.|director,management,approval|2
facility|시설|시설·운영|TOEIC,TOEIC RC,시설|The sports facility will be closed for maintenance.|스포츠 시설은 유지보수로 폐쇄됩니다.|building,maintenance,renovation|2
fee|요금, 수수료|회계·청구|TOEIC,TOEIC RC,청구|A late fee will be added after the due date.|기한 후에는 연체료가 추가됩니다.|charge,payment,invoice|1
feedback|피드백, 의견|고객응대|TOEIC,TOEIC LC,고객 서비스|We appreciate your feedback on our new website.|새 웹사이트에 대한 의견에 감사드립니다.|survey,response,customer|2
file|서류, 제출하다|이메일·문서|TOEIC,TOEIC RC,문서|The accountant filed the tax forms yesterday.|회계사가 어제 세금 서류를 제출했습니다.|document,record,submit|2
finalize|마무리하다, 확정하다|사무·행정|TOEIC,TOEIC RC,업무 절차|We need to finalize the contract by Thursday.|목요일까지 계약서를 확정해야 합니다.|confirm,complete,contract|3
headquarters|본사|사무·행정|TOEIC,TOEIC RC,회사 생활|The headquarters is located in Singapore.|본사는 싱가포르에 있습니다.|branch,office,company|2
inventory|재고|배송·물류|TOEIC,TOEIC RC,재고|The store checks its inventory every Friday.|그 매장은 매주 금요일 재고를 확인합니다.|stock,warehouse,supply|2
invoice|청구서|회계·청구|TOEIC,TOEIC RC,청구|The invoice should include the purchase order number.|청구서에는 구매 주문 번호가 포함되어야 합니다.|billing,payment,receipt|2
itinerary|여행 일정표|출장·여행|TOEIC,TOEIC LC,여행|Your travel itinerary has been updated.|출장 일정표가 업데이트되었습니다.|flight,hotel,schedule|2
landlord|임대인|시설·운영|TOEIC,TOEIC RC,임대|The landlord agreed to repair the heating system.|임대인이 난방 시스템을 수리하기로 했습니다.|tenant,lease,maintenance|3
maintenance|유지보수|시설·운영|TOEIC,TOEIC RC,시설|The elevator is closed for routine maintenance.|엘리베이터는 정기 유지보수로 운행하지 않습니다.|repair,facility,inspection|2
memo|사내 메모|이메일·문서|TOEIC,TOEIC RC,문서|The memo explains the new parking policy.|그 사내 메모는 새 주차 정책을 설명합니다.|notice,policy,staff|1
merchandise|상품|구매·판매|TOEIC,TOEIC RC,판매|Damaged merchandise can be returned within 30 days.|손상된 상품은 30일 이내에 반품할 수 있습니다.|product,item,retailer|2
modify|수정하다|TOEIC 핵심 동사|TOEIC,TOEIC RC,문서|The designer modified the brochure layout.|디자이너가 브로슈어 레이아웃을 수정했습니다.|revise,update,change|2
notify|알리다, 통지하다|고객응대|TOEIC,TOEIC RC,공지|Customers will be notified when the item ships.|상품이 배송되면 고객에게 통지됩니다.|inform,announce,update|2
occupation|직업|채용·인사|TOEIC,TOEIC RC,양식|Please write your current occupation on the form.|양식에 현재 직업을 적어 주세요.|job,position,profession|2
offer|제안, 제공하다|구매·판매|TOEIC,TOEIC RC,판매|The store offers free delivery this week.|그 매장은 이번 주 무료 배송을 제공합니다.|provide,discount,promotion|1
onboard|신입 직원을 적응시키다|채용·인사|TOEIC,비즈니스 영어,채용|The HR team will onboard three new employees.|인사팀은 신입 직원 세 명의 적응 절차를 진행할 예정입니다.|training,new hire,orientation|3
order|주문, 명령|구매·판매|TOEIC,TOEIC RC,구매|Your order will be shipped tomorrow.|주문하신 상품은 내일 배송됩니다.|purchase,shipment,item|1
package|소포, 포장하다|배송·물류|TOEIC,TOEIC LC,배송|The package was delivered to the front desk.|소포가 프런트 데스크로 배송되었습니다.|delivery,shipment,parcel|1
payment|결제, 지불|회계·청구|TOEIC,TOEIC RC,청구|Payment must be received before the course begins.|강좌 시작 전에 결제가 완료되어야 합니다.|invoice,fee,receipt|1
policy|정책, 규정|규정·정책|TOEIC,TOEIC RC,규정|The return policy is printed on the receipt.|반품 정책은 영수증에 인쇄되어 있습니다.|rule,procedure,refund|2
postpone|연기하다|예약·일정|TOEIC,TOEIC LC,일정 조정|The training session was postponed until next month.|교육 세션이 다음 달로 연기되었습니다.|delay,reschedule,cancel|2
prior|이전의, 우선하는|TOEIC 핵심 형용사|TOEIC,TOEIC RC,문법|Prior approval is required for travel expenses.|출장비에는 사전 승인이 필요합니다.|previous,before,approval|3
proceed|진행하다|TOEIC 핵심 동사|TOEIC,TOEIC RC,절차|Please proceed to the registration desk.|등록 데스크로 이동해 주세요.|continue,go ahead,process|2
process|처리하다, 절차|사무·행정|TOEIC,TOEIC RC,업무 절차|Refund requests are processed within five business days.|환불 요청은 영업일 기준 5일 이내에 처리됩니다.|procedure,handle,request|2
promote|승진시키다, 홍보하다|마케팅·영업|TOEIC,TOEIC RC,마케팅|The company promoted its new service online.|회사는 새 서비스를 온라인으로 홍보했습니다.|advertise,marketing,campaign|2
proposal|제안서|회의·행사|TOEIC,TOEIC RC,문서|The proposal includes a detailed cost estimate.|제안서에는 자세한 비용 견적이 포함되어 있습니다.|plan,estimate,presentation|2
purchase|구매, 구매하다|구매·판매|TOEIC,TOEIC RC,구매|All purchases over $100 require manager approval.|100달러 이상의 모든 구매에는 관리자 승인이 필요합니다.|buy,order,invoice|1
qualification|자격, 능력|채용·인사|TOEIC,TOEIC RC,채용|Language skills are an important qualification for this role.|어학 능력은 이 직무의 중요한 자격입니다.|requirement,eligible,skill|3
quarterly|분기별의|회계·청구|TOEIC,TOEIC RC,보고|The quarterly sales report will be released tomorrow.|분기별 판매 보고서가 내일 공개됩니다.|revenue,report,period|3
receipt|영수증|회계·청구|TOEIC,TOEIC RC,청구|Keep your receipt in case you need a refund.|환불이 필요할 경우를 대비해 영수증을 보관하세요.|invoice,payment,refund|1
recommend|추천하다|고객응대|TOEIC,TOEIC LC,고객 서비스|The technician recommended replacing the battery.|기술자는 배터리 교체를 추천했습니다.|suggest,advise,replace|2
recruit|채용하다|채용·인사|TOEIC,TOEIC RC,채용|The company plans to recruit more engineers.|그 회사는 엔지니어를 더 채용할 계획입니다.|hire,candidate,position|2
refund|환불|고객응대|TOEIC,TOEIC RC,고객 서비스|Refunds are available within 14 days of purchase.|환불은 구매 후 14일 이내에 가능합니다.|return,receipt,policy|1
register|등록하다|회의·행사|TOEIC,TOEIC LC,행사 준비|Employees must register for the seminar online.|직원은 세미나에 온라인으로 등록해야 합니다.|sign up,conference,form|1
relocate|이전하다, 이주하다|사무·행정|TOEIC,TOEIC RC,회사 생활|The company will relocate its office downtown.|그 회사는 사무실을 도심으로 이전할 예정입니다.|move,headquarters,branch|3
renewal|갱신|규정·정책|TOEIC,TOEIC RC,계약|Membership renewal notices are sent by email.|회원 갱신 안내는 이메일로 발송됩니다.|subscription,contract,extend|3
repair|수리하다, 수리|시설·운영|TOEIC,TOEIC LC,시설|The printer needs repair before the afternoon shift.|프린터는 오후 근무 전 수리가 필요합니다.|maintenance,fix,technician|1
replace|교체하다|시설·운영|TOEIC,TOEIC RC,시설|The old chairs will be replaced next week.|낡은 의자는 다음 주에 교체됩니다.|repair,upgrade,equipment|1
request|요청, 요청하다|이메일·문서|TOEIC,TOEIC RC,이메일|Your request for additional copies has been approved.|추가 사본 요청이 승인되었습니다.|ask,approval,document|1
reservation|예약|예약·일정|TOEIC,TOEIC LC,여행|The restaurant reservation is for 7 p.m.|식당 예약은 오후 7시입니다.|booking,appointment,confirm|1
resume|이력서|채용·인사|TOEIC,TOEIC RC,채용|Please attach your resume to the application form.|지원서에 이력서를 첨부해 주세요.|CV,applicant,qualification|1
retailer|소매업체|구매·판매|TOEIC,TOEIC RC,판매|The retailer opened three new stores this year.|그 소매업체는 올해 새 매장 세 곳을 열었습니다.|store,merchandise,sales|2
revenue|매출, 수익|회계·청구|TOEIC,TOEIC RC,보고|Online advertising increased monthly revenue.|온라인 광고가 월 매출을 늘렸습니다.|sales,profit,quarterly|2
review|검토하다, 평가|사무·행정|TOEIC,TOEIC RC,업무 절차|Please review the attached draft by Wednesday.|수요일까지 첨부된 초안을 검토해 주세요.|check,evaluate,revise|1
revise|수정하다|이메일·문서|TOEIC,TOEIC RC,문서|The writer revised the product description.|작성자가 제품 설명을 수정했습니다.|modify,edit,update|2
schedule|일정, 일정을 잡다|예약·일정|TOEIC,TOEIC LC,일정 조정|The interview is scheduled for Monday morning.|면접은 월요일 오전으로 예정되어 있습니다.|appointment,calendar,reschedule|1
shipment|배송품, 선적|배송·물류|TOEIC,TOEIC RC,배송|The shipment arrived two days earlier than expected.|배송품이 예상보다 이틀 일찍 도착했습니다.|delivery,package,warehouse|2
shortage|부족|배송·물류|TOEIC,TOEIC RC,재고|A shortage of parts delayed production.|부품 부족으로 생산이 지연되었습니다.|supply,inventory,delay|2
staff|직원|사무·행정|TOEIC,TOEIC LC,회사 생활|All staff should read the updated policy.|모든 직원은 개정된 정책을 읽어야 합니다.|employee,team,department|1
submit|제출하다|이메일·문서|TOEIC,TOEIC RC,문서|Submit the completed form to human resources.|작성한 양식을 인사팀에 제출하세요.|send,file,application|1
subscribe|구독하다|구매·판매|TOEIC,TOEIC RC,서비스|Customers can subscribe to the monthly newsletter.|고객은 월간 뉴스레터를 구독할 수 있습니다.|subscription,newsletter,renewal|2
supplier|공급업체|배송·물류|TOEIC,TOEIC RC,구매|The supplier will deliver the materials tomorrow.|공급업체가 내일 자재를 배송할 예정입니다.|vendor,materials,shipment|2
survey|설문조사|고객응대|TOEIC,TOEIC RC,고객 서비스|Please complete the customer satisfaction survey.|고객 만족도 설문조사를 작성해 주세요.|feedback,response,customer|2
tenant|임차인|시설·운영|TOEIC,TOEIC RC,임대|Tenants must report maintenance problems promptly.|임차인은 유지보수 문제를 즉시 보고해야 합니다.|landlord,lease,facility|3
transfer|이동하다, 송금하다|사무·행정|TOEIC,TOEIC RC,업무 절차|The employee transferred to the Tokyo office.|그 직원은 도쿄 사무실로 이동했습니다.|relocate,department,account|2
update|업데이트, 갱신하다|이메일·문서|TOEIC,TOEIC RC,이메일|We will update the client after the inspection.|점검 후 고객에게 업데이트하겠습니다.|notify,inform,revise|1
vendor|판매업체, 공급업체|구매·판매|TOEIC,TOEIC RC,구매|The vendor provides office furniture and supplies.|그 판매업체는 사무용 가구와 물품을 제공합니다.|supplier,contract,order|2
warranty|보증|구매·판매|TOEIC,TOEIC RC,구매|The laptop comes with a two-year warranty.|그 노트북에는 2년 보증이 제공됩니다.|repair,replace,coverage|2
warehouse|창고|배송·물류|TOEIC,TOEIC RC,배송|The warehouse stores extra inventory.|그 창고는 추가 재고를 보관합니다.|inventory,shipment,storage|2
workshop|워크숍, 교육 세션|회의·행사|TOEIC,TOEIC LC,행사 준비|The workshop covers presentation skills.|그 워크숍은 발표 기술을 다룹니다.|training,seminar,attend|1
announcement|공지, 발표|공지·방송|TOEIC,TOEIC LC,공지|The announcement will be made after lunch.|그 공지는 점심 후에 발표됩니다.|notice,inform,staff|1
complimentary|무료의|출장·여행|TOEIC,TOEIC RC,호텔|Guests receive a complimentary breakfast.|투숙객은 무료 조식을 받습니다.|free,hotel,benefit|2
inspection|점검, 검사|시설·운영|TOEIC,TOEIC RC,시설|The safety inspection will take place on Friday.|안전 점검은 금요일에 실시됩니다.|maintenance,facility,check|2
reimbursement|상환, 환급|회계·청구|TOEIC,TOEIC RC,비용 처리|Submit receipts for travel reimbursement.|출장비 환급을 위해 영수증을 제출하세요.|expense,receipt,refund|3
expenditure|지출|회계·청구|TOEIC,TOEIC RC,회계|The report lists every major expenditure.|그 보고서는 모든 주요 지출을 나열합니다.|expense,budget,cost|4
venue|행사장|회의·행사|TOEIC,TOEIC LC,행사 준비|The venue is located near the convention center.|행사장은 컨벤션 센터 근처에 있습니다.|conference,location,attendee|2
brochure|안내 책자|마케팅·영업|TOEIC,TOEIC RC,마케팅|The brochure describes the new tour packages.|그 안내 책자는 새 여행 상품을 설명합니다.|flyer,advertising,product|2
campaign|캠페인|마케팅·영업|TOEIC,TOEIC RC,마케팅|The campaign increased brand awareness.|그 캠페인은 브랜드 인지도를 높였습니다.|promotion,marketing,sales|2
prospective|잠재적인, 장래의|마케팅·영업|TOEIC,TOEIC RC,어휘 문제|The sales team contacted prospective clients.|영업팀은 잠재 고객에게 연락했습니다.|potential,client,lead|3
subscription|구독, 정기 이용|구매·판매|TOEIC,TOEIC RC,서비스|The annual subscription includes technical support.|연간 구독에는 기술 지원이 포함됩니다.|renewal,service,customer|2
supervisor|관리자, 상사|사무·행정|TOEIC,TOEIC LC,회사 생활|Ask your supervisor before changing your shift.|근무 시간을 바꾸기 전에 상사에게 물어보세요.|manager,staff,approval|1
orientation|오리엔테이션|채용·인사|TOEIC,TOEIC LC,채용|New employees attend orientation on their first day.|신입 직원은 첫날 오리엔테이션에 참석합니다.|onboard,training,new hire|2
renovation|개조, 보수|시설·운영|TOEIC,TOEIC RC,시설|The lobby renovation will begin next week.|로비 보수 공사는 다음 주 시작됩니다.|construction,facility,maintenance|2
malfunction|오작동|시설·운영|TOEIC,TOEIC LC,시설|The copier malfunction caused a long delay.|복사기 오작동으로 큰 지연이 발생했습니다.|repair,equipment,issue|3
receipt number|영수증 번호|회계·청구|TOEIC,TOEIC RC,청구|Enter your receipt number to track the refund.|환불을 추적하려면 영수증 번호를 입력하세요.|receipt,refund,order|2
account balance|계좌 잔액|회계·청구|TOEIC,TOEIC RC,은행|The current account balance is shown online.|현재 계좌 잔액은 온라인에 표시됩니다.|bank,payment,statement|3
annual report|연차 보고서|회계·청구|TOEIC,TOEIC RC,보고|The annual report summarizes company performance.|연차 보고서는 회사 실적을 요약합니다.|revenue,quarterly,shareholder|3
shipping label|배송 라벨|배송·물류|TOEIC,TOEIC RC,배송|Print the shipping label before sealing the box.|상자를 밀봉하기 전에 배송 라벨을 출력하세요.|package,shipment,warehouse|2
tracking number|운송장 번호|배송·물류|TOEIC,TOEIC LC,배송|Use the tracking number to check delivery status.|배송 상태를 확인하려면 운송장 번호를 사용하세요.|package,shipment,delivery|2
boarding pass|탑승권|출장·여행|TOEIC,TOEIC LC,여행|Please print your boarding pass before arriving.|도착하기 전에 탑승권을 출력해 주세요.|flight,airport,itinerary|1
conference call|전화 회의|회의·행사|TOEIC,TOEIC LC,회의 표현|The conference call starts at 3 p.m.|전화 회의는 오후 3시에 시작됩니다.|meeting,participant,dial in|2
minutes|회의록|회의·행사|TOEIC,TOEIC RC,회의 표현|The meeting minutes were shared with all attendees.|회의록이 모든 참석자에게 공유되었습니다.|agenda,meeting,action items|3
action items|후속 조치 항목|회의·행사|TOEIC,비즈니스 영어,회의 표현|Let's review the action items before we leave.|나가기 전에 후속 조치 항목을 검토합시다.|next steps,owner,deadline|3
as discussed|논의한 대로|비즈니스 영어 문장|비즈니스 영어,메일 표현,실무 문장|As discussed, I will send the revised estimate today.|논의한 대로 오늘 수정 견적서를 보내겠습니다.|follow-up,email,agreement|2
please find attached|첨부 파일을 확인해 주세요|비즈니스 영어 문장|비즈니스 영어,메일 표현,실무 문장|Please find attached the updated invoice.|첨부된 수정 청구서를 확인해 주세요.|attachment,email,document|2
at your earliest convenience|가능한 한 빠른 편한 시간에|비즈니스 영어 문장|비즈니스 영어,메일 표현,정중한 요청|Please reply at your earliest convenience.|가능한 한 빠른 편한 시간에 답장해 주세요.|reply,request,polite|3
keep me posted|계속 알려 주세요|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|Please keep me posted on the shipment status.|배송 상태를 계속 알려 주세요.|update,notify,status|2
follow up on|후속 확인하다|비즈니스 영어 문장|비즈니스 영어,메일 표현,고객응대|I am following up on my previous email.|이전 이메일에 대해 후속 확인드립니다.|email,reminder,reply|2
on track|순조롭게 진행 중인|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,회의 표현|The project is still on track for a June launch.|그 프로젝트는 6월 출시 일정대로 진행 중입니다.|schedule,milestone,progress|2
behind schedule|일정보다 늦은|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,회의 표현|The renovation is behind schedule because of a parts shortage.|부품 부족으로 보수 공사가 일정보다 늦어졌습니다.|delay,timeline,shortage|2
move forward with|진행하다|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|We can move forward with the supplier contract.|공급업체 계약을 진행할 수 있습니다.|proceed,approve,next steps|2
touch base|간단히 연락하다|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|Let's touch base after the client presentation.|고객 발표 후 간단히 이야기합시다.|check in,meeting,update|3
circle back|다시 논의하다|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|Can we circle back after reviewing the data?|데이터를 검토한 뒤 다시 이야기할 수 있을까요?|review,follow up,data|3
align on|의견을 맞추다|비즈니스 영어 문장|비즈니스 영어,회의 표현,스타트업 영어|Let's align on the next steps and owners.|다음 단계와 담당자에 대해 의견을 맞춥시다.|agreement,next steps,action items|3
take ownership of|책임지고 맡다|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,회의 표현|Mina will take ownership of the onboarding checklist.|미나는 온보딩 체크리스트를 책임지고 맡을 예정입니다.|owner,responsibility,task|3
bring up|화제로 꺼내다|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|He brought up a concern about the delivery timeline.|그는 배송 일정에 대한 우려를 제기했습니다.|mention,issue,meeting|2
follow through|끝까지 실행하다|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,실무 문장|The team followed through on every action item.|팀은 모든 후속 조치 항목을 끝까지 실행했습니다.|complete,execute,action items|3
reach out to|연락하다|비즈니스 영어 문장|비즈니스 영어,메일 표현,고객응대|Please reach out to the vendor for a new quote.|새 견적을 위해 판매업체에 연락해 주세요.|contact,vendor,quote|2
get back to|다시 연락하다|비즈니스 영어 문장|비즈니스 영어,메일 표현,고객응대|I will get back to you by the end of the day.|오늘 중으로 다시 연락드리겠습니다.|reply,follow up,deadline|2
look into|조사하다|비즈니스 영어 문장|비즈니스 영어,고객응대,실무 문장|The support team will look into the billing issue.|지원팀이 청구 문제를 조사할 예정입니다.|investigate,issue,customer service|2
put together|준비하다, 작성하다|비즈니스 영어 문장|비즈니스 영어,회의 표현,실무 문장|I put together a short proposal for the client.|고객을 위한 짧은 제안서를 준비했습니다.|prepare,proposal,document|2
set up a meeting|회의를 잡다|비즈니스 영어 문장|비즈니스 영어,회의 표현,일정 조정|Could you set up a meeting with the design team?|디자인팀과 회의를 잡아 주실 수 있나요?|schedule,appointment,calendar|1
run into an issue|문제가 생기다|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,고객응대|We ran into an issue with the payment system.|결제 시스템에 문제가 생겼습니다.|problem,delay,system|2
workaround|임시 해결책|비즈니스 영어 문장|비즈니스 영어,프로젝트 관리,스타트업 영어|The engineer suggested a temporary workaround.|엔지니어가 임시 해결책을 제안했습니다.|solution,issue,temporary|4
trade-off|상충 관계, 절충|스타트업·실무 영어|스타트업 영어,비즈니스 영어,전문 용어|There is a trade-off between speed and accuracy.|속도와 정확성 사이에는 절충이 있습니다.|decision,priority,product|4
value proposition|가치 제안|스타트업·실무 영어|스타트업 영어,비즈니스 영어,전문 용어|The proposal needs a clearer value proposition.|제안서에는 더 명확한 가치 제안이 필요합니다.|benefit,customer,pitch|4
customer acquisition|고객 획득|스타트업·실무 영어|스타트업 영어,마케팅 영어,SaaS 지표|Customer acquisition costs rose last quarter.|지난 분기에 고객 획득 비용이 상승했습니다.|CAC,marketing,conversion|4
market share|시장 점유율|마케팅·영업|TOEIC,비즈니스 영어,마케팅 영어|The company increased its market share in Asia.|그 회사는 아시아에서 시장 점유율을 높였습니다.|competitor,sales,growth|3
brand awareness|브랜드 인지도|마케팅·영업|TOEIC,비즈니스 영어,마케팅 영어|The campaign improved brand awareness among students.|그 캠페인은 학생 사이에서 브랜드 인지도를 높였습니다.|campaign,marketing,audience|3
lead generation|잠재고객 발굴|마케팅·영업|스타트업 영어,비즈니스 영어,마케팅 영어|The webinar was useful for lead generation.|그 웨비나는 잠재고객 발굴에 유용했습니다.|sales,marketing,prospect|4
conversion rate|전환율|스타트업·실무 영어|스타트업 영어,마케팅 영어,SaaS 지표|The new landing page improved the conversion rate.|새 랜딩 페이지가 전환율을 개선했습니다.|signup,funnel,customer acquisition|3
retention rate|유지율|스타트업·실무 영어|스타트업 영어,SaaS 지표,비즈니스 영어|The app's retention rate improved after onboarding changed.|온보딩 변경 후 앱 유지율이 개선되었습니다.|retention,churn,engagement|4
cash flow|현금 흐름|스타트업·실무 영어|스타트업 영어,투자 영어,회계|Positive cash flow gives the company more flexibility.|긍정적인 현금 흐름은 회사에 더 많은 유연성을 줍니다.|revenue,burn rate,runway|3
pricing tier|가격 등급|스타트업·실무 영어|스타트업 영어,SaaS 지표,비즈니스 영어|The new pricing tier is aimed at small teams.|새 가격 등급은 소규모 팀을 대상으로 합니다.|subscription,plan,customer|3
procurement process|조달 절차|구매·판매|TOEIC,비즈니스 영어,구매|The procurement process takes about two weeks.|조달 절차는 약 2주가 걸립니다.|purchase order,vendor,approval|4
purchase order|구매 주문서|구매·판매|TOEIC,비즈니스 영어,구매|A purchase order is required before shipping.|배송 전에 구매 주문서가 필요합니다.|invoice,vendor,shipment|3
expense report|경비 보고서|회계·청구|TOEIC,비즈니스 영어,비용 처리|Employees submit an expense report after business trips.|직원은 출장 후 경비 보고서를 제출합니다.|receipt,reimbursement,travel|3
service outage|서비스 장애|고객응대|비즈니스 영어,고객응대,스타트업 영어|Customers were notified about the service outage.|고객에게 서비스 장애가 공지되었습니다.|downtime,notice,support|4
maintenance notice|점검 공지|공지·방송|TOEIC,TOEIC LC,공지|A maintenance notice was posted in the lobby.|로비에 점검 공지가 게시되었습니다.|facility,inspection,announcement|2
product recall|제품 리콜|고객응대|TOEIC,비즈니스 영어,고객 서비스|The manufacturer announced a product recall.|제조사가 제품 리콜을 발표했습니다.|defect,refund,customer|4
performance review|성과 평가|채용·인사|TOEIC,비즈니스 영어,인사|Performance reviews are held every December.|성과 평가는 매년 12월에 진행됩니다.|evaluate,employee,feedback|3
job opening|채용 공고|채용·인사|TOEIC,비즈니스 영어,채용|The job opening was posted on the company website.|채용 공고가 회사 웹사이트에 게시되었습니다.|position,applicant,resume|2
interview slot|면접 시간대|채용·인사|TOEIC,비즈니스 영어,채용|Please choose an available interview slot.|가능한 면접 시간대를 선택해 주세요.|appointment,candidate,schedule|2
training session|교육 세션|회의·행사|TOEIC,TOEIC LC,교육|The training session starts at 9 a.m.|교육 세션은 오전 9시에 시작됩니다.|workshop,orientation,staff|1
sales forecast|매출 전망|마케팅·영업|TOEIC,비즈니스 영어,보고|The sales forecast was higher than expected.|매출 전망은 예상보다 높았습니다.|revenue,quarterly,report|3
customer retention|고객 유지|스타트업·실무 영어|스타트업 영어,SaaS 지표,고객응대|Customer retention is a key metric for subscription apps.|고객 유지는 구독 앱의 핵심 지표입니다.|retention rate,churn,engagement|4
quarterly revenue|분기 매출|회계·청구|TOEIC,비즈니스 영어,보고|Quarterly revenue increased by 12 percent.|분기 매출이 12% 증가했습니다.|revenue,report,sales|3
`.trim();

function levelFromDifficulty(difficulty: VocabDifficulty): VocabLevel {
  if (difficulty <= 1) return "필수 기초";
  if (difficulty === 2) return "200점 목표";
  if (difficulty === 3) return "300점 목표";
  return "350+ 목표";
}

function targetFromDifficulty(difficulty: VocabDifficulty): TargetScore {
  if (difficulty <= 2) return "200점";
  if (difficulty === 3) return "300점";
  return "350+";
}

function importanceFromRank(index: number, difficulty: VocabDifficulty): Importance {
  if (index < 30 || difficulty >= 4) return "최우선";
  if (index < 90 || difficulty === 3) return "매우 중요";
  return "중요";
}

function parseLine(line: string): ToeicRaw {
  const [word, meaningKo, part, tagText, example, exampleKo, relatedText, difficultyText] = line.split("|");
  return {
    word,
    meaningKo,
    part,
    tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
    example,
    exampleKo,
    related: relatedText.split(",").map((tag) => tag.trim()).filter(Boolean),
    difficulty: Number(difficultyText || 2) as VocabDifficulty,
  };
}

function explanationFor(item: ToeicRaw) {
  if (item.tags.includes("TOEIC LC")) {
    return `${item.meaningKo}는 TOEIC LC의 안내 방송, 전화 통화, 일정 조정 대화에서 소리를 듣고 상황을 빠르게 잡아야 하는 표현입니다.`;
  }
  if (item.tags.includes("TOEIC RC")) {
    return `${item.meaningKo}는 TOEIC RC의 이메일, 공지문, 광고, 양식에서 문맥과 품사를 함께 확인해야 하는 빈출 어휘입니다.`;
  }
  if (item.tags.includes("스타트업 영어")) {
    return `${item.meaningKo}는 실제 스타트업 회의, 지표 리뷰, 투자 논의에서 바로 쓰이는 실무 표현입니다.`;
  }
  return `${item.meaningKo}는 비즈니스 영어에서 메일, 회의, 고객 응대에 자주 쓰이는 표현입니다.`;
}

export const TOEIC_BUSINESS_VOCAB_SEEDS: ToeicBusinessVocabSeed[] = RAW_LINES
  .split(/\n+/)
  .map(parseLine)
  .map((item, index) => {
    const difficulty = item.difficulty || 2;
    const frequencyScore = Math.max(72, 99 - Math.floor(index / 3));
    const tags = Array.from(new Set(["TOEIC", ...item.tags, item.part]));
    return {
      word: item.word,
      reading: item.word.toLowerCase(),
      meaningKo: item.meaningKo,
      level: levelFromDifficulty(difficulty),
      subject: "영어",
      part: item.part,
      questionTypes: tags,
      relatedWords: item.related,
      exampleJa: item.example,
      exampleKo: item.exampleKo,
      explanationKo: explanationFor(item),
      frequencyScore,
      difficulty,
      importance: importanceFromRank(index, difficulty),
      targetScore: targetFromDifficulty(difficulty),
    };
  });
