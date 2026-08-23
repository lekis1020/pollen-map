/// <reference lib="webworker" />
// 서비스워커. vite-plugin-pwa의 injectManifest가 self.__WB_MANIFEST 자리에
// 빌드 산출물 목록을 채워 넣는다.
//
// 담는 것은 앱 셸(html/js/css/아이콘)뿐이다. data/*.json 14.2MB는 여기 들어오지
// 않는다 — vite.config.js의 injectManifest 설정 참고.
//
// 오프라인 사용성은 목표가 아니다. 지도가 네이버 CDN 스크립트에 의존해서
// 네트워크 없이는 어차피 뜨지 않는다. 아래 네비게이션 폴백은 "오프라인에서도
// 지도가 돈다"는 뜻이 아니라, 껍데기가 흰 화면 대신 앱 UI를 띄우고 기존
// 오류 배너로 상황을 알리게 하려는 것이다.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

precacheAndRoute(self.__WB_MANIFEST);

// 이전 버전이 남긴 캐시를 정리한다. 없으면 배포를 거듭할수록 쌓인다.
cleanupOutdatedCaches();

// 네비게이션 요청은 precache된 index.html로 받는다.
// data/ 와 api/ 는 제외한다 — 각각 정적 JSON과 서버리스 함수라
// 앱 셸을 돌려주면 안 된다.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/api\//, /^\/data\//],
}));

// registerType: 'autoUpdate' + registerSW({ immediate: true }) 조합이 성립하려면
// 새 워커가 대기하지 않고 즉시 활성화돼야 한다.
self.skipWaiting();
clientsClaim();
