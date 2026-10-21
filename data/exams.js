// 자동 생성된 시험 레지스트리 번들입니다. 수정하지 마십시오.
// 원본: content/exams.json (생성: node tools/build/build_exams_list.js)
var EXAMS_LIST = {
  "schemaVersion": 1,
  "note": "시험 레지스트리 — 새 시험은 이 파일에 엔트리를 추가하고 content/exams/<id>/ + data/exams/<id>/ 구조로 콘텐츠를 배치한다 (모든 시험이 대칭 구조). data/exams.js 는 tools/build_exams_list.js가 이 파일에서 생성한다.",
  "exams": [
    {
      "id": "cosmetic",
      "name": "맞춤형화장품 조제관리사",
      "shortName": "조제관리사",
      "appName": "Passory 조제관리사",
      "title": "Passory — 맞춤형화장품 조제관리사 (Passmula)",
      "logoMain": "Passory",
      "logoSub": "조제관리사 · Passmula",
      "desc": "화장품법·제조·품질관리·안전관리·맞춤형화장품 4과목 · 문제은행 1,979문",
      "icon": "fa-solid fa-wand-magic-sparkles",
      "year": "2027",
      "theme": {
        "--color-primary": "#06b6d4",
        "--color-secondary": "#8b5cf6"
      },
      "pwaShortcuts": [
        {
          "name": "배합 계산기",
          "short_name": "배합 계산",
          "description": "Formula OS 배합 계산기로 바로 이동",
          "url": "./index.html#/formula",
          "icons": [
            {
              "src": "icons/icon-192.png",
              "sizes": "192x192",
              "type": "image/png"
            }
          ]
        }
      ],
      "default": true,
      "contentRoot": "content/exams/cosmetic",
      "dataRoot": "data/exams/cosmetic",
      "manifestPath": "content/exams/cosmetic/manifest.json",
      "registryBundle": "data/exams/cosmetic/registry.js",
      "registryGlobal": "DATA_REGISTRY",
      "features": {
        "dictionary": true,
        "calcPractice": true,
        "ingredients": true,
        "audiobook": false,
        "appendixDocs": true,
        "pomodoro": true,
        "formula": true,
        "limitsTrainer": true,
        "studyGuide": true,
        "userManual": true,
        "story_textbook": true,
        "semantic": true
      },
      "appNameEn": "Passmula"
    },
    {
      "id": "lossadj",
      "name": "손해평가사",
      "shortName": "손해평가사",
      "appName": "Passory 손해평가사",
      "title": "Passory — 농어업재해보험 손해평가사 (Passess)",
      "logoMain": "Passory",
      "logoSub": "손해평가사 · Passess",
      "desc": "농어업재해보험 손해평가사 Phase C 파일럿 — 총 5과목(1차 상법·재해보험법령·농학개론 + 2차 이론·손해평가 교재) · 문제은행 24문",
      "icon": "fa-solid fa-tractor",
      "year": "2026",
      "theme": {
        "--color-primary": "#16a34a",
        "--color-secondary": "#ca8a04"
      },
      "comingSoon": true,
      "contentRoot": "content/exams/lossadj",
      "dataRoot": "data/exams/lossadj",
      "manifestPath": "content/exams/lossadj/manifest.json",
      "registryBundle": "data/exams/lossadj/registry.js",
      "registryGlobal": "DATA_REGISTRY_LOSSADJ",
      "features": {
        "writtenPractice": true
      },
      "appNameEn": "Passess"
    },
    {
      "id": "insadj",
      "name": "손해사정사",
      "shortName": "손해사정사",
      "appName": "Passory 손해사정사",
      "title": "Passory — 손해사정사 (Passure)",
      "logoMain": "Passory",
      "logoSub": "손해사정사 · Passure",
      "desc": "손해사정사 — 7과목 파일럿(1차 보험계약법·보험업법·손해사정이론 + 2차 공통·재물·차량·신체 3종별)",
      "icon": "fa-solid fa-scale-balanced",
      "year": "2027",
      "theme": {},
      "contentRoot": "content/exams/insadj",
      "dataRoot": "data/exams/insadj",
      "manifestPath": "content/exams/insadj/manifest.json",
      "registryBundle": "data/exams/insadj/registry.js",
      "registryGlobal": "DATA_REGISTRY_INSADJ",
      "features": {},
      "comingSoon": true,
      "appNameEn": "Passure"
    },
    {
      "id": "indsafe",
      "name": "산업안전기사",
      "shortName": "산업안전기사",
      "appName": "Passory 산업안전기사",
      "title": "Passory — 산업안전기사 (Passafe)",
      "logoMain": "Passory",
      "logoSub": "산업안전기사 · Passafe",
      "desc": "산업안전기사 — 7과목 (필기 6과목 + 실기 산업안전관리 실무) · 출제기준 2024~2026 기준 자체 제작",
      "icon": "fa-solid fa-helmet-safety",
      "year": "2027",
      "theme": {},
      "contentRoot": "content/exams/indsafe",
      "dataRoot": "data/exams/indsafe",
      "manifestPath": "content/exams/indsafe/manifest.json",
      "registryBundle": "data/exams/indsafe/registry.js",
      "registryGlobal": "DATA_REGISTRY_INDSAFE",
      "features": {
        "writtenPractice": true
      },
      "comingSoon": true,
      "appNameEn": "Passafe"
    },
    {
      "id": "admagent",
      "name": "일반행정사",
      "shortName": "행정사",
      "appName": "Passory 일반행정사",
      "title": "Passory — 일반행정사 (Passmin)",
      "logoMain": "Passory",
      "logoSub": "행정사 · Passmin",
      "desc": "일반행정사 — 7과목 (1차 필기 객관식: 민법총칙·행정법·행정학개론 과목당 25개 + 2차 주관식: 민법계약·행정절차론·사무관리론·행정사실무법) · 행정사법 시행령 별표1 기준 자체 제작 · 문제은행 24문",
      "icon": "fa-solid fa-file-pen",
      "year": "2027",
      "theme": {},
      "contentRoot": "content/exams/admagent",
      "dataRoot": "data/exams/admagent",
      "manifestPath": "content/exams/admagent/manifest.json",
      "registryBundle": "data/exams/admagent/registry.js",
      "registryGlobal": "DATA_REGISTRY_ADMAGENT",
      "features": {
        "writtenPractice": true
      },
      "comingSoon": true,
      "appNameEn": "Passmin"
    }
  ]
};
if (typeof window !== 'undefined') { window.EXAMS_LIST = EXAMS_LIST; }
if (typeof module !== 'undefined' && module.exports) { module.exports = EXAMS_LIST; }
