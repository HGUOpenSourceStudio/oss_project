# 협업 규칙(Git Flow) 설계

## 의도
Open Source Studio 과목 2인 팀(`Evvvaaaaan`, `igm0313`)이 `HGUOpenSourceStudio` 조직에서
현업 방식의 Git Flow로 협업하고, 그 과정이 기록(이슈, PR, 리뷰, CI)으로 남게 한다.

## 목표 / 하지 않는 것
- 목표: 코드와 협업 규칙을 한 공개 저장소(`oss_project`)에 두고, 규칙을 GitHub 설정과 CI로 강제한다.
- 하지 않음: 로컬 git 훅(husky, commitlint), 릴리스 자동화, Oracle/Vercel 배포, 조직 공통 `.github` 저장소.
- 실패로 보는 것: 규칙이 문서에만 있고 지켜지지 않는 상태, 키 같은 비밀이 공개되는 것.

## 검토한 방식
1. 문서와 GitHub 설정만: 가장 빠르지만 브랜치 이름·대상·제목을 눈으로 확인해야 한다.
2. **1 + CI 자동 검사 (선택)**: 설치 없이 PR에서 실수를 막는다. 검사 워크플로 하나를 관리한다.
3. 2 + 로컬 훅·릴리스 자동화: 남은 기간에 비해 설정 비용이 크다.

## 브랜치
| 브랜치 | 만드는 곳 | PR 대상 | merge 방식 |
|---|---|---|---|
| `main` | - | - | 보호. 태그 `vX.Y.Z` |
| `develop` | `main` | - | 보호. **기본 브랜치** |
| `feature/<이슈번호>-설명` | `develop` | `develop` | squash |
| `release/X.Y.Z` | `develop` | `main` | merge commit |
| `hotfix/X.Y.Z` | `main` | `main` | merge commit |
| `main` (역반영) | - | `develop` | merge commit |

설계 판단: 교과서적 Git Flow는 `release`·`hotfix`를 `main`과 `develop`에 각각 merge한다.
여기서는 `main`에만 merge한 뒤 `main` → `develop` PR 하나로 역반영한다. 결과는 같고,
merge 후 브랜치 자동 삭제를 켜도 두 번째 PR을 잃지 않는다.

## 보호 규칙 (`main`, `develop` 공통)
- PR로만 변경, 승인 1명, 새 커밋이 올라오면 기존 승인 해제
- 필수 검사 통과: 빌드 검사, PR 규칙 검사
- 관리자에게도 적용, 강제 push와 브랜치 삭제 금지
- `main`은 merge commit만 허용. merge 후 작업 브랜치 자동 삭제. squash 제목은 PR 제목.

## 자동 검사
- 기존 CI: `develop` push에도 실행, 서버 타입 검사 추가.
- PR 규칙 검사(신규): 브랜치 이름과 대상 조합이 위 표에 맞는지, 제목이 Conventional Commits
  (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`)인지.

## 저장소에 넣는 문서
- `CONTRIBUTING.md`(한국어): 위 규칙, 작업 순서 명령어 예시, 리뷰 약속(24시간 내 응답), 릴리스·hotfix 절차, 비밀 키 취급
- PR 템플릿, 이슈 템플릿(기능, 버그)
- `README.md`: 현재 상태에 맞게 갱신(지금은 `/api/health`만 있다고 적혀 있어 사실과 다름), 협업 문서 링크

## 진행 순서
1. 로컬에서 린트·테스트·타입 검사·빌드와 비밀 키 포함 여부 확인
2. 조직에 공개 저장소 `oss_project` 생성
3. 현재 코드(CI 설정, 이 설계 문서 포함)를 첫 커밋으로 `main`에 push, `develop` 생성 후 기본 브랜치로 지정
4. `igm0313`에게 저장소 write 권한 부여
5. 보호 규칙 적용
6. 협업 문서·템플릿·PR 검사를 `feature/` 브랜치에서 `develop`으로 PR → **`igm0313`이 리뷰** (규칙 합의 기록)
7. 위 PR에서 PR 규칙 검사가 한 번 실행된 뒤 필수 검사에 추가

첫 커밋만 PR 없이 `main`에 직접 올린다(빈 저장소라 PR 대상이 없다).

## 미리 알아둘 것
- 공개 저장소의 커밋에는 작성자 이메일이 남는다. 현재 git 설정은 개인 이메일이므로,
  이 저장소에서는 GitHub noreply 주소를 쓰는 것을 제안한다.
- 테스트 fixture에는 공공 API에서 받은 실제 약국·병원 이름과 전화번호가 들어 있다(공개 정보).

## 만드는 사람에게 맡기는 것
검사 워크플로의 구현 방식, 템플릿 문구.
