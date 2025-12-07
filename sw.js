const CACHE_NAME = 'quote-calculator-v3'; // 버전 업데이트
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/data.js',
    './js/modal.js',
    './js/calculator.js',
    './js/app.js',
    './manifest.json',
    './fonts/SFKR-Regular.otf',
    './fonts/SFKR-Medium.otf',
    './fonts/SFKR-Bold.otf'
];

// 설치: 자산 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting()) // 대기 중인 워커를 즉시 활성화
    );
});

// 활성화: 구버전 캐시 정리 및 클라이언트 제어권 획득
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
        .then(() => self.clients.claim()) // 즉시 페이지 제어 시작
    );
});

// 패치: Network First 전략 (네트워크 우선 -> 실패 시 캐시)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 네트워크 응답이 유효하면 캐시를 갱신하고 응답 반환
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            })
            .catch(() => {
                // 네트워크 요청 실패(오프라인) 시 캐시 반환
                return caches.match(event.request)
                    .then((response) => {
                        if (response) return response;
                        // 오프라인이면서 캐시도 없는 경우 (필요 시 index.html로 폴백)
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});
