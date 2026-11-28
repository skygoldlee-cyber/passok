# 서사 오디오·보이스 웹툰 설계 — 멀티보이스 TTS + 말풍선 음성 동기

> 상위 문서: `../ARCHITECTURE.md` (전체 구조) · `../runbooks/AUDIO_HOSTING_GUIDE.md` (오디오 자산 호스팅) · `AVATAR_LECTURE_DESIGN.md` (DOC-DSN-59, 아바타 표현층) · `AI_AUTHORING_DESIGN.md` (제작 검수 경로)
> **문서 ID**: DOC-DSN-60
> **범위**: platform · 판본: none
> **관련 SPEC ID**: `SO-01~10`(신규 제안 — 본 문서 §9) · `AO-01~06`(오디오북 자산·플레이어 재사용) · `AV-08/AV-09`(아바타 콘텐츠 연계) · `AI-29`(무표시 계약) · `AI-30`(구조화 입력) · `CQ-07`(AI 산출물 게이트) · `ROAD-P0`(Pro 안내 계층)
> **상태**: 설계안 (미구현 — 승인 후 §10 단계 순서로 구현. SPEC.md에 SO-01~10 로드맵 행 등록됨)

## 1. 배경·목표

cosmetic 시험에는 교재 전체를 단일 음성(Google TTS)으로 낭독한 약 11시간의 오디오북 자산이 있다 — 그러나 표·조문·인용 구조가 섞인 교재 원문의 기계 낭독은 청취 학습 경험으로 부적합하며, `features.audiobook`은 현재 `false`로 비활성 상태다.

한편 교재에는 "말하기 위해 쓰인" 자산이 이미 존재한다 — 서사 패치(`교재/<subj>/story/*_서사.md` → `build:story`가 `*_이야기형.md`의 `story:start~end` 블록으로 방출)는 민수·지연 대화체 서사이고, carework에는 `webtoon-render.js`가 이를 화자별 말풍선으로 렌더하는 웹툰 뷰가 있다.

본 문서는 오디오 전략을 **"교재 낭독"에서 "서사 음성화"로 전환**하는 설계를 확정한다: Phase A 서사 멀티보이스 오디오 → Phase B 보이스 웹툰. 아바타 강의(DOC-DSN-59)의 콘텐츠 소스도 이 결정에 따라 "기존 전문 낭독"이 아닌 "요약 강의 대본(AV-08)"으로 교체한다.

## 2. 결정 요약

- **Phase A — 서사 멀티보이스 오디오(채택)**: `story:start` 비트 → 화자 태깅 → 화자별 음성 합성 → 씬 MP3 → `audio_manifest` `story` 트랙 → 리더 트랙 선택. §5
- **Phase B — 보이스 웹툰(후속)**: `webtoon.json` 화자 `voiceId` → 비트 클립을 말풍선 표시 시점에 재생. Phase A의 세그먼트 자산·캐스팅 맵을 그대로 재사용. §6
- **TTS 엔진 — Edge-TTS(채택)**: 무료·한국어 신경망 음성 10종+로 다중 캐스팅 가능. ElevenLabs는 비용 발생으로 기각. §4
- **아바타 연계 교체**: 전문 낭독 위 아바타는 "11시간 읽어주는 얼굴"이라 가치 없음 — 아바타 콘텐츠는 AV-08 요약 대본 경로로 한정. 표준형 낭독은 "전문 낭독" 옵션으로 격하 유지. §7
- **유료 게이트**: `feature-plan.json story_audio`/`voice_webtoon: "pro"` — audiobook과 동일 soft gate(SO-09).

## 3. 기존 자산 재사용 점검

