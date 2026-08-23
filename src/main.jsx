import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// 서비스워커 등록. immediate: true 라야 새 버전을 감지했을 때 페이지가 실제로
// 다시 로드된다 — registerType: 'autoUpdate' 만으로는 리로드가 일어나지 않는다.
// 주기적 확인은 붙이지 않으므로 갱신 시점은 페이지 진입 직후뿐이다.
// 리로드해도 나무 데이터는 services/cache.js의 localStorage 캐시에서 읽는다.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
