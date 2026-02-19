# emoji master

AI 기반 이모티콘 팩 제작 올인원 도구입니다. 캐릭터 컨셉만 입력하면 AI 전문가 패널이 전략을 수립하고, 45개 스티커를 자동 생성하며, 배경 제거/아웃라인/메타데이터까지 한 번에 처리합니다.

**웹 브라우저**, **데스크톱 앱(Electron)**, **CLI(macOS)** 모두 지원합니다.

---

## 빠른 시작

### 사전 준비

- **Node.js** 18 이상
- **npm** 9 이상
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 웹 버전 실행
npm run dev:web

# 데스크톱 버전 실행
npm run dev:electron

# CLI 실행 (macOS)
npm run dev:cli -- config set-key <GEMINI_API_KEY>
npm run dev:cli -- generate -c "귀여운 고양이" --auto
```

- 웹: 브라우저에서 `http://localhost:5173`을 열면 API Key 입력 화면이 나타납니다.
- CLI: 터미널에서 바로 실행하거나, AI 에이전트(OpenClaw 등)로 자동화할 수 있습니다.

### Gemini API Key 발급

1. [Google AI Studio](https://aistudio.google.com/apikey)에 접속
2. **Create API Key** 클릭
3. 발급된 키(`AIza...`)를 앱의 모달에 붙여넣기
4. **Save & Continue** 클릭

> 키는 로컬에만 저장됩니다 (웹: localStorage, 데스크톱: OS 키체인). 서버로 전송되지 않습니다.

---

## 워크플로우

Emoticon Studio는 **7단계 파이프라인**으로 동작합니다.

```
1. 입력 → 2. AI 전략 → 3. 캐릭터 생성 → 4. 스티커 일괄 생성
                                                   ↓
          7. 내보내기 ← 6. 메타데이터 ← 5. 후처리
```

| 단계 | 설명 |
|------|------|
| **1. 입력** | 캐릭터 컨셉 텍스트 입력, 참조 이미지 첨부(선택), 타깃 언어 선택 |
| **2. AI 전략** | 4명의 AI 전문가(시장 분석가, 아트 디렉터, 문화 전문가, 크리에이티브 디렉터)가 순차 분석 |
| **3. 캐릭터 생성** | AI가 베이스 캐릭터를 생성하고 스타일 변환. 마음에 들지 않으면 재생성 가능 |
| **4. 스티커 생성** | 45개 이모트 아이디어 자동 생성 후 3개씩 병렬로 이미지 생성 (약 15~25분) |
| **5. 후처리** | 배경 제거(Sobel 에지 검출 + 플러드 필), 아웃라인 추가(두께/불투명도 조절) |
| **6. 메타데이터** | 플랫폼 등록용 제목/설명/태그를 3가지 옵션으로 자동 생성 (다국어 지원) |
| **7. 내보내기** | 플랫폼별 규격(OGQ, LINE Sticker, LINE Emoji)에 맞춰 ZIP 다운로드 |

### 후처리 전용 모드

이미 만들어둔 이모티콘이 있다면 생성 과정을 건너뛸 수 있습니다.

1. 기존 이미지(PNG/JPG) 또는 ZIP 업로드 (최대 120장)
2. 배경 제거, 아웃라인 적용
3. 메타데이터 생성 → 내보내기

---

## 지원 플랫폼

| 플랫폼 | 스티커 크기 | 포함 파일 |
|--------|-----------|----------|
| OGQ Sticker | 740 x 640 | tab.png + main.png + 스티커 |
| LINE Sticker | 370 x 320 | tab.png + main.png + 스티커 |
| LINE Emoji | 180 x 180 | tab.png + 스티커 |

---

## 프로젝트 구조

npm workspaces 기반 모노레포로 구성되어 있습니다.

```
emoji_master/
├── packages/
│   ├── shared/          # 공통 코드 (서비스, 타입, 상수, 상태관리)
│   ├── web/             # 웹 SPA (Vite)
│   ├── electron/        # 데스크톱 앱 (Electron)
│   └── cli/             # CLI 도구 (Commander + Sharp)
├── docs/                # 프로젝트 문서
├── .github/workflows/   # CI/CD
└── package.json         # 모노레포 루트
```

| 패키지 | 설명 |
|--------|------|
| **@emoji/shared** | React 컴포넌트, Gemini AI 서비스, 이미지 처리, Zustand 스토어 등 공통 코드 |
| **@emoji/web** | 웹 브라우저용 SPA. shared 패키지를 임포트하여 Vite로 빌드 |
| **@emoji/electron** | 데스크톱 앱. 네이티브 파일 다이얼로그, OS 키체인, 자동 업데이트 지원 |
| **@emoji/cli** | macOS CLI 도구. Sharp 기반 이미지 처리, NDJSON 프로토콜로 AI 에이전트 연동 |

각 패키지의 상세 내용은 개별 README를 참고하세요:
- [packages/web/README.md](./packages/web/README.md)
- [packages/electron/README.md](./packages/electron/README.md)
- [packages/cli/README.md](./packages/cli/README.md)

---

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev:web` | 웹 개발 서버 (http://localhost:5173) |
| `npm run dev:electron` | Electron 개발 모드 |
| `npm run dev:cli -- <args>` | CLI 개발 모드 (tsx) |
| `npm run build:web` | 웹 프로덕션 빌드 |
| `npm run build:electron` | Electron 프로덕션 빌드 |
| `npm run build:cli` | CLI 프로덕션 빌드 (tsup) |
| `npm run test` | 전체 테스트 (web + electron) |
| `npm run test:e2e` | 웹 E2E 테스트 (Playwright) |
| `npm run test:e2e:electron` | Electron E2E 테스트 |
| `npm run lint` | ESLint 검사 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 19, TypeScript 5.8 |
| 빌드 | Vite 6, electron-vite 5 |
| 스타일 | Tailwind CSS 4 (CSS-first) |
| 상태관리 | Zustand 5 |
| AI | Google Gemini (gemini-3-pro-preview, gemini-3-pro-image-preview) |
| 이미지 처리 | Canvas API (웹/Electron), Sharp (CLI) |
| 내보내기 | JSZip |
| 데스크톱 | Electron 40, electron-builder 26 |
| CLI | Commander 13, Sharp 0.33, tsup 8 |
| 테스트 | Vitest 3, Testing Library, Playwright |

---

## LLM 에이전트 연동

### 웹 (Browser API)

`window.emoticon` API를 통해 브라우저에서 자동 조작할 수 있습니다.

```javascript
await window.emoticon.setApiKey('AIza...');
const jobId = await window.emoticon.runFullPipeline(
  { concept: '귀여운 분홍색 햄스터', language: 'Korean' },
  'line_sticker'
);
window.emoticon.subscribe(jobId, (progress) => {
  console.log(`${progress.stage}: ${progress.current}/${progress.total}`);
});
```

### CLI (NDJSON 프로토콜)

CLI는 `--json` 플래그로 AI 에이전트가 프로그래밍 방식으로 제어할 수 있습니다.

```bash
# 완전 자동 실행
emoji-cli generate -c "귀여운 고양이" --json --auto

# 에이전트가 컨펌 제어
emoji-cli generate -c "귀여운 고양이" --json
# stdout으로 {"type":"confirm",...} 수신 → stdin으로 {"action":"approve"} 응답
```

자세한 프로토콜 명세는 [packages/cli/README.md](./packages/cli/README.md#ai-에이전트-연동-ndjson-프로토콜)를 참고하세요.

---

## 보안 참고사항

- Gemini API Key는 로컬에만 저장됩니다 (웹: localStorage, 데스크톱: OS 키체인, CLI: `~/.emoji-master/config.json`)
- 서버가 없는 클라이언트 전용 앱이므로 키가 외부로 전송되지 않습니다
- 개인용 도구로 설계되었습니다 — 공개 배포 시 API Key 노출에 주의하세요

---

## 라이선스

Private