| 자산 | 위치 | 재사용 방식 |
|---|---|---|
| 서사 패치 | `content/exams/<id>/교재/<subj>/story/*_서사.md` | `@insert slot` 지시 → `build:story` 산출물 `*_이야기형.md`의 `story:start~end` 블록. 표·조문 없는 대화체 — 음성 원고 변환 불필요 |
| 화자 추정 로직 | `src/reader/webtoon-render.js` `parseStorySlots`·`whoSays`·`SPEAKER_NAMES` | 비트 분류(title/line/scene/speaker)·화자 추정 규칙이 이미 존재 — 빌드타임 태깅기로 이식(Python 포트 또는 Node 기반 생성기) |
| 오디오 파이프라인 | `ref-pipeline/audiobook/` | `md_chunker`·`script_polisher`·`mp3_merger` 재사용 — TTS 엔진만 신규 모듈로 교체 |
| 오디오 매니페스트·호스팅 | `data/audio_manifest.js` · `AUDIO_HOSTING_GUIDE.md` | `AUDIO_MANIFEST[exam][subj]` 구조·`getAudioUrl()` 외부 변환 패턴 상속 — story 트랙만 추가 |
| 리더 플레이어 | `src/views/reader/reader-audio.js` | 재생·속도·이어듣기·자동스크롤 전부 재사용 — 트랙 개념만 얹음 |
| 웹툰 뷰·캐릭터 맵 | `care-webtoon.js` · `assets/webtoon.json` · `care-webtoon.html` | 화자 키→name/side/img 맵이 존재 — `voiceId` 필드 추가로 음성 캐스팅과 통합 |
| Pro 게이트 | `feature-plan.json` `audiobook`·`story_textbook` | soft gate(배지+1회 안내) 선례 그대로 |

## 4. TTS 엔진 선택

| 엔진 | 음질 | 한국어 음성 수 | 비용 | 리스크·라이선스 | 판정 |
|---|---|---|---|---|---|
| ElevenLabs | 최상 | 다수 | **유료(문자당 과금)** | — | 기각 — 비용 |
| **Edge-TTS** | 신경망급(자연스러움) | **10종+** (ko-KR-SunHi/InJoon/Hyunsu/BongJin/GookMin/JiMin/SeoHyeon/SoonBok/YuJinNeural 등) | 무료 | 비공식 API — 엔드포인트 변경 가능 | **채택** |
| gTTS (현재 11h 사용) | 기계음 | 1종 | 무료 | 비공식 — 선례 있음 | 폴백 |
| Piper TTS (로컬) | 양호 | 1~3종 | 무료·오프라인 | ToS 리스크 0 — 캐스팅 빈약 | 보조 후보 |
| SpeechSynthesis | OS 음성 의존 | OS별 상이 | 무료 | 브라우저 내장 — mp3 자산 생성 불가 | 런타임 전용 경로(개인화 오디오)로 별도 검토 |
| Coqui XTTS v2 | 높음 | 보이스 클로닝 | 무료 | **비상업 라이선스** — Pro 유료 판매와 충돌 | 기각 |

### 4.1 Edge-TTS 채택 근거·리스크 대응

- **다중 캐스팅**: 음성 10종+로 시험별 3~4인 캐스팅이 충분 — 남/여·연령감 구분 가능 (예: 내레이터 `ko-KR-HyunsuNeural`, 민수 `ko-KR-InJoonNeural`, 지연 `ko-KR-SunHiNeural`)
- **비공식 API 리스크(SO-10)**: gTTS 선례와 동형 — **자산은 1회 생성 → GitHub Releases 외부 호스팅으로 박아두는 원칙**(기존 audio_manifest 패턴 그대로)이라 엔진이 사망해도 운영 자산은 무영향. 신규 생성만 대체 엔진(Piper→gTTS→유료 전환 순)으로 스왑
- **통제 지점**: `rate`/`pitch`/`volume` 파라미터로 같은 음성 내 톤 변화·내레이터 대비 화자 구분 강화 가능

## 5. Phase A — 서사 멀티보이스 오디오

### 5.1 제작 파이프라인

