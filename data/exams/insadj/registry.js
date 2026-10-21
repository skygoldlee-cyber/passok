// 자동 생성된 데이터 레지스트리 파일입니다. 수정하지 마십시오.
var DATA_REGISTRY_INSADJ = {
  "schemaVersion": 1,
  "contentYear": "2027",
  "textbookEdition": "2027",
  "generatedAt": "2026-10-21T03:58:17.377Z",
  "subjects": [
    {
      "key": "contract",
      "order": 1,
      "name": "보험계약법(상법 보험편)",
      "shortName": "보험계약법",
      "contentHash": "960bc930",
      "stats": {
        "cards": 9,
        "quizzes": 1,
        "chapters": 1,
        "sourceCards": 6,
        "sourceQuizzes": 0,
        "targetCards": 9,
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
      "contentHash": "59490960",
      "stats": {
        "cards": 8,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 8,
        "sourceQuizzes": 0,
        "targetCards": 8,
        "targetQuizzes": 0
      }
    },
    {
      "key": "theory",
      "order": 3,
      "name": "손해사정이론",
      "shortName": "손사이론",
      "contentHash": "6ce4d60e",
      "stats": {
        "cards": 8,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 10,
        "sourceQuizzes": 1,
        "targetCards": 8,
        "targetQuizzes": 0
      }
    },
    {
      "key": "second",
      "order": 4,
      "name": "2차 준비(법령·기준 참고)",
      "shortName": "2차 참고",
      "contentHash": "77522145",
      "stats": {
        "cards": 4,
        "quizzes": 0,
        "chapters": 1,
        "sourceCards": 5,
        "sourceQuizzes": 0,
        "targetCards": 4,
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
      "bundle": "./data/exams/insadj/exams/subject1.2af1ed40.js",
      "global": "EXAM_DATA_subject1",
      "contentHash": "2af1ed40",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject2",
      "subject": "act",
      "part": 2,
      "title": "보험업법",
      "file": "과목2_문제은행.md",
      "bundle": "./data/exams/insadj/exams/subject2.73e3066e.js",
      "global": "EXAM_DATA_subject2",
      "contentHash": "73e3066e",
      "stats": {
        "questions": 8
      }
    },
    {
      "key": "subject3",
      "subject": "theory",
      "part": 3,
      "title": "손해사정이론",
      "file": "과목3_문제은행.md",
      "bundle": "./data/exams/insadj/exams/subject3.44a6f65c.js",
      "global": "EXAM_DATA_subject3",
      "contentHash": "44a6f65c",
      "stats": {
        "questions": 8
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
