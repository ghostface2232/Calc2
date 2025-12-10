const CACHE_NAME = 'gluck-calc-v7.25'; 
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/calculator.js',
    './js/data.js',
    './js/modal.js',
    './manifest.json',
    './fonts/SFKR-Regular.otf',
    './fonts/SFKR-Medium.otf',
    './fonts/SFKR-Bold.otf'
];

// 설치 (Install): 리소스 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // console.log('캐시 시작');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    // 대기 없이 즉시 활성화
    self.skipWaiting();
});

// 활성화 (Activate): 구버전 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        // console.log('구버전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // 모든 클라이언트(열려있는 탭 등)에서 즉시 새 서비스 워커 제어권 가져오기
    return self.clients.claim();
});

// 요청 (Fetch): 캐시 우선, 없으면 네트워크, 네트워크 실패 시 오프라인 페이지(선택)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에 있으면 반환
                if (response) {
                    return response;
                }
                // 없으면 네트워크 요청
                return fetch(event.request);
            })
    );
});