```
*_이야기형.md → story:start 블록 추출 → 비트 파싱(title/line/scene)
  → 화자 태깅(규칙 → 불확실 비트 검수 목록 → speaker_map 오버라이드)
  → 캐스팅 맵(voice_cast.json) 조회 → 비트별 Edge-TTS 합성
  → 씬 단위 병합(mp3_merger) → audiobook/story/<subj>/ch<NN>_s<NN>.mp3
  → build_audio_manifest.js → AUDIO_MANIFEST[exam][subj][chapter].story
```

- **화자 태깅(SO-02)**: `webtoon-render.js`의 `SPEAKER_NAMES`(화자명 단독 줄)+`whoSays`(호칭 키워드·직전 화자 교대) 규칙을 빌드타임으로 이식. 단 웹툰은 오귀속이 버블 위치 오류에 그치지만 오디오는 **틀린 목소리**라 비용이 큼 — ① 규칙으로 확정 불가한 비트는 `confidence` 표시해 검수 목록 산출 ② `speaker_map.json` 오버라이드 테이블로 사람이 정정 ③ 장기적으로 서사 원본에 명시 화자 라벨(화자명 단독 줄 — 파서가 이미 인식)을 보강해 규칙 커버리지 확대
- **캐스팅 맵(SO-07)**: `content/exams/<id>/assets/voice_cast.json`
  ```json
  {
    "narrator": { "name": "해설", "voiceId": "ko-KR-HyunsuNeural", "rate": "+0%" },
    "minsu":    { "name": "민수", "voiceId": "ko-KR-InJoonNeural" },
    "jiyeon":   { "name": "지연", "voiceId": "ko-KR-SunHiNeural" }
  }
  ```
  화자 키 네임스페이스는 webtoon.json과 공용 — Phase B에서 `webtoon.json` 캐릭터에 `voiceId`를 얹거나 본 맵을 단일 원본으로 통합(구현 시 결정)
- **세그먼트·병합(SO-04)**: 비트 → 개별 음성 세그먼트 → 씬 단위 병합 MP3(비트 클립은 Phase B가 재사용하도록 중간 산출물로 보관). 장면 전환에 짧은 무음·효과음은 선택 사양
- **엔진 계층(SO-03)**: `ref-pipeline/audiobook/tts_edgetts.py` 신규 — `tts_google_direct.py`/`tts_elevenlabs.py`와 동형 인터페이스(text→mp3). `pip install edge-tts`

### 5.2 매니페스트·재생

- **매니페스트(SO-04)**: `AUDIO_MANIFEST[exam][subj][chapter]`를 `{ standard: '<path>', story: ['<scene1>', ...] }` 형태로 확장 또는 `story` 트랙 필드 병기 — 기존 표준형 경로와 병존. 커버리지 검증(AO-06)은 story 트랙에도 연장
- **플레이어(SO-05)**: `reader-audio.js`에 트랙 선택(전문 낭독 / 이야기 듣기). 이어듣기 저장 키에 트랙을 포함해 위치 격리 — 서사는 씬 단위라 진행 위치 단위가 달라야 함
- **무표시 계약(SO-01)**: `features.storyAudio` 거짓이거나 story 트랙 없음 → 트랙 선택 UI 미렌더. 표준형 낭독만 있으면 기존 UI 그대로
- **진입 위치**: 이야기형 리더에서 story 블록 단위로 "🔊 이 씬 듣기" 앵커도 고려 — 전체 트랙 재생과 병행(상세는 구현 시 UX 결정)

## 6. Phase B — 보이스 웹툰

