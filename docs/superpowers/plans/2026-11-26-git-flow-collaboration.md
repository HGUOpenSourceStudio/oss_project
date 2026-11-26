# Git Flow 협업 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `HGUOpenSourceStudio/oss_project`를 공개하고 Git Flow 규칙을 GitHub 설정과 CI로 강제한다.

**Architecture:** 현재 코드를 첫 커밋으로 `main`에 올리고 `develop`을 만든다. 보호는 GitHub rulesets, PR 규칙은 `scripts/check-pr.mjs`를 워크플로가 실행해 검사한다. 협업 문서는 PR로 올려 팀원이 리뷰한다.

**Tech Stack:** GitHub CLI, GitHub Actions, rulesets, Node 22, Vitest

**Spec:** `docs/superpowers/specs/2026-11-26-git-flow-collaboration-design.md`

## Global Constraints
- 저장소: `HGUOpenSourceStudio/oss_project`, 공개. 로컬: `~/oss_project`.
- 기본 브랜치 `develop`. 팀원 `igm0313`은 write(`push`) 권한.
- 커밋 작성자 이메일은 GitHub noreply 주소(이 저장소 설정에만).
- `.env.local`과 키 값은 커밋하지 않고 출력하지 않는다.
- 문서는 한국어, 커밋·PR 제목은 Conventional Commits.
- 팀원 리뷰를 대신 승인하거나 보호 규칙을 우회해 merge하지 않는다.

## Review Focus
- fork의 `main`에서 보낸 PR: 역반영으로 인정하지 않고 실패해야 한다.
- PR 제목에 따옴표·백틱·`$( )`: 셸에서 실행되지 않고 문자열로만 검사해야 한다.
- 이슈 번호 없는 `feature/login`: 실패하고 올바른 형식을 알려줘야 한다.
- PR을 연 뒤 제목이나 대상 브랜치 수정: 검사가 다시 실행돼야 한다.
- 새 컴퓨터에서 `.env.local` 없이 CI·테스트: 통과해야 한다.

---

### Task 1: 첫 커밋 준비
**Files:** Modify `.github/workflows/ci.yml`, `README.md`

- [ ] `ci.yml`: push 대상을 `[main, develop]`로, `npm run lint` 다음에 `npm run typecheck:server` 추가. job 이름 `check` 유지.
- [ ] `README.md`: 현재 구현(`/api/health`, `/api/datasets`, `/api/places?dataset=pharmacy|clinic&lat=&lng=&limit=`), 실행법(`npm run server`, `npm run dev`), 키는 `.env.local`의 `DATA_GO_KR_SERVICE_KEY`, 데이터 출처(국립중앙의료원, 공공데이터포털), 지도(OpenStreetMap). `/api/query`는 "예정". Vercel Functions 표기는 제거.
- [ ] 검증: `npm run lint && npm run typecheck:server && npm test && npm run build` → 모두 종료 코드 0.
- [ ] `git config user.email "<id>+Evvvaaaaan@users.noreply.github.com"` (`<id>`는 `gh api user --jq .id`).
- [ ] `git add -A` 후 확인: 목록에 `.env.local`, `node_modules`, `dist`가 없고, `.env.local`의 키 값이 `git grep --cached`에서 0건.
- [ ] 커밋 `chore: initial project scaffold with places API and map UI`.
- [ ] 깨끗한 복제본 검증: scratchpad에 로컬 clone → `npm ci && npm test && npm run build` 통과.

### Task 2: 저장소 생성과 설정
- [ ] `gh repo create HGUOpenSourceStudio/oss_project --public --source . --remote origin --push`
- [ ] `develop` 생성·push, 기본 브랜치를 `develop`으로.
- [ ] 저장소 설정: squash·merge commit 허용, rebase 금지, `delete_branch_on_merge=true`, `squash_merge_commit_title=PR_TITLE`.
- [ ] `gh api -X PUT repos/HGUOpenSourceStudio/oss_project/collaborators/igm0313 -f permission=push`
- [ ] 검증: `gh run list`에서 `main`, `develop`의 CI가 `success`. 저장소 `visibility=public`, `default_branch=develop`.

### Task 3: 보호 규칙
**Produces:** ruleset `protect-main`, `protect-develop`

