// 자동 생성된 데이터 레지스트리 파일입니다. 수정하지 마십시오.
var DATA_REGISTRY_ADMAGENT = {
  "schemaVersion": 1,
  "contentYear": "2027",
  "textbookEdition": "2027",
  "generatedAt": "2026-10-21T11:21:52.083Z",
  "subjects": [
    {
      "key": "civGen",
      "order": 1,
      "name": "민법(총칙)",
      "shortName": "민법총칙",
      "contentHash": "1acf033b",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "admLaw",
      "order": 2,
      "name": "행정법",
      "shortName": "행정법",
      "contentHash": "134a5c27",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "admSci",
      "order": 3,
      "name": "행정학개론(지방자치행정 포함)",
      "shortName": "행정학",
      "contentHash": "fe9b3c36",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "civContract",
      "order": 4,
      "name": "민법(계약) — 2차",
      "shortName": "민법계약",
      "contentHash": "f6c4e560",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "admProc",
      "order": 5,
      "name": "행정절차론(행정절차법 포함) — 2차",
      "shortName": "행정절차론",
      "contentHash": "ad0f6400",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "officeMgmt",
      "order": 6,
      "name": "사무관리론 — 2차",
      "shortName": "사무관리론",
      "contentHash": "00028f6c",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "admPractice",
      "order": 7,
      "name": "행정사실무법 — 2차",
      "shortName": "실무법",
      "contentHash": "550a9f2a",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 0,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    }
  ],
  "exams": [
    {
      "key": "subject1",
      "subject": "civGen",
      "part": 1,
      "title": "민법(총칙)",
      "file": "과목1_문제은행.md",
      "bundle": "./data/exams/admagent/exams/subject1.cead8bfc.js",
      "global": "EXAM_DATA_subject1",
      "contentHash": "cead8bfc",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject2",
      "subject": "admLaw",
      "part": 2,
      "title": "행정법",
      "file": "과목2_문제은행.md",
      "bundle": "./data/exams/admagent/exams/subject2.cc759271.js",
      "global": "EXAM_DATA_subject2",
      "contentHash": "cc759271",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject3",
      "subject": "admSci",
      "part": 3,
      "title": "행정학개론",
      "file": "과목3_문제은행.md",
      "bundle": "./data/exams/admagent/exams/subject3.c2fa7ba7.js",
      "global": "EXAM_DATA_subject3",
      "contentHash": "c2fa7ba7",
      "stats": {
        "questions": 8
      }
    }
  ],
  "written": [],
  "integratedExam": {
    "questionsPerSubject": {
      "civGen": 25,
      "admLaw": 25,
      "admSci": 25
    },
    "examTimeMin": 75,
    "passAverage": 60,
    "subjectFailBelow": 40
  },
  "uiText": {
    "dictionary": {
      "title": "지식DB 사전",
      "subtitle": "엔티티 검색 (manifest.knowledge 스키마 필요)"
    }
  }
};
if (typeof window !== 'undefined') {
  window.DATA_REGISTRY_ADMAGENT = DATA_REGISTRY_ADMAGENT;
}
