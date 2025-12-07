/**
 * 모달 및 탭 UI 관리 모듈
 */
const Modal = {
    // 모달 열기
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; 
        }
    },

    // 모달 닫기
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // 다른 활성화된 모달이 없을 때만 스크롤 복구
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
        // 이벤트 위임을 사용하여 동적으로 생성된 요소나 기존 요소의 닫기 동작 처리
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            const closeBtn = e.target.closest('.btn-close');
            const secondaryBtn = e.target.classList.contains('btn-secondary');
            
            // 닫기 버튼이거나 취소(secondary) 버튼이면서 data-modal 속성이 있는 경우
            if (trigger && (closeBtn || secondaryBtn)) {
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
 * 탭 UI 관리
 */
const TabManager = {
    init() {
        // 탭 전환 이벤트 위임
        document.body.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab');
            if (tabBtn) {
                const tabId = tabBtn.dataset.tab;
                if (tabId) this.switchTab(tabBtn, tabId);
            }
        });
    },

    switchTab(activeBtn, tabId) {
        // 현재 탭이 포함된 모달이나 컨테이너 찾기
        const container = activeBtn.closest('.modal-body') || document.body;
        
        // 1. 탭 버튼 활성화 상태 변경
        const tabsContainer = activeBtn.closest('.tabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab').forEach(btn => {
                btn.classList.remove('active');
            });
            activeBtn.classList.add('active');
        }

        // 2. 탭 콘텐츠 표시 상태 변경
        // 탭 콘텐츠가 같은 부모 컨테이너 내에 있다고 가정
        const targetContent = document.getElementById(`tab-${tabId}`);
        if (targetContent) {
            const contentParent = targetContent.parentElement;
            if (contentParent) {
                contentParent.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                targetContent.classList.add('active');
            }
        }
    }
};