- **캐스팅 연결**: `webtoon.json` 캐릭터(미영·선임·어르신)에 `voiceId` 부여 — Phase A 캐스팅 맵과 동일 원본
- **동기 재생(SO-06)**: `parseStorySlots` 비트(`line`)마다 대응 클립을 말풍선 표시 시점에 재생. 자동진행 모드는 `ended` 이벤트 → 다음 컷 연쇄 진행; 수동 모드는 버블 표시 시 클립 재생
- **자산 재사용**: Phase A의 비트 세그먼트를 그대로 사용 — 웹툰 전용 재합성 없음. 같은 서사 소스를 시각(웹툰)·청각(음성) 두 채널로 렌더하는 구조
- **컨트롤**: 🔊 음소거 토글(시험 스코프 저장), 클립 없는 비트는 무음 스킵, 재생 중 컷 이동 시 클립 즉시 중단
- **대상 시험**: carework 우선(웹툰 뷰 존재). cosmetic 이야기형에 웹툰 뷰 확장은 별도 과제

## 7. 아바타·전문 낭독 연계 교체

- **AV-08 콘텐츠 소스 교체**: DOC-DSN-59 Phase 0는 "기존 오디오북 재생 위 아바타"를 전제했으나, 본 결정으로 아바타의 콘텐츠 소스는 **요약 강의 대본(AV-08 경로)**으로 교체한다 — 3~5분 말하기용 원고에 아바타를 얹는 것이 "AI 아바타 강의"의 정합 형태. AV 문서의 Phase 0 전제 문구는 착수 시 갱신 대상
- **전문 낭독 격하**: 기존 11시간 표준형 낭독 자산은 폐기하지 않고 "전문 낭독" 트랙으로 유지 — 신규 투자 없이 보존 옵션
- **서사 오디오 + 아바타 조합**: 서사 오디오 위에 아바타 오버레이(AV-02)를 얹는 것도 기술적으로 동일 — 단 다중 화자에 단일 아바타는 어색하므로 아바타 결합은 요약 강의 음성에 한정 권장

## 8. 안전·품질·규약 정합

| 항목 | 정합 대상 |
|---|---|
| 화자 오귀속 품질 | SO-02 검수 목록 + `speaker_map` 오버라이드 — 규칙 불확실 비트는 무조건 사람 확인 경유. 1씬 파일럿 청취 검수 후 전량 생성 |
| 엔진 ToS 리스크 | 비공식 무료 API — 자산 1회 생성·외부 호스팅 원칙으로 런타임 무영향화(SO-10), 엔진 플러그인 계층으로 스왑 경로 확보 |
| 무표시·폴백 | AI-29 계약 — 자산·플래그 없으면 UI 비노출. 클립 로드 실패 비트는 무음 진행(웹툰)·트랙 미노출(리더) |
| 접근성 | 오디오는 원문 텍스트의 대체 수단(A-09 연장) — 보이스 웹툰의 학습 대체재는 말풍선 텍스트 자체. `prefers-reduced-motion`은 음성에 영향 없음 |
| 유료 게이팅·표기 | `feature-plan.json story_audio`/`voice_webtoon: "pro"` + `data-pro-feature` 배지 + `proFeatureNotice` 1회 안내(ROAD-P0). PLAN_TERMS(check:terms) 준수 |
| 저작권 | TTS 벤더 음성 출력물 사용권은 상업 이용 가능 범위 확인 후 생성(Edge TTS 출력물의 재배포 조건은 착수 시 벤더 약관 재확인) — 캐릭터 IP는 기존 자체 SVG와 무관 |

## 9. 신규 SPEC ID 제안

