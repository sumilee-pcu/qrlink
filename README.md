# QRLink Studio

URL을 선명한 QR 이미지로 변환하고 PNG 또는 SVG로 내려받는 개인용 웹 서비스입니다. Vercel에 올리면 Supabase를 저장소로 사용하는 단축주소 기능까지 함께 사용할 수 있습니다.

## 기능

- URL 자동 보정: `example.com` 입력 시 `https://example.com`으로 처리
- QR 미리보기 즉시 생성
- PNG 다운로드
- SVG 다운로드 및 클립보드 복사
- 전경색, 배경색, 크기, 여백, 오류 보정 수준 조정
- QR 생성은 서버 없이 브라우저에서 동작
- Vercel API + Supabase DB 기반 단축주소 생성

## 실행

```bash
npm install
npm run dev
```

QR 생성 기능만 확인할 때는 위 명령이면 충분합니다. 단축주소 API까지 로컬에서 확인하려면 Vercel CLI를 사용합니다.

```bash
npm install -g vercel
cp .env.example .env.local
npm run vercel:dev
```

## 배포

### Vercel

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. Vercel에 이 저장소를 연결합니다.
4. Vercel 환경변수에 아래 값을 추가합니다.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
```

5. Vercel에서 배포합니다.

배포 후 단축주소는 아래 형태로 동작합니다.

```text
https://your-vercel-domain.vercel.app/r/abc1234
```

### 정적 호스팅

단축주소 없이 QR 생성만 쓸 경우에는 정적 호스팅으로도 충분합니다.

```bash
npm run build
```

`dist` 폴더를 정적 호스팅에 배포하면 됩니다.

## 보안 메모

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출하면 안 됩니다. 이 프로젝트에서는 Vercel API 함수 안에서만 사용합니다.
