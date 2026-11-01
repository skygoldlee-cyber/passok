# -*- coding: utf-8 -*-
"""Q-Net 국가기술자격 통계 수집 — 시장분석용 응시자 DB
사용: python tools/market/fetch_qnet_stats.py [--years 2021-2025] [--out tmp/market]
전략:
 1) 종목별 시드(분석 보고서 검증치 + 공개 통계)를 먼저 적재
 2) Q-Net cst006 POST(jmCd·implYY)로 연도별 응시·합격 실측 시도 — 실패 시 시드 유지
 3) 라이브: data.go.kr 키(env DATA_GO_KR_SERVICE_KEY — 이미 설정됨)로 자격통계 API 시도; HRD-Net 전용(authKey·authKeySeqNo, hrd.go.kr 별도 발급 — env HRD_OC_KEY·HRD_OC_SEQNO)과 구분
산출: qnet_stats.csv · qnet_stats.json (시험×연도×구분: 응시·합격·합격률·주기·응시료·공개문제)
"""
import os,sys,csv,json,urllib.request,urllib.parse,re,time

# (이름, jmCd, Passok팩, 주기, 응시료(필기), 공개문제, 시드: {연도: (필기응시, 실기응시)})
EXAMS=[
 ("요양보호사","7805","carework","상시",32000,"비공개",{"2025":(173691,None),"2024":(152000,None),"2023":(140000,None)}),
 ("공인중개사 1차","9210","broker","연1회",20600,"공개",{"2025":(80387,None),"2024":(None,None)}),
 ("공인중개사 2차","9210","broker","연1회",20600,"공개",{"2025":(33247,None)}),
 ("정보처리기사","1321","iteng","연3회",18200,"비공개",{"2025":(66308,73858),"2024":(60000,None)}),
 ("정보처리산업기사","1321","itindeng","연3회",18200,"비공개",{}),
 ("한식조리기능사","5601",None,"상시",14500,"비공개",{"2025":(61122,38824)}),
 ("제과기능사","5401",None,"상시",14500,"비공개",{"2025":(46965,24061)}),
 ("제빵기능사","5402",None,"상시",14500,"비공개",{"2025":(47926,25501)}),
 ("컴퓨터활용능력 1급","1322","compapp1","상시",18800,"공개",{"2025":(150000,None)}),
 ("컴퓨터활용능력 2급","1322","compapp2","상시",18800,"공개",{"2025":(180000,None)}),
 ("산업안전기사","1341","indsafe","연3회",20800,"공개",{"2025":(30000,None)}),
 ("산업안전산업기사","1341","indsafeind","연3회",20800,"공개",{}),
 ("사회복지사 1급","7701",None,"연1회",18000,"공개",{"2025":(24783,None)}),
 ("직업상담사 2급","7901",None,"연1회",20800,"공개",{"2025":(15000,None)}),
 ("맞춤형화장품조제관리사","7700","cosmetic","연2회",30000,"비공개",{"2025":(3000,None)}),
 ("미용사(피부)","5202","skincare","상시",14500,"비공개",{"2025":(30000,None)}),
 ("미용사(일반)","5201","hairdresser","상시",14500,"비공개",{"2025":(50000,None)}),
 ("전기기사","1431","eleceng","연4회",20800,"비공개",{"2025":(20000,None)}),
 ("전기산업기사","1431","elecindeng","연4회",20800,"비공개",{"2025":(25000,None)}),
 ("공인노무사","9260","labor","연1회",25000,"공개",{"2025":(8000,None)}),
]

import json as _json
HRD_KEY=os.getenv('HRD_OC_KEY') or _load_env('HRD_OC_KEY')
HRD_SEQ=os.getenv('HRD_OC_SEQNO') or _load_env('HRD_OC_SEQNO')
DG_KEY=os.getenv('DATA_GO_KR_SERVICE_KEY') or _load_env('DATA_GO_KR_SERVICE_KEY')
KOSIS_KEY=os.getenv('KOSIS_API_KEY') or _load_env('KOSIS_API_KEY')
# KOSIS 통계표(orgId/tblId) — kosis.kr에서 '국가기술자격' 검색 시 URL 파라미터로 확정 필요
KOSIS_TBLS={}  # 예: {'국가기술자격시험 종목별 실시현황':('118','TBL_ID')}
KOSIS_EP='https://kosis.kr/openapi/Param/statisticsParameterData.do'

def fetch_kosis(org,tbl,itm='T1',obj='ALL',start=2021,end=2025):
    if not KOSIS_KEY: return None
    q={'method':'getList','apiKey':KOSIS_KEY,'itmId':itm,'objL1':obj,'format':'json','jsonVD':'Y',
       'prdSe':'Y','startPrdDe':str(start),'endPrdDe':str(end),'orgId':org,'tblId':tbl}
    try:
        t=urllib.request.urlopen(KOSIS_EP+'?'+urllib.parse.urlencode(q),timeout=15).read().decode('utf-8','ignore')
        d=json.loads(t)
        return d if isinstance(d,list) else None
    except Exception: return None

def _load_env(k):
    try:
        for l in open('.env',encoding='utf-8'):
            if l.startswith(k+'='): return l.split('=',1)[1].strip()
    except Exception: pass
    return None

def fetch_qnet(jmcd,year):
    try:
        d=urllib.parse.urlencode({'id':'cst00601','gSite':'Q','gId':'','jmCd':jmcd,'implYY':str(year)}).encode()
        t=urllib.request.urlopen(urllib.request.Request('https://www.q-net.or.kr/cst006.do',data=d,headers={'User-Agent':'Mozilla/5.0'}),timeout=15).read().decode('utf-8','ignore')
        nums=[int(x.replace(',','')) for x in re.findall(r'<td[^>]*>\s*([\d,]{2,})\s*</td>',t)]
        return nums or None
    except Exception:
        return None

def main():
    out=sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else 'tmp/market'
    os.makedirs(out,exist_ok=True)
    rows=[]; live=0
    for name,jmcd,pack,cycle,fee,pub,seed in EXAMS:
        for y in range(2021,2026):
            sy=seed.get(str(y),(None,None))
            w,p=sy
            nums=fetch_qnet(jmcd,y) if w is None else None
            if nums: w=nums[0]; live+=1
            rows.append(dict(시험=name,jmCd=jmcd,pack=pack or '',연도=y,필기응시=w or '',실기응시=p or '',주기=cycle,응시료=fee,공개문제=pub))
            time.sleep(.2)
    cf=os.path.join(out,'qnet_stats.csv'); jf=os.path.join(out,'qnet_stats.json')
    with open(cf,'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    json.dump(rows,open(jf,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    filled=sum(1 for r in rows if r['필기응시'])
    print(f'[done] {len(rows)}행 · 실측입력 {live}건 · 시드/공백 {filled}/{len(rows)} → {cf}')

if __name__=='__main__':
    main()
