# 교보 스크래핑 프록시 셋업

## 왜 필요한가
Vercel 은 AWS 데이터센터에서 돌고, 교보 CloudFront 는 AWS IP 대역의 상품페이지 요청을 0-byte 로 조용히 차단한다. 검증된 사실. 그래서 **한국 주거 IP(혁준님 집)** 에서 도는 작은 프록시를 거쳐 교보에 요청한다.

```
phone → Vercel 라우트 → (KYOBO_PROXY_URL) → 집 PC 프록시 → 교보 ✅
```

## 1회 셋업 (5분)

### 1) ngrok 계정 + authtoken

https://dashboard.ngrok.com/signup — 구글 로그인으로 가입
→ 대시보드 → Your Authtoken 복사

### 2) ngrok 설치

**방법 A (chocolatey 있으면)**
```powershell
choco install ngrok
```

**방법 B (수동)**
https://ngrok.com/download → Windows x64 zip → `C:\Tools\ngrok.exe` 로 푼다.

### 3) ngrok authtoken 등록 (1회)
```powershell
ngrok config add-authtoken <붙여넣기>
```

### 4) Reserved Domain 확보 (URL 고정용)

**무료 계정은 static subdomain 하나 공짜.** 대시보드 좌측 → Universal Gateway → Domains → New Domain → "Free Static Domain" → 생성된 주소 복사 (예: `honest-badger-12345.ngrok-free.app`).

이게 있으면 PC 재부팅해도 URL 변동 없음. Vercel env 한 번 박으면 끝.

### 5) Vercel 환경변수 등록

Vercel 대시보드 → Rutibooki → Settings → Environment Variables → Add:

| 이름 | 값 |
|------|-----|
| `KYOBO_PROXY_URL` | `https://honest-badger-12345.ngrok-free.app` |

Production / Preview / Development **셋 다 체크**.
저장 후 Deployments 탭에서 최신 배포 `Redeploy`.

## 상시 구동 (매일)

PC 켰을 때 두 창 띄워두기:

### 터미널 A — 프록시 서버
```powershell
cd C:\Users\gurwn\Desktop\Project\Rutibooki
node scripts/kyobo-proxy.mjs
```
로그에 `[kyobo-proxy] listening on :5678` 뜨면 OK.

### 터미널 B — ngrok 터널
```powershell
ngrok http --url=honest-badger-12345.ngrok-free.app 5678
```
(`--url` 값은 4)번에서 받은 정적 도메인으로 교체)

둘 다 살아있으면 바코드 등록이 교보를 통과한다.

## 헬스체크

```powershell
# 로컬 프록시 살아있는지
curl http://localhost:5678

# ngrok 터널 살아있는지
curl https://honest-badger-12345.ngrok-free.app

# 실제 스크래핑 한 번 돌려보기 (사피엔스 ISBN)
curl -X POST https://honest-badger-12345.ngrok-free.app -H "Content-Type: application/json" -d "{\"isbn13\":\"9788934972464\",\"totalPages\":636}"
```

`{"unknown":false,"parts":[...]}` 가 뜨면 성공.

## 문제 해결

**PC 꺼져있을 때 등록하면?**
Vercel 라우트가 `proxy_network` 또는 `proxy_failed` 로 502 리턴 → 백그라운드 파이프라인이 `status:"failed"` 로 마감. 서재 카드에 "실패" 배지. PC 다시 켜고 서재에서 "목차 다시 가져오기" 로 재시도.

**URL 또 바꾸고 싶으면**
Vercel env `KYOBO_PROXY_URL` 업데이트 → Redeploy.

**프록시 로그 보고 싶으면**
터미널 A 창에 ISBN 들어올 때마다 `[kyobo-proxy] ← ISBN ...` 찍힌다.

## 프로세스 상시화 (선택)

귀찮으면 **PM2 로 Windows 서비스화**:
```powershell
npm i -g pm2 pm2-windows-startup
pm2-startup install
pm2 start scripts/kyobo-proxy.mjs --name kyobo-proxy
pm2 start ngrok --name kyobo-tunnel -- http --url=honest-badger-12345.ngrok-free.app 5678
pm2 save
```
부팅 시 자동 기동. 여기까진 취향.
