import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // generateSW가 아니라 injectManifest를 쓴다. 기본값 generateSW는 서비스워커를
      // 통째로 만들어 주는 대신 커스텀 리스너를 담지 못하는데, Phase 2b에서 push /
      // notificationclick 핸들러가 src/sw.js로 들어올 예정이다.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      // 업데이트는 자동으로 적용한다. 알레르기 등급 같은 의료 정보 수정이
      // "새 버전 있음" 배너를 무시하는 사용자에게 안 닿으면 곤란하다.
      // 리로드 시점은 main.jsx의 registerSW({ immediate: true })가 정한다.
      // 주기적 업데이트 확인(periodicSyncForUpdates)은 일부러 넣지 않는다 —
      // 넣으면 세션 한가운데서 리로드가 걸린다. 넣지 않으면 브라우저 표준
      // 라이프사이클대로 페이지 진입 시점에만 새 버전을 확인한다.
      registerType: 'autoUpdate',
      injectRegister: null, // 등록은 main.jsx에서 직접 한다

      manifest: {
        name: '식물 알레르기 지도',
        short_name: '알레르기 지도',
        description: '가로수·수목 위치와 오늘의 꽃가루 정보를 지도에서 확인합니다.',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // 헤더가 흰색이라 상태표시줄이 이어져 보이게 맞춘다.
        theme_color: '#ffffff',
        // 스플래시 배경. App.css의 앱 배경색과 같다.
        background_color: '#f5f6fa',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // icon.svg는 내용이 전부 안전영역 안에 있어 같은 파일을 maskable로 쓴다.
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      injectManifest: {
        // dist는 14MB가 넘고 그중 14.2MB가 data/*.json이다. 앱 셸(~0.37MB)만
        // precache한다. 나무 데이터는 지금처럼 네트워크 + services/cache.js의
        // localStorage 캐시(24h)가 담당한다 — 서비스워커가 중복 캐시하지 않는다.
        //
        // 아래 세 줄은 같은 사고를 세 겹으로 막는다. json 확장자를 넣지 않고,
        // data/ 경로를 무시하고, 파일 크기 상한도 건다.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['data/**'],
        maximumFileSizeToCacheInBytes: 1_000_000,
      },
    }),
  ],
})
