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
    out = {"법": None, "영": None, "규칙": None}
    for name, body in files.items():
        if key in name or any(k in name for k in [key[:8], key.split(" ")[0][:8]]):
            if "시행령" in name: out["영"] = body
            elif "시행규칙" in name: out["규칙"] = body
            else: out["법"] = body
    return out

def article_pat(n):  # 제N조 인용 → 원문 표기 허용형
    return re.compile(rf"제{n}조(?=[\(\s]|$|의)")

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
        # 별표 인용은 별표 본문 미수록이므로 '별표 N' 언급 여부만 확인
        for bn in set(re.findall(r"별표\s*(\d+)", body)):
            for kind in ("영", "규칙"):
                src = rt.get(kind)
                if src and not re.search(rf"별표\s*{bn}\b", src):
                    k = (ch, bn, kind)
                    if k not in seen_warn:
                        seen_warn.add(k)
                        warns.append(f"[{ch}] 별표{bn} — {kind} ref에 언급 없음(별표 본문 미수록이면 정상)")
        # 수치 토큰: 별표 본문이 없으면 검증 불가 — 본문 조문 내 존재 시만 확인
        for tok in set(re.findall(r"(\d[\d,]*(?:\.\d+)?)\s*(㎡|m²|m|㎥|kg|톤|L|A|V|kV|mm|cm|초|㎠|배|%|세대|층|만원|억원)", body)):
            num, unit = tok
            val = num.replace(",", "")
            found = False
            for src in rt.values():
                if src and re.search(re.escape(val) + r"\s*" + re.escape(unit), src):
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