| ID | 내용 |
|----|------|
| SO-01 | **서사 오디오 피처 게이트·무표시 계약** — `features.storyAudio`·`features.voiceWebtoon` 시험별 온보딩, 자산·플래그 부재·로드 실패 시 UI 미렌더 |
| SO-02 | **화자 태깅 파이프라인** — `story:start` 비트 파싱·화자 부여(SPEAKER_NAMES·whoSays 규칙 이식), 불확실 비트 검수 목록·`speaker_map` 오버라이드 |
| SO-03 | **멀티보이스 TTS 엔진 계층** — 캐스팅 맵 `voiceId`·rate·pitch 매핑, 엔진 플러그인(`tts_edgetts.py` 신규, google_direct·elevenlabs 동형) |
| SO-04 | **서사 오디오 자산·매니페스트** — 씬 MP3 병합·`audiobook/story/<subj>/` 경로, `AUDIO_MANIFEST` `story` 트랙 방출·커버리지 검증(AO-06 연장) |
| SO-05 | **리더 트랙 선택** — "전문 낭독/이야기 듣기" 전환 UI, `reader-audio.js` 재사용·이어듣기 트랙별 격리 |
| SO-06 | **보이스 웹툰 음성 동기** — `voiceId` 화자별 클립을 말풍선 표시 시점에 재생, 자동진행 연동·음소거 토글·클립 없는 비트 무음 |
| SO-07 | **시험별 캐스팅 맵** — `voice_cast.json`(화자 키→표시명·voiceId·rate·pitch), webtoon.json과 화자 키 네임스페이스 공용 |
| SO-08 | **계측** — `story_audio` 재생·트랙 전환·완료율, `voice_webtoon` 클립 재생·음소거 이벤트 (내용 미수집) |
| SO-09 | **Pro 게이팅** — `feature-plan.json story_audio`·`voice_webtoon: "pro"` + `data-pro-feature` 배지 + `proFeatureNotice` 1회 안내(ROAD-P0 soft gate), `story_textbook` 경계와 정합 |
| SO-10 | **엔진 리스크 대응** — 엔드포인트 변경·차단 시 자산 외부 호스팅 보존(런타임 무영향), 대체 엔진 스왑(Piper·gTTS·유료), 자산 1회 생성 원칙 |

## 10. 단계별 작업·검증

**Phase A 작업 순서**: ① 화자 태깅기(비트 파싱+규칙+검수 목록) → ② `voice_cast.json` + `tts_edgetts.py` → ③ 1씬 파일럿 합성 → 청취 검수 → ④ 전량 생성 + manifest `story` 트랙 → ⑤ 리더 트랙 선택 → ⑥ cosmetic 1과목 파일럿 온보딩.

**Phase B 작업 순서**(Phase A 검수 후): ⑦ webtoon.json voiceId + 클립 재생 모듈 → ⑧ 자동진행·토글 → ⑨ carework 웹툰 온보딩.

**검증**:
- 유닛: 화자 태깅 규칙(라벨·호칭·교대 폴백)·캐스팅 맵 해석·manifest story 트랙 방출 — 기존 `care-webtoon.test.js`의 `_parse`/`_who` 케이스 재사용 가능
- 검수: 불확실 비트 목록 0건 수렴 + 파일럿 씬 청취 검수 — 검수 완료 전 전량 생성 금지
- DOM: 트랙 선택 렌더·토글·무표시 계약, 웹툰 음소거·클립 매핑
- E2E: 리더 트랙 전환·이어듣기 격리 (오디오 소스는 mock/로컬), 웹툰 컷 이동 시 클립 중단
- 게이트: `check:imports`·`check:terms`·AO-06 연장 커버리지

## 11. 범위 경계

- **제외 — 표준형 교재 재낭독**: 기존 11h 자산은 "전문 낭독"으로 보존만 — 추가 생성·품질 개선 투자 없음
- **제외 — 실시간/대화형 음성**: 런타임 TTS 튜터·음성 대화는 AL-15(스트리밍 튜터) 영역
- **제외 — SpeechSynthesis 런타임 자산화**: 브라우저 내장 TTS는 자산 생성에 쓰지 않음 — 개인화 오디오(오답 브리핑 등) 경로로 별도 검토
- **제외 — 웹툰 뷰 전 시험 확장**: Phase B는 carework 한정 — 다른 시험의 웹툰 뷰 확장은 별도 과제
- **제외 — 음성 클로닝·성우 녹음**: 비상업 라이선스 충돌(XTTS)·비용(녹음)으로 범위 밖
