# VocaRush MVP

VocaRush는 EJU/Japanese vocabulary-first 학습 앱입니다. 기출 단어 메타데이터, 단어장, 세트 학습, 오답 복습, 형광펜 단어 추출, Supabase 로그인/기록 저장을 중심으로 만든 Expo React Native 웹앱입니다.

## 현재 구현 상태

- Expo React Native + TypeScript 기반 모바일 우선 UI
- Google / Email Supabase Auth 로그인
- 게스트 모드 유지
- 로그인 후 `vocarush_profiles`에서 프로필 생성/불러오기
- 첫 로그인 사용자를 위한 온보딩 화면
- 단어장, 라이브러리, 세트 상세, 낱말카드/퀴즈 학습 흐름
- 학습 결과를 `vocarush_learning_records`에 저장
- 게스트는 로컬 상태로만 기록 유지
- 홈 화면에 오늘 요약, 정답률, 최근 오답, 약점 TOP 3 표시
- 형광펜 단어장
  - 사진/파일 업로드 UI
  - Supabase Storage 업로드 코드
  - Edge Function 호출 코드
  - OpenAI Vision 기반 추출 함수 파일
  - 실패 시 샘플 추출 결과로 폴백
- 모바일 앱처럼 보이도록 하단 탭, 뒤로가기, 빈 상태, 로딩, 에러 상태 정리

## 실행

```powershell
npm install
npx.cmd expo start --web --port 8082
```

## 환경 변수

`.env.local`에는 공개 가능한 Supabase 클라이언트 값만 넣습니다.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
EXPO_PUBLIC_SITE_URL=https://vocarush.vercel.app/
```

`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 같은 서버용 키는 Expo 앱에 넣지 않습니다. Supabase Edge Function Secrets에만 저장합니다.

> Developer note: Do not expose server-side API keys in the Expo client. Use a backend proxy or Supabase Edge Function for AI calls.

Google 로그인 설정값은 [docs/google-login-setup.md](docs/google-login-setup.md)를 확인합니다. Google Client Secret은 Supabase Auth Provider에만 저장하고 Expo/Vercel public env에는 넣지 않습니다.

## Supabase SQL

Supabase SQL Editor에서 아래 파일을 실행합니다.

```txt
supabase/profiles.sql
supabase/learning_records.sql
supabase/highlight_extraction.sql
```

## Edge Function 배포

Supabase CLI 로그인 후 배포합니다.

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <project-ref>
npx.cmd supabase functions deploy extract-highlight-words --project-ref <project-ref>
```

Supabase Dashboard > Edge Functions > Secrets에 서버 전용 키를 등록합니다.

```txt
OPENAI_API_KEY=<openai-secret-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

## 핵심 MVP 흐름

1. 로그인 또는 게스트로 시작
2. 첫 로그인 사용자는 온보딩 완료
3. 홈에서 추천 세트 시작
4. 낱말카드 또는 퀴즈 학습 진행
5. 결과가 로컬 상태에 즉시 반영
6. 로그인 사용자는 Supabase에 학습 기록 저장
7. 다시 로그인해도 프로필과 학습 기록 유지

## 테스트 시나리오

자세한 테스트 흐름은 [docs/mvp-test-scenarios.md](docs/mvp-test-scenarios.md)를 확인합니다.

## 다음 작업 목록

- Edge Function 실제 배포 후 이미지 추출 E2E 검증
- PDF OCR 처리 전략 확정
- 학습 기록 기반 추천 세트 고도화
- 리워드 스토어는 실제 제휴 전까지 데모 문구 유지
- 앱스토어 제출 전 개인정보 처리방침, 약관, 데이터 삭제 안내 추가
- 모바일 실기기에서 Google OAuth redirect, Storage upload, Edge Function 호출 테스트