- [ ] 두 ruleset 생성(bypass 목록 비움): `deletion`, `non_fast_forward`, `pull_request`(승인 1, `dismiss_stale_reviews_on_push=true`), `required_status_checks`(`check`). `allowed_merge_methods`: main `["merge"]`, develop `["squash","merge"]`.
- [ ] 검증: `gh api repos/HGUOpenSourceStudio/oss_project/rules/branches/main`(과 `develop`)에 네 규칙이 보인다.

### Task 4: PR 규칙 검사와 협업 문서
**Files:**
- Create: `scripts/check-pr.mjs`, `scripts/check-pr.test.mjs`, `.github/workflows/pr-rules.yml`, `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/feature.md`, `.github/ISSUE_TEMPLATE/bug.md`
- Modify: `README.md` (CONTRIBUTING 링크)

**Interfaces:** `checkPr({ head: string, base: string, title: string, sameRepo: boolean }): string[]` — 빈 배열이면 통과, 아니면 한국어 오류 메시지. 직접 실행하면 환경변수 `PR_HEAD`, `PR_BASE`, `PR_TITLE`, `PR_SAME_REPO`를 읽고 오류 시 종료 코드 1.

- [ ] 이슈 생성 "협업 규칙과 PR 검사 추가", 그 번호 `N`으로 `develop`에서 `feature/N-collaboration-docs` 생성.
- [ ] 실패하는 테스트 작성:
  - 통과(`[]`): `feature/3-map`→`develop`; `release/0.1.0`→`main`; `hotfix/0.1.1`→`main`; `main`→`develop`(`sameRepo: true`); 제목 `fix(server)!: 오류 수정`
  - 실패(길이 > 0): `feature/3-map`→`main`; `feature/login`→`develop`; `release/1.0`→`main`; `release/0.1.0`→`develop`; `main`→`develop`(`sameRepo: false`); fork의 `release/0.1.0`→`main`; `fix/3-x`→`develop`; 제목 `update map`, `feat:`, `Feat: x`
- [ ] `npx vitest run scripts` → FAIL(모듈 없음).
- [ ] `checkPr` 구현. 브랜치: `^feature/\d+-\S+$`, `^(release|hotfix)/\d+\.\d+\.\d+$`. 제목: `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?: \S.*$`
- [ ] `npx vitest run scripts` → PASS. 따옴표·`$(x)`가 든 제목으로 직접 실행해 문자열 그대로 처리되는지 확인.
- [ ] `pr-rules.yml`: `pull_request` 타입 `[opened, edited, synchronize, reopened]`, job 이름 `pr-rules`, `permissions: contents: read`. PR 값은 `env:`로만 전달(`run:`에 `${{ }}` 삽입 금지). `PR_SAME_REPO`는 head repo와 저장소 이름 비교.
- [ ] `CONTRIBUTING.md`: 설계 문서의 브랜치 표, 기능 작업 명령 순서(이슈→브랜치→커밋→PR `Closes #N`→리뷰→squash), release·hotfix 절차(태그 `vX.Y.Z`, `main`→`develop` 역반영 PR 제목 `chore: merge main into develop`), 리뷰 24시간, 키 취급(커밋 금지, 노출 시 즉시 재발급).
- [ ] PR 템플릿: 변경 요약, `Closes #`, 확인 목록(lint·test·build, 키 미포함, 화면 변경 시 스크린샷). 이슈 템플릿: 기능(배경·할 일·완료 기준), 버그(재현·기대·실제).
- [ ] 검증: `npm run lint && npm test && npm run build` 통과.
- [ ] 커밋 `ci: add PR rule check and collaboration guide`, push, `gh pr create --base develop --reviewer igm0313`, 제목은 커밋과 동일.

### Task 5: PR 검사를 필수로 추가
- [ ] `gh pr checks`에서 `check`, `pr-rules`가 `pass`.
- [ ] 두 ruleset의 `required_status_checks`에 `pr-rules` 추가 → rules API로 확인.
- [ ] `gh pr view --json mergeStateStatus,reviewDecision` → 리뷰 대기로 merge 차단. **merge하지 않고** 링크를 보고한다.
