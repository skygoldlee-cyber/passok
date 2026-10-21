// 자동 생성된 데이터 레지스트리 파일입니다. 수정하지 마십시오.
var DATA_REGISTRY_INSADJ = {
  "schemaVersion": 1,
  "contentYear": "2027",
  "textbookEdition": "2027",
  "generatedAt": "2026-10-21T05:07:49.967Z",
  "subjects": [
    {
      "key": "contract",
      "order": 1,
      "name": "보험계약법(상법 보험편)",
      "shortName": "보험계약법",
      "contentHash": "960bc930",
      "stats": {
        "cards": 20,
        "quizzes": 1,
        "chapters": 1,
        "sourceCards": 6,
        "sourceQuizzes": 0,
        "targetCards": 20,
        "targetQuizzes": 1
      },
      "supplement": "./data/exams/insadj/supplements/contract.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_contract"
    },
    {
      "key": "act",
      "order": 2,
      "name": "보험업법",
      "shortName": "보험업법",
      "contentHash": "98f95282",
      "stats": {
        "cards": 20,
        "quizzes": 1,
        "chapters": 1,
        "sourceCards": 8,
        "sourceQuizzes": 0,
        "targetCards": 20,
        "targetQuizzes": 1
      },
      "supplement": "./data/exams/insadj/supplements/act.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_act"
    },
    {
      "key": "theory",
      "order": 3,
      "name": "손해사정이론",
      "shortName": "손사이론",
      "contentHash": "df039cf8",
      "stats": {
        "cards": 20,
        "quizzes": 1,
        "chapters": 1,
        "sourceCards": 16,
        "sourceQuizzes": 2,
        "targetCards": 20,
        "targetQuizzes": 1
      },
      "supplement": "./data/exams/insadj/supplements/theory.js",
      "supplementGlobal": "STUDY_SUPPLEMENT_theory"
    },
    {
      "key": "second",
      "order": 4,
      "name": "2차 준비(법령·기준 참고)",
      "shortName": "2차 참고",
      "contentHash": "769653a9",
      "stats": {
        "cards": 5,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 5,
        "sourceQuizzes": 0,
        "targetCards": 5,
        "targetQuizzes": 0
      }
    },
    {
      "key": "prop",
      "order": 5,
      "name": "2차 재물 (회계원리·해상보험·책임화재기술)",
      "shortName": "2차 재물",
      "contentHash": "26bf1eeb",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 13,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "vehicle",
      "order": 6,
      "name": "2차 차량 (자동차보험 대물·차손·구조정비)",
      "shortName": "2차 차량",
      "contentHash": "505f713e",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 7,
        "sourceQuizzes": 0,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    },
    {
      "key": "bodily",
      "order": 7,
      "name": "2차 신체 (의학·책임근재보·제3보험·자동차 대인)",
      "shortName": "2차 신체",
      "contentHash": "77cc4e86",
      "stats": {
        "cards": 0,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 10,
        "sourceQuizzes": 1,
        "targetCards": 0,
        "targetQuizzes": 0
      }
    }
  ],
  "exams": [
    {
      "key": "subject1",
      "subject": "contract",
      "part": 1,
      "title": "보험계약법",
      "file": "과목1_문제은행.md",
      "bundle": "./data/exams/insadj/exams/subject1.e5f48873.js",
      "global": "EXAM_DATA_subject1",
      "contentHash": "e5f48873",
      "stats": {
        "questions": 16
      }
    },
    {
      "key": "subject2",
      "subject": "act",
      "part": 2,
      "title": "보험업법",
      "file": "과목2_문제은행.md",
      "bundle": "./data/exams/insadj/exams/subject2.ff58fbdf.js",
      "global": "EXAM_DATA_subject2",
      "contentHash": "ff58fbdf",
      "stats": {
        "questions": 16
      }
    },
    {
      "key": "subject3",
      "subject": "theory",
      "part": 3,
      "title": "손해사정이론",
      "file": "과목3_문제은행.md",
      "bundle": "./data/exams/insadj/exams/subject3.ce6c5cf7.js",
      "global": "EXAM_DATA_subject3",
      "contentHash": "ce6c5cf7",
      "stats": {
        "questions": 16
      }
    },
    {
      "key": "subject4",
      "subject": "second",
      "part": 4,
      "title": "2차 준비 참고",
      "file": "과목4_참고.md",
      "bundle": "./data/exams/insadj/exams/subject4.67e84158.js",
      "global": "EXAM_DATA_subject4",
      "contentHash": "67e84158",
      "stats": {
        "questions": 4
      }
    }
  ],
  "written": [],
  "integratedExam": {
    "questionsPerSubject": {
      "contract": 40,
      "act": 40,
      "theory": 40
    },
    "examTimeMin": 120,
    "passAverage": 60,
    "subjectFailBelow": 40
  },
  "uiText": {}
};
if (typeof window !== 'undefined') {
  window.DATA_REGISTRY_INSADJ = DATA_REGISTRY_INSADJ;
}
