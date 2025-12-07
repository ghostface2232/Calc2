/**
 * 모달 및 탭 UI 관리 모듈
 */
const Modal = {
    // 모달 열기
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // 스크롤 방지
        }
    },

    // 모달 닫기
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // 스크롤 복구
        }
    },

    // 모든 모달 닫기
    closeAll() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },

    // 초기화 및 이벤트 바인딩
    init() {
        // 닫기 버튼 및 data-modal 속성을 가진 요소들에 이벤트 연결
        document.querySelectorAll('.btn-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 버튼이 닫기 버튼인 경우 타겟 모달 ID를 가져옴
                // data-modal 속성이 있다면 그 값을 사용 (닫기 버튼 등)
                const modalId = e.currentTarget.dataset.modal;
                if (modalId) this.close(modalId);
            });
        });

        // 모달 배경(Overlay) 클릭 시 닫기
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(overlay.id);
                }
            });
        });

        // ESC 키 누르면 모든 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }
};

/**
 * 탭 UI 관리 (설정 모달 내부 등)
 */
const TabManager = {
    init() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });
    },

    switchTab(tabId) {
        // 탭 버튼 활성화 상태 변경
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                // 같은 그룹 내의 탭만 비활성화 (현재는 설정 모달 하나뿐이라 전체 조회해도 무방)
                // 만약 여러 탭 그룹이 생긴다면 부모 컨테이너 기준 탐색으로 고도화 필요
                if (tab.closest('.tabs') === document.querySelector(`.tab[data-tab="${tabId}"]`).closest('.tabs')) {
                    tab.classList.remove('active');
                }
            }
        });

        // 탭 콘텐츠 표시 상태 변경
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            } else {
                // 같은 부모를 공유하는 콘텐츠만 숨김 처리
                if (content.parentElement === document.getElementById(`tab-${tabId}`).parentElement) {
                    content.classList.remove('active');
                }
            }
        });
    }
};