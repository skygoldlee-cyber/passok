// 자동 생성된 데이터 레지스트리 파일입니다. 수정하지 마십시오.
var DATA_REGISTRY_LOSSADJ = {
  "schemaVersion": 1,
  "contentYear": "2026",
  "textbookEdition": "2026",
  "generatedAt": "2026-10-21T11:21:51.861Z",
  "subjects": [
    {
      "key": "insurance",
      "order": 1,
      "name": "상법 보험편",
      "shortName": "상법",
      "contentHash": "b668cda2",
      "stats": {
        "cards": 13,
        "quizzes": 2,
        "chapters": 1,
        "sourceCards": 5,
        "sourceQuizzes": 0,
        "targetCards": 20,
        "targetQuizzes": 2
      },
      "supplement": "./data/exams/lossadj/supplements/insurance.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_insurance"
    },
    {
      "key": "disaster",
      "order": 2,
      "name": "농어업재해보험법령 및 손해평가요령",
      "shortName": "재해보험",
      "contentHash": "b68e2bcf",
      "stats": {
        "cards": 12,
        "quizzes": 2,
        "chapters": 1,
        "sourceCards": 4,
        "sourceQuizzes": 3,
        "targetCards": 19,
        "targetQuizzes": 2
      },
      "supplement": "./data/exams/lossadj/supplements/disaster.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_disaster"
    },
    {
      "key": "agronomy",
      "order": 3,
      "name": "농학개론(재배학·원예작물학)",
      "shortName": "농학개론",
      "contentHash": "fe3c2848",
      "stats": {
        "cards": 16,
        "quizzes": 1,
        "chapters": 1,
        "sourceCards": 8,
        "sourceQuizzes": 0,
        "targetCards": 19,
        "targetQuizzes": 1
      },
      "supplement": "./data/exams/lossadj/supplements/agronomy.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_agronomy"
    },
    {
      "key": "secondTheory",
      "order": 4,
      "name": "2차 과목1: 이론과 실무",
      "shortName": "2차이론",
      "contentHash": "7405f69d",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 19,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "secondAssessment",
      "order": 5,
      "name": "2차 과목2: 손해평가의 이론과 실무",
      "shortName": "2차손해평가",
      "contentHash": "09ae5ac9",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 22,
        "sourceQuizzes": 2,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    }
  ],
  "exams": [
    {
      "key": "subject1",
      "subject": "insurance",
      "part": 1,
      "title": "상법 보험편 (8제)",
      "file": "과목1_문제은행.md",
      "bundle": "./data/exams/lossadj/exams/subject1.72129ee3.js",
      "global": "EXAM_DATA_subject1",
      "contentHash": "72129ee3",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject2",
      "subject": "disaster",
      "part": 2,
      "title": "농어업재해보험법령 및 손해평가요령 (8제)",
      "file": "과목2_문제은행.md",
      "bundle": "./data/exams/lossadj/exams/subject2.9c5d2e5f.js",
      "global": "EXAM_DATA_subject2",
      "contentHash": "9c5d2e5f",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject3",
      "subject": "agronomy",
      "part": 3,
      "title": "농학개론(재배학·원예작물학) (8제)",
      "file": "과목3_문제은행.md",
      "bundle": "./data/exams/lossadj/exams/subject3.a8e936e6.js",
      "global": "EXAM_DATA_subject3",
      "contentHash": "a8e936e6",
      "stats": {
        "questions": 8
      }
    }
  ],
  "written": [
    {
      "key": "second",
      "title": "2차 주관식 연습 (서술·계산형)",
      "desc": "손해평가요령 별표 기반 자체 제작 문항 — 서술 입력 후 모범답안·채점기준 대조 자기채점",
      "file": "2차_주관식_연습.md",
      "stats": {
        "questions": 14
      }
    }
  ],
  "synonyms": {
    "국가법령정보센터": [
      "law.go.kr"
    ],
    "농금원": [
      "농업정책보험금융원"
    ],
    "손평사": [
      "손해평가사"
    ]
  },
  "integratedExam": {
    "questionsPerSubject": {
      "insurance": 8,
      "disaster": 8,
      "agronomy": 8
    },
    "examTimeMin": 38,
    "passAverage": 60,
    "subjectFailBelow": 40
  },
  "uiText": {
    "search": {
      "title": "교재 검색",
      "subtitle": "교재 본문과 참조자료(법령·고시)를 키워드로 함께 검색합니다.",
      "placeholder": "검색할 키워드를 입력하세요 (예: 고지의무, 손해평가사, 보험가액)"
    }
  }
};
if (typeof window !== 'undefined') {
  window.DATA_REGISTRY_LOSSADJ = DATA_REGISTRY_LOSSADJ;
}
