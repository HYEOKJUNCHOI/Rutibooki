// PM2 설정 — 프록시 + ngrok 터널을 한 번에 관리.
// 실행: pm2 start ecosystem.config.cjs
//
// Windows PM2 는 CLI 의 `--` 구분자가 불안정해서, ngrok 플래그를
// 이 파일의 args 배열로 직접 넘긴다. 경로·도메인 바뀌면 여기만 수정.

module.exports = {
  apps: [
    {
      name: "kyobo-proxy",
      script: "scripts/kyobo-proxy.mjs",
      cwd: __dirname,
      autorestart: true,
    },
    {
      name: "kyobo-tunnel",
      script:
        "C:\\Users\\gurwn\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\\ngrok.exe",
      args: [
        "http",
        "--url=evolve-landscape-clear.ngrok-free.dev",
        "5678",
      ],
      // ngrok 은 Node 스크립트가 아니라 네이티브 exe — interpreter 끔.
      interpreter: "none",
      autorestart: true,
    },
  ],
};
