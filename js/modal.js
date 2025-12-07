/**
 * 모달 및 탭 UI 관리 모듈
 */
const Modal = {
    // 모달 열기
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            // 스크롤 방지
            document.body.style.overflow = 'hidden'; 
        }
    },

    // 모달 닫기
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // 스크롤 복구 (다른 모달이 없을 때만)
            if (!document.querySelector('.modal-overlay.active')) {
                document.body.style.overflow = '';
            }
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
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            const closeBtn = e.target.closest('.btn-close');
            
            // 닫기 버튼 또는 취소 버튼 처리
            if (trigger && (closeBtn || trigger.classList.contains('btn-secondary'))) {
                const modalId = trigger.dataset.modal;
                if (modalId) this.close(modalId);
            }
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
 * 탭 UI 관리 (설정 모달 등)
 */
const TabManager = {
    init() {
        // 탭 버튼 클릭 이벤트 (위임 사용)
        document.body.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab');
            if (tabBtn) {
                const tabId = tabBtn.dataset.tab;
                if (tabId) this.switchTab(tabBtn, tabId);
            }
        });
    },

    switchTab(activeBtn, tabId) {
        const container = activeBtn.closest('.modal-body') || document.body;
        
        // 1. 탭 버튼 활성화 처리
        const tabsContainer = activeBtn.closest('.tabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab').forEach(btn => {
                btn.classList.remove('active');
            });
            activeBtn.classList.add('active');
        }

        // 2. 탭 콘텐츠 표시 처리
        // 탭 콘텐츠들이 모달 내부에 있다고 가정하고 검색
        const contentContainer = container.querySelector(`#tab-${tabId}`)?.parentElement || container;
        
        if (contentContainer) {
            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }
    }
};