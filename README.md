# 🍽️ 오늘 뭐 먹지? — 메뉴 월드컵

질문에 하나씩 답하면서 오늘 먹을 메뉴를 좁혀 가는 작은 웹사이트예요.

**배포 주소:** https://menuworldcup.netlify.app

## 기능

- **인트로**: "메뉴를 골라볼까요?" 글자가 통통 튀고, 위아래로 음식 띠가 흘러가요.
- **메뉴 고르기**: 질문마다 선택지(2개 이상) 중 하나를 고르며 내려가다가 메뉴에 도착하면 결과가 나와요.
  - 선택지가 2개면 `A VS B`, 3개 이상이면 버튼 목록으로 보여줘요.
  - 고르는 동안 배경에 🤔가 떠다녀요.
- **결과 화면**: 🐰와 폭죽이 빙글빙글 떨어지고, 지도 링크의 미리보기(OG) 카드가 나와요.
- **결과 공유**: 폰에서는 공유창(카카오톡 등), PC에서는 링크 복사.
- **관리 화면 (이스터에그)**: 제목의 🍽️를 1.5초 안에 5번 누르고 암호를 입력하면 들어갈 수 있어요.
  - **월드컵 목록**: 여러 버전의 월드컵을 저장해 두고 만들기/복제/수정/삭제할 수 있어요. **활성화한 1개만** 사이트에 나와요.
    - 활성 월드컵은 다른 걸 먼저 활성화해야 지울 수 있어요.
    - 비활성 월드컵의 공유 링크는 "없어진 링크"로 안내돼요.
  - 질문, 선택지, 메뉴(이름 + 지도 URL)를 트리 형태로 추가하고 수정해요.
  - 저장하기 전에 빈 칸이 있으면 어디가 비었는지 알려줘요. 질문 문장은 비워 둬도 돼요.
  - 인트로 문구, 제목, 부제도 월드컵마다 따로 정할 수 있어요. 비워 두면 기본 문구가 보여요.

## 주소

| 주소 | 화면 |
|---|---|
| `/` | 인트로 |
| `/start` | 첫 질문 |
| `/q/:id` | 중간 질문 |
| `/r/:id` | 결과 (공유용) |
| `/admin` | 관리: 월드컵 목록 (암호 필요) |
| `/admin/:cupId` | 관리: 월드컵 편집 (암호 필요) |

`id`는 질문과 메뉴마다 붙는 랜덤 값이라서 주소만 보고는 결과를 추측할 수 없어요. 선택지 이름을 바꿔도 `id`는 그대로라서 공유한 링크가 계속 동작해요.

## 기술 구성

- **프론트엔드**: React + TypeScript + Vite, react-router
- **서버**: Netlify Functions
  - `netlify/functions/menu.mts` (`/api/menu`): 공개용. **활성 월드컵**의 메뉴와 문구만 돌려줘요.
  - `netlify/functions/admin.mts` (`/api/admin`): 관리자용. 암호 확인 후 월드컵 목록 조회/만들기/복제/수정/삭제/활성화를 해요.
  - `netlify/functions/og.mts` (`/api/og`): 지도 URL의 OG 정보(제목/설명/이미지)를 가져와요.
- **저장소**: Netlify Blobs (`menu-worldcup` 스토어의 `cups` 키에 `{ activeId, cups: [...] }`)
  - 예전 형식(`tree`, `settings` 키)만 있으면 처음 불러올 때 "기본" 월드컵으로 자동으로 옮겨져요 (`netlify/lib/cups.mts`).

### 데이터 구조

```ts
type Option = { label: string; node: TreeNode };
type QuestionNode = { kind: "q"; id: string; title: string; options: Option[] }; // 선택지 2개 이상
type MenuNode = { kind: "menu"; id: string; name: string; url: string };
type TreeNode = QuestionNode | MenuNode | null; // null = 아직 비어 있는 칸

type Settings = { introText: string; title: string; subtitle: string };
type Cup = { id: string; name: string; tree: TreeNode; settings: Settings; updatedAt: number };
```

예전 형식(`left`/`right`)이나 빠진 항목이 있는 데이터는 불러올 때 자동으로 현재 형식으로 바뀌어요 (`src/types.ts`의 `normalizeNode`).

## 로컬에서 실행하기

필요한 것: **Node.js 22.12 이상**

프로젝트 폴더에 `.env` 파일을 만들고 관리자 암호를 적어 두세요. (`.gitignore`에 들어 있어서 GitHub에는 올라가지 않아요)

```
ADMIN_PASSWORD="원하는암호"
```

```powershell
npm install
npx netlify-cli dev
```

- http://localhost:8888 에서 열려요.
- `npm run dev`(Vite만 실행)로는 서버 함수가 돌지 않아서 메뉴를 불러올 수 없어요. `netlify dev`를 써야 해요.
- 로컬에서 저장한 메뉴는 PC 안에만 남아요. 실제 사이트 데이터와는 따로예요.
- 처음 실행할 때는 Netlify CLI를 다운로드하느라 시간이 걸려요.

## 배포

GitHub `main` 브랜치에 push하면 Netlify가 자동으로 배포해요.

Netlify 설정에 **환경변수 `ADMIN_PASSWORD`** 가 있어야 관리 화면을 쓸 수 있어요.
**Project configuration → Environment variables**에서 설정하고, 바꾼 뒤에는 다시 배포해야 반영돼요.

## 폰트

[D2Coding](https://github.com/naver/d2codingfont) © NAVER Corporation, [SIL Open Font License 1.1](src/fonts/OFL.txt)
