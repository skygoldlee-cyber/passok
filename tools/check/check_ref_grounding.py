# -*- coding: utf-8 -*-
# @spec none
"""
check_ref_grounding.py — 교재 수험 포인트 절의 조문·수치를 참조 ref 파일과 대조.

용도: 법규 교재 생성 후 '법 제N조 / 영 제N조 / 규칙 제N조 / 별표N' 인용이
대응 참조 파일 본문에 실제 존재하는지 자동 검증. 수치는 별표 본문이 ref에
미수록인 경우 경고(WARN)로만 보고하고, 조문 번호 불일치는 FAIL.

사용: python tools/check/check_ref_grounding.py <교재 md> --refs <ref_md/과목N>
"""
import re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REF_MAP = {  # 교재 인용 접두 → ref 파일명 패턴
    "법": None,      # 챕터별 법률 파일 (컨텍스트 필요) — 수험 절의 출처 링크로 해석
    "영": "시행령",
    "규칙": "시행규칙",
}

def load(path):
    return Path(path).read_text(encoding="utf-8")

def find_sections(text):
    """'#### 수험 포인트' ~ 다음 '---' 범위와 챕터(법률)명을 반환."""
    secs = []
    for m in re.finditer(r"#### 수험 포인트", text):
        st = m.start()
        en = text.find("\n---", st)
        en = len(text) if en < 0 else en
        head = text[:st]
        ch = re.findall(r"## 📚 Chapter \d+\. (.+)", head)
        secs.append((ch[-1] if ch else "?", text[st:en]))
    return secs

def resolve_refs(chapter, refdir):
    """챕터명으로 대응 법률·시행령·시행규칙 ref 본문을 찾는다."""
    key = chapter.replace("(법률)", "").strip()
    files = {p.stem: load(p) for p in Path(refdir).rglob("*.md")}
    cand = [n for n in files if key in n]  # 정확 일치 우선
    if not cand:
        cand = [n for n in files if key[:8] in n or key.split(" ")[0][:8] in n]
    out = {"법": None, "영": None, "규칙": None}
    for name in cand:
        body = files[name]
        if "시행령" in name: out["영"] = body
        elif "시행규칙" in name: out["규칙"] = body
        else: out["법"] = body
    return out

def article_pat(n):  # 제N조 인용 → 원문 표기 허용형
    return re.compile(rf"제{n}조(?=[\(\s]|$|의)")

_KDIG = "영일이삼사오육칠팔구"
def kor_num(v):
    """3500→3천5백 / 450→4백50 / 20→20 유지 — 법령 한글 수치 표기 변형 목록."""
    out = set()
    try: n = int(v)
    except ValueError: return out
    if n >= 1000:
        c = n // 1000; r = n % 1000
        s = f"{c}천" if c > 1 else "천"
        if r >= 100:
            b = r // 100; s += f"{b}백" if b > 1 else "백"; r %= 100
        if r: s += str(r)
        out.add(s); out.add(f"{c}천" if r == 0 else s)
    if n >= 100:
        b = n // 100; r = n % 100
        out.add((f"{b}백" if b > 1 else "백") + (str(r) if r else ""))
    if n >= 10000:
        m, r = divmod(n, 10000)
        out.add(f"{m}만" + (str(r) if r else ""))
    return out

_UNIT_ALT = {"㎡": ["㎡", "제곱미터"], "m": ["m", "미터"], "kg": ["kg", "킬로그램", "㎏"],
             "A": ["A", "암페어"], "V": ["V", "볼트"], "L": ["L", "리터", "ℓ"],
             "kV": ["kV", "킬로볼트"], "mm": ["mm", "밀리미터", "㎜"], "cm": ["cm", "센티미터", "㎝"],
             "톤": ["톤", "t"], "%": ["%", "퍼센트"], "초": ["초"], "㎥": ["㎥", "세제곱미터", "입방미터"], "㎠": ["㎠", "제곱센티미터"], "배": ["배", "배의"]}

def num_found(src, val, unit):
    try:
        cfmt = f"{int(val):,}"
    except ValueError:
        cfmt = val
    for nv in [val, cfmt] + sorted(kor_num(val)):
        for un in _UNIT_ALT.get(unit, [unit]):
            if re.search(re.escape(nv) + r"\s*" + re.escape(un), src):
                return True
    return False

def main():
    md, refs = sys.argv[1], sys.argv[sys.argv.index("--refs") + 1]
    text = load(md)
    secs = find_sections(text)
    fails, warns = [], []
    seen_warn = set()
    for ch, body in secs:
        rt = resolve_refs(ch, refs)
        cites = re.findall(r"(법|영|규칙)\s*제(\d+)(?:의(\d+))?조", body)
        for kind, n, sub in cites:
            src = rt.get(kind)
            if src is None:
                warns.append(f"[{ch}] '{kind} 제{n}조' 대응 ref 파일 없음")
                continue
            art = f"{n}의{sub}" if sub else n
            if not article_pat(art).search(src):
                fails.append(f"[{ch}] '{kind} 제{art}조' — ref 본문에 조문 번호 없음")
        # 별표 인용: '규칙 별표N'/'영 별표N'이면 해당 ref만, 무명이면 둘 다
        for km, bn in set(re.findall(r"(?:(영|규칙)\s*)?별표\s*(\d+)", body)):
            kinds = [km] if km else ["영", "규칙"]
            for kind in kinds:
                src = rt.get(kind)
                if src and not re.search(rf"별표\s*{bn}\b", src):
                    k = (ch, bn, kind)
                    if k not in seen_warn:
                        seen_warn.add(k)
                        warns.append(f"[{ch}] 별표{bn} — {kind} ref에 언급 없음(별표 본문 미수록이면 정상)")
        # 수치 토큰: 별표 본문이 없으면 검증 불가 — 본문 조문 내 존재 시만 확인
        for m2 in re.finditer(r"(?<![%\w:])(\d[\d,]*(?:\.\d+)?)\s*(㎠|㎥|㎡|m²|kV|mm|cm|만원|억원|세대|층|배|초|m|kg|톤|L|A|V|%)", body):
            num, unit = m2.group(1), m2.group(2)
            if unit == "%" and "%" in body[max(0, m2.start()-1):m2.start()]:
                continue
            val = num.replace(",", "")
            found = False
            for src in rt.values():
                if src and num_found(src, val, unit):
                    found = True; break
            if not found:
                k = (ch, num, unit)
                if k not in seen_warn:
                    seen_warn.add(k)
                    warns.append(f"[{ch}] 수치 '{num}{unit}' — ref 조문 본문 미발견(별표 본문이면 검증 불가)")
    print(f"== ref 대조: 수험 절 {len(secs)}개 ==")
    for f in fails: print("FAIL", f)
    for w in sorted(warns)[:40]: print("WARN", w)
    if len(warns) > 40: print(f"... WARN {len(warns)-40}건 생략")
    print(f"FAIL {len(fails)}건 / WARN {len(warns)}건")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
