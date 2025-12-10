/**
 * 메인 애플리케이션
 */
const App = {
    state: {
        activeQuoteId: null,
        sortBy: 'newest',        // [추가] 정렬 기준 (newest, oldest, name)
        filterTagId: '',         // [추가] 태그 필터 (없으면 빈 문자열)
        isSelectionMode: false,  // [추가] 다중 선택 모드 여부
        selectedQuoteIds: new Set() // [추가] 선택된 견적 ID 집합
    },

    // ICONS 객체 삭제됨

    init() {
        Modal.init();
        TabManager.init();
        this.initSidebar();
        this.bindEvents();

        // 데이터 로드 및 초기 활성 견적 설정
        const quotes = DataManager.getQuotes();
        if (quotes.length > 0 && !this.state.activeQuoteId) {
            this.state.activeQuoteId = quotes[0].id;
        }

        this.renderAll();
        this.updateHistoryButtons();
        this.updateFileStorageUI();
    },

    // UI 전체 업데이트
    renderAll() {
        this.renderQuoteList();
        this.renderCalculator();
        this.renderMaterialList();
        this.renderClientList();
        this.renderOptionPresetList();
        this.updateSidebarTagFilter();
    },

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const settings = DataManager.getSettings();
        // [수정 4] sidebarWidth를 Export되는 settings에서 분리 (로컬 설정 사용)
        const sidebarWidth = DataManager.getLocalSetting('sidebarWidth') || settings.sidebarWidth;
        
        if (!settings.sidebarCollapsed) {
            sidebar.style.width = sidebarWidth + 'px';
            document.documentElement.style.setProperty('--sidebar-width', sidebarWidth + 'px');
        } else {
            sidebar.classList.add('collapsed');
        }
        
        const resizeHandle = document.getElementById('sidebar-resize');
        let isResizing = false;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            e.preventDefault(); // [추가] 드래그 시작 시 텍스트 선택 등 기본 브라우저 동작 방지
            resizeHandle.classList.add('active');
            document.body.style.cursor = 'ew-resize';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = Math.min(400, Math.max(180, e.clientX - 20));
            sidebar.style.width = newWidth + 'px';
            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                const settings = DataManager.getSettings();
                // settings.sidebarWidth = parseInt(sidebar.style.width); // [수정 4] Export 방지를 위해 해당 라인 제거
                
                // [수정 4] sidebarWidth를 Export되지 않는 로컬 설정으로 저장
                DataManager.saveLocalSetting('sidebarWidth', parseInt(sidebar.style.width)); 
                
                DataManager.saveSettings(settings); // settings는 sidebarCollapsed 등만 포함
            }
        });
        
        document.getElementById('btn-collapse').addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const settings = DataManager.getSettings();
            settings.sidebarCollapsed = sidebar.classList.contains('collapsed');

            // [수정 4] 로컬 설정에서 sidebarWidth를 가져와 사용
            const currentSidebarWidth = DataManager.getLocalSetting('sidebarWidth') || 280;
            
            if (!settings.sidebarCollapsed) sidebar.style.width = currentSidebarWidth + 'px'; 
            else sidebar.style.width = ''; 
            DataManager.saveSettings(settings);
        });
    },

    bindEvents() {
        document.getElementById('btn-new-quote').addEventListener('click', () => this.createNewQuote());
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.updateFileStorageUI(); // 설정 모달 열 때마다 상태 갱신
            Modal.open('modal-settings');
        });
        document.getElementById('btn-add-material').addEventListener('click', () => this.openMaterialModal());
        document.getElementById('btn-add-client').addEventListener('click', () => this.openClientModal());
        document.getElementById('btn-add-option-preset').addEventListener('click', () => this.openOptionPresetModal());
        
        document.getElementById('form-material').addEventListener('submit', (e) => { e.preventDefault(); this.saveMaterial(); });
        document.getElementById('form-client').addEventListener('submit', (e) => { e.preventDefault(); this.saveClient(); });
        document.getElementById('form-option-preset').addEventListener('submit', (e) => { e.preventDefault(); this.saveOptionPreset(); });
        document.getElementById('form-quote-name').addEventListener('submit', (e) => { e.preventDefault(); this.saveQuoteName(); });

        document.getElementById('btn-export-data').addEventListener('click', () => this.exportData());
        document.getElementById('btn-import-trigger').addEventListener('click', () => { document.getElementById('input-import-file').click(); });
        document.getElementById('input-import-file').addEventListener('change', (e) => this.importData(e));

        document.getElementById('btn-undo').addEventListener('click', () => this.performUndo());
        document.getElementById('btn-redo').addEventListener('click', () => this.performRedo());

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.performUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                this.performRedo();
            }
        });
    },

    // === 렌더링 위임 ===
renderQuoteList() {
        let quotes = DataManager.getQuotes();
        
        if (this.state.filterTagId) {
            quotes = quotes.filter(q => q.tagId === this.state.filterTagId);
        }

        quotes.sort((a, b) => {
            if (this.state.sortBy === 'name') return a.name.localeCompare(b.name);
            if (this.state.sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            return new Date(b.createdAt) - new Date(a.createdAt); // 기본: newest
        });

        if (Calculator.renderQuoteList) {
            Calculator.renderQuoteList(quotes, this.state.activeQuoteId, {
                isSelectionMode: this.state.isSelectionMode,
                selectedIds: this.state.selectedQuoteIds
            });
        }
    },

    renderCalculator() {
        const container = document.getElementById('calculator-container');
        if (!container) return;

        // [버그 수정 2] 렌더링 전 스크롤 위치 저장
        // 각 뷰(calculator-body)의 스크롤 위치를 뷰 ID를 키로 저장
        const scrollPositions = new Map();
        container.querySelectorAll('.calculator').forEach(el => {
            const viewId = el.dataset.viewId;
            const body = el.querySelector('.calculator-body');
            if (viewId && body) {
                scrollPositions.set(viewId, body.scrollTop);
            }
        });
        // 메인 컨테이너(가로 스크롤) 위치 저장
        const containerScrollLeft = container.scrollLeft;

        if (!this.state.activeQuoteId) {
            container.innerHTML = Calculator.renderEmpty();
            return;
        }

        const quote = DataManager.getQuote(this.state.activeQuoteId);
        if (!quote) {
            this.state.activeQuoteId = null;
            container.innerHTML = Calculator.renderEmpty();
            return;
        }

        container.innerHTML = Calculator.renderQuote(quote);

        // [버그 수정 2] 렌더링 후 스크롤 위치 복구
        container.querySelectorAll('.calculator').forEach(el => {
            const viewId = el.dataset.viewId;
            const body = el.querySelector('.calculator-body');
            if (viewId && body && scrollPositions.has(viewId)) {
                body.scrollTop = scrollPositions.get(viewId);
            }
        });
        // 메인 컨테이너 스크롤 복구
        if (containerScrollLeft > 0) {
            container.scrollLeft = containerScrollLeft;
        }
    },

    renderMaterialList() {
        const materials = DataManager.getMaterials();
        if (Calculator.renderMaterialList) Calculator.renderMaterialList(materials);
    },

    renderClientList() {
        const clients = DataManager.getClients();
        if (Calculator.renderClientList) Calculator.renderClientList(clients);
    },

    renderOptionPresetList() {
        const presets = DataManager.getOptionPresets();
        if (Calculator.renderOptionPresetList) Calculator.renderOptionPresetList(presets);
    },

    // === Undo/Redo ===
    performUndo() {
        const restoredId = DataManager.undo();
        if (restoredId !== null) {
            if (restoredId) this.state.activeQuoteId = restoredId;
            this.renderQuoteList();
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    performRedo() {
        const restoredId = DataManager.redo();
        if (restoredId !== null) {
            if (restoredId) this.state.activeQuoteId = restoredId;
            this.renderQuoteList();
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    updateHistoryButtons() {
        document.getElementById('btn-undo').disabled = !DataManager.canUndo();
        document.getElementById('btn-redo').disabled = !DataManager.canRedo();
    },

    // === 데이터 Export/Import ===
    exportData() {
        const json = DataManager.exportConfiguration();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `gluckcalc-config-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const success = DataManager.importConfiguration(event.target.result);
        if (success) {
            alert('설정이 성공적으로 불러와졌습니다.');
            
            this.state.activeQuoteId = null; 
            const quotes = DataManager.getQuotes();
            if (quotes.length > 0) {
                this.state.activeQuoteId = quotes[0].id;
            }

            const settings = DataManager.getSettings();
            const sidebar = document.getElementById('sidebar');
            if (settings.sidebarCollapsed) sidebar.classList.add('collapsed');
            else sidebar.classList.remove('collapsed');

            this.renderAll();
            this.updateHistoryButtons();
        } else {
            alert('파일을 불러오는 중 오류가 발생했습니다. 올바른 JSON 파일인지 확인해주세요.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
},
    // === 견적 로직 ===
    createNewQuote() {
        DataManager.captureState(this.state.activeQuoteId);
        const quotes = DataManager.getQuotes();
        const num = quotes.length + 1;
        const quote = DataManager.createQuote(`견적 ${String(num).padStart(2, '0')}`);
        this.state.activeQuoteId = quote.id;
        this.renderQuoteList();
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    selectQuote(quoteId) {
        this.state.activeQuoteId = quoteId;
        this.renderQuoteList();
        this.renderCalculator();
    },

    deleteQuote(quoteId) {
        if (!confirm('이 견적을 삭제하시겠습니까?')) return;
        DataManager.captureState(this.state.activeQuoteId);
        DataManager.deleteQuote(quoteId);
        if (this.state.activeQuoteId === quoteId) this.state.activeQuoteId = null;
        this.renderQuoteList();
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    duplicateQuote(quoteId) {
        DataManager.captureState(this.state.activeQuoteId);
        const duplicate = DataManager.duplicateQuote(quoteId);
        if (duplicate) {
            this.state.activeQuoteId = duplicate.id;
            this.renderQuoteList();
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    editQuoteName(quoteId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        document.getElementById('quote-name-id').value = quoteId;
        document.getElementById('quote-name-input').value = quote.name;
        Modal.open('modal-quote-name');
    },

    saveQuoteName() {
        DataManager.captureState(this.state.activeQuoteId);
        const quoteId = document.getElementById('quote-name-id').value;
        const name = document.getElementById('quote-name-input').value.trim();
        if (!name) return;
        const quote = DataManager.getQuote(quoteId);
        if (quote) {
            quote.name = name;
            DataManager.saveQuote(quote);
            this.renderQuoteList();
            this.renderCalculator();
            this.updateHistoryButtons();
        }
        Modal.close('modal-quote-name');
    },

    setSortOrder(order) {
        this.state.sortBy = order;
        this.renderQuoteList();
    },

    setFilterTag(tagId) {
        this.state.filterTagId = tagId;
        this.renderQuoteList();
    },

    toggleSelectionMode() {
        this.state.isSelectionMode = !this.state.isSelectionMode;
        this.state.selectedQuoteIds.clear();
        this.renderQuoteList();
        
        const delBtn = document.getElementById('btn-delete-selected');
        if (delBtn) delBtn.style.display = this.state.isSelectionMode ? 'block' : 'none'; // block이나 flex로 조정
    },

    toggleQuoteSelection(id) {
        if (this.state.selectedQuoteIds.has(id)) this.state.selectedQuoteIds.delete(id);
        else this.state.selectedQuoteIds.add(id);
        this.renderQuoteList();
    },

    deleteSelectedQuotes() {
        if (!confirm(`${this.state.selectedQuoteIds.size}개의 견적을 삭제하시겠습니까?`)) return;
        
        DataManager.captureState(this.state.activeQuoteId);
        this.state.selectedQuoteIds.forEach(id => {
            DataManager.deleteQuote(id);
            if (this.state.activeQuoteId === id) this.state.activeQuoteId = null;
        });
        
        this.toggleSelectionMode(); 
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    openTagModal(quoteId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        // 모달에 타겟 견적 ID 저장
        const modal = document.getElementById('modal-tag-manager');
        if (modal) modal.dataset.targetQuoteId = quoteId;
        
        this.renderTagListInModal();
        Modal.open('modal-tag-manager');
    },

        renderTagListInModal() {
        const listEl = document.getElementById('tag-manager-list');
        if (!listEl) return;
        
        const tags = DataManager.getTags();
        const targetId = document.getElementById('modal-tag-manager').dataset.targetQuoteId;
        const quote = DataManager.getQuote(targetId);

        const isNoTagSelected = quote && !quote.tagId;
        
        const noTagItem = `
            <li class="tag-item" onclick="App.assignTag(null)">
                <div class="tag-info-group">
                    <div class="tag-check-icon ${isNoTagSelected ? 'visible' : ''}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="tag-preview" style="background-color: #cbd5e0; color: #4a5568;">태그 없음</div>
                </div>
                <div class="tag-actions"></div>
            </li>
        `;

        const tagItems = tags.map(tag => {
            const isSelected = quote && quote.tagId === tag.id;
            
            return `
            <li class="tag-item" onclick="App.assignTag('${tag.id}')">
                <div class="tag-info-group">
                    <div class="tag-check-icon ${isSelected ? 'visible' : ''}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="tag-preview" style="background-color: ${tag.color}">${tag.name}</div>
                </div>
                
                <div class="tag-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); App.editTag('${tag.id}')" title="수정">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="event.stopPropagation(); App.deleteTag('${tag.id}')" title="삭제">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `}).join('');

        listEl.innerHTML = noTagItem + tagItems;
    },


    saveNewTag() {
        const nameInput = document.getElementById('new-tag-name');
        const colorInput = document.getElementById('new-tag-color');
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) return;
        
        DataManager.saveTag({ id: null, name, color });
        nameInput.value = ''; 
        
        this.renderTagListInModal();
        this.updateSidebarTagFilter(); // 필터 목록 갱신
        this.renderQuoteList(); // 리스트 갱신 (색상 등 반영)
    },

    // === 태그 모달 관련 ===
    openTagModal(quoteId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const modal = document.getElementById('modal-tag-manager');
        if (modal) modal.dataset.targetQuoteId = quoteId;
        
        this.hideCreateTagForm();
        this.renderTagListInModal();
        Modal.open('modal-tag-manager');
    },

    showCreateTagForm() {
        document.getElementById('btn-show-create-tag').style.display = 'none';
        document.getElementById('new-tag-form-container').style.display = 'block';
        document.getElementById('new-tag-name').focus();
    },

    hideCreateTagForm() {
        document.getElementById('btn-show-create-tag').style.display = 'block';
        document.getElementById('new-tag-form-container').style.display = 'none';
        document.getElementById('new-tag-name').value = '';
    },

    saveNewTag() {
        const nameInput = document.getElementById('new-tag-name');
        const colorInput = document.getElementById('new-tag-color');
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) {
            alert('태그 이름을 입력해주세요.');
            return;
        }
        
        DataManager.saveTag({ id: null, name, color });
        
        this.hideCreateTagForm();
        
        this.renderTagListInModal();
        this.updateSidebarTagFilter();
        this.renderQuoteList();
    },

    assignTag(tagId) {
        const quoteId = document.getElementById('modal-tag-manager').dataset.targetQuoteId;
        const quote = DataManager.getQuote(quoteId);
        if (quote) {
            quote.tagId = tagId;
            DataManager.saveQuote(quote);
            this.renderQuoteList();
            this.renderTagListInModal();
        }
    },
    
    deleteTag(tagId) {
        if(!confirm('태그를 삭제하시겠습니까? 해당 태그를 사용하는 견적에서 태그가 해제됩니다.')) return;
        DataManager.deleteTag(tagId);
        this.renderTagListInModal();
        this.updateSidebarTagFilter();
        this.renderQuoteList();
    },

    editTag(tagId) {
        const tag = DataManager.getTag(tagId);
        if(!tag) return;
        const newName = prompt('태그 이름 수정:', tag.name);
        if(newName) {
            tag.name = newName.trim();
            DataManager.saveTag(tag);
            this.renderTagListInModal();
            this.updateSidebarTagFilter();
            this.renderQuoteList();
        }
    },

    updateSidebarTagFilter() {
        const select = document.getElementById('sidebar-tag-filter');
        if (!select) return;
        const currentVal = select.value;
        const tags = DataManager.getTags();
        
        select.innerHTML = '<option value="">모든 태그</option>' + 
            tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        
        select.value = currentVal; // 선택 상태 유지
    },
    updateViewName(quoteId, viewId, newName) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (view) {
            view.name = newName;
            DataManager.saveQuote(quote);
            this.renderCalculator(); 
            this.updateHistoryButtons();
        }
    },

    setClientType(quoteId, type) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        if (type === 'preset') quote.customClient = null;
        else {
            quote.clientId = null;
            quote.customClient = quote.customClient || { name: '', discountRate: 0 };
        }
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    setQuoteClient(quoteId, clientId) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (quote) {
            quote.clientId = clientId || null;
            quote.customClient = null;
            DataManager.saveQuote(quote);
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    setCustomClient(quoteId, field, value) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        if (!quote.customClient) quote.customClient = { name: '', discountRate: 0 };
        quote.customClient[field] = value;
        quote.clientId = null;
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    addView(quoteId) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const lastView = quote.views[quote.views.length - 1];
        if (lastView) DataManager.duplicateView(quoteId, lastView.id);
        else {
            const newName = `뷰 ${quote.views.length + 1}`;
            const newView = DataManager.createView(newName);
            quote.views.push(newView);
            DataManager.saveQuote(quote);
        }
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    duplicateView(quoteId, viewId) {
        DataManager.captureState(this.state.activeQuoteId);
        DataManager.duplicateView(quoteId, viewId);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    removeView(quoteId, viewId) {
        DataManager.captureState(this.state.activeQuoteId);
        if (DataManager.removeView(quoteId, viewId)) {
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    addPart(quoteId, viewId) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const num = view.parts.length + 1;
        view.parts.push(DataManager.createPart(`파트 ${num}`));
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    duplicatePart(quoteId, viewId, partId) {
        DataManager.captureState(this.state.activeQuoteId);
        if (DataManager.duplicatePart(quoteId, viewId, partId)) {
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    deletePart(quoteId, viewId, partId) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        view.parts = view.parts.filter(p => p.id !== partId);
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    updatePart(quoteId, viewId, partId, field, value) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (part) {
            part[field] = value;
            DataManager.saveQuote(quote);
            this.renderCalculator();
            this.updateHistoryButtons();
        }
    },

    setPartMaterialName(quoteId, viewId, partId, materialName) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (!part) return;
        const colors = DataManager.getColorsForMaterial(materialName);
        if (colors.length > 0) part.materialId = colors[0].id;
        else part.materialId = null;
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    setPartMaterialColor(quoteId, viewId, partId, materialId) {
        this.updatePart(quoteId, viewId, partId, 'materialId', materialId || null);
    },

    addOption(quoteId, viewId, partId, type) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (!part) return;
        if (!part.options) part.options = [];
        part.options.push({ type, name: '', price: 0, priceType: 'fixed' });
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    updateOption(quoteId, viewId, partId, optionIndex, field, value) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (!part || !part.options || !part.options[optionIndex]) return;
        part.options[optionIndex][field] = value;
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    applyOptionPreset(quoteId, viewId, partId, optionIndex, presetId) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (!part || !part.options || !part.options[optionIndex]) return;
        const preset = DataManager.getOptionPreset(presetId);
        if (preset) {
            part.options[optionIndex].name = preset.name;
            part.options[optionIndex].price = preset.price;
            part.options[optionIndex].priceType = preset.priceType;
        }
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    removeOption(quoteId, viewId, partId, optionIndex) {
        DataManager.captureState(this.state.activeQuoteId);
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        const part = view.parts.find(p => p.id === partId);
        if (!part || !part.options) return;
        part.options.splice(optionIndex, 1);
        DataManager.saveQuote(quote);
        this.renderCalculator();
        this.updateHistoryButtons();
    },

    openMaterialModal(materialId = null) {
        const form = document.getElementById('form-material');
        form.reset();
        document.getElementById('material-id').value = '';
        if (materialId) {
            const material = DataManager.getMaterial(materialId);
            if (material) {
                document.getElementById('material-modal-title').textContent = '재료 수정';
                document.getElementById('material-id').value = material.id;
                document.getElementById('material-name').value = material.name;
                document.getElementById('material-color').value = material.color;
                document.getElementById('material-price').value = material.pricePerUnit;
            }
        } else document.getElementById('material-modal-title').textContent = '재료 추가';
        Modal.open('modal-material-edit');
    },

    saveMaterial() {
        const material = {
            id: document.getElementById('material-id').value || null,
            name: document.getElementById('material-name').value.trim(),
            color: document.getElementById('material-color').value.trim(),
            pricePerUnit: parseInt(document.getElementById('material-price').value) || 0
        };
        if (!material.name || !material.color) return;
        DataManager.saveMaterial(material);
        this.renderMaterialList();
        this.renderCalculator(); // 재료가 변경되었으므로 계산기도 업데이트
        Modal.close('modal-material-edit');
    },

    deleteMaterial(materialId) {
        if (!confirm('이 재료를 삭제하시겠습니까?')) return;
        DataManager.deleteMaterial(materialId);
        this.renderMaterialList();
        this.renderCalculator();
    },

    openClientModal(clientId = null) {
        const form = document.getElementById('form-client');
        form.reset();
        document.getElementById('client-id').value = '';
        if (clientId) {
            const client = DataManager.getClient(clientId);
            if (client) {
                document.getElementById('client-modal-title').textContent = '고객사 수정';
                document.getElementById('client-id').value = client.id;
                document.getElementById('client-name').value = client.name;
                document.getElementById('client-discount').value = client.discountRate;
            }
        } else document.getElementById('client-modal-title').textContent = '고객사 추가';
        Modal.open('modal-client-edit');
    },

    saveClient() {
        const client = {
            id: document.getElementById('client-id').value || null,
            name: document.getElementById('client-name').value.trim(),
            discountRate: parseInt(document.getElementById('client-discount').value) || 0
        };
        if (!client.name) return;
        DataManager.saveClient(client);
        this.renderClientList();
        this.renderCalculator();
        Modal.close('modal-client-edit');
    },

    deleteClient(clientId) {
        if (!confirm('이 고객사를 삭제하시겠습니까?')) return;
        DataManager.deleteClient(clientId);
        this.renderClientList();
        this.renderCalculator();
    },

    openOptionPresetModal(presetId = null) {
        const form = document.getElementById('form-option-preset');
        form.reset();
        document.getElementById('option-preset-id').value = '';
        if (presetId) {
            const preset = DataManager.getOptionPreset(presetId);
            if (preset) {
                document.getElementById('option-preset-modal-title').textContent = '옵션 수정';
                document.getElementById('option-preset-id').value = preset.id;
                document.getElementById('option-preset-type').value = preset.type;
                document.getElementById('option-preset-name').value = preset.name;
                document.getElementById('option-preset-price-type').value = preset.priceType;
                document.getElementById('option-preset-price').value = preset.price;
            }
        } else document.getElementById('option-preset-modal-title').textContent = '옵션 추가';
        Modal.open('modal-option-preset-edit');
    },

    saveOptionPreset() {
        const preset = {
            id: document.getElementById('option-preset-id').value || null,
            type: document.getElementById('option-preset-type').value,
            name: document.getElementById('option-preset-name').value.trim(),
            priceType: document.getElementById('option-preset-price-type').value,
            price: parseInt(document.getElementById('option-preset-price').value) || 0
        };
        if (!preset.name) return;
        DataManager.saveOptionPreset(preset);
        this.renderOptionPresetList();
        Modal.close('modal-option-preset-edit');
    },

    deleteOptionPreset(presetId) {
        if (!confirm('이 옵션을 삭제하시겠습니까?')) return;
        DataManager.deleteOptionPreset(presetId);
        this.renderOptionPresetList();
    },

    // === File System API 관련 ===
    async selectStorageFolder() {
        const success = await FileStorageManager.selectDirectory();
        if (success) {
            this.updateFileStorageUI();
            this.renderAll(); // 데이터가 변경되었을 수 있으므로 전체 갱신
        }
    },

    disableFileStorage() {
        if (!confirm('파일 저장을 해제하시겠습니까?\n\n기존에 저장된 파일은 삭제되지 않지만,\n앞으로의 변경사항은 브라우저에만 저장됩니다.')) return;

        FileStorageManager.disable();
        this.updateFileStorageUI();
    },

    updateFileStorageUI() {
        const status = FileStorageManager.getStatus();
        const statusEl = document.getElementById('file-storage-status');
        const noteEl = document.getElementById('file-storage-note');
        const selectBtn = document.getElementById('btn-select-folder');
        const disableBtn = document.getElementById('btn-disable-file-storage');

        if (!statusEl) return;

        if (!status.isSupported) {
            statusEl.innerHTML = `
                <div class="file-storage-status-badge warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>미지원 브라우저</span>
                </div>
            `;
            noteEl.textContent = 'Chrome, Edge 등 최신 브라우저에서만 사용 가능합니다.';
            selectBtn.disabled = true;
            disableBtn.style.display = 'none';
            return;
        }

        if (status.isEnabled && status.directoryName) {
            // 활성화됨
            const lastSaved = status.lastSaved
                ? new Date(status.lastSaved).toLocaleString('ko-KR')
                : '아직 저장되지 않음';

            statusEl.innerHTML = `
                <div class="file-storage-status-badge active">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>활성화됨</span>
                </div>
                <div class="file-storage-info">
                    <div class="file-storage-info-row">
                        <span class="label">저장 폴더:</span>
                        <span class="value">${status.directoryName}</span>
                    </div>
                    <div class="file-storage-info-row">
                        <span class="label">마지막 저장:</span>
                        <span class="value">${lastSaved}</span>
                    </div>
                </div>
            `;
            noteEl.textContent = '';
            selectBtn.textContent = '폴더 변경';
            disableBtn.style.display = 'flex';
        } else if (status.directoryName) {
            // 이전에 활성화되었지만 현재 연결 필요
            statusEl.innerHTML = `
                <div class="file-storage-status-badge warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>재연결 필요</span>
                </div>
            `;
            noteEl.textContent = `이전에 "${status.directoryName}" 폴더를 사용했습니다. 보안상 폴더를 다시 선택해주세요.`;
            selectBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                폴더 다시 연결
            `;
            disableBtn.style.display = 'flex';
        } else {
            // 비활성화됨
            statusEl.innerHTML = `
                <div class="file-storage-status-badge inactive">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>비활성화</span>
                </div>
            `;
            noteEl.textContent = '현재 데이터는 브라우저 localStorage에만 저장됩니다.';
            selectBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                저장 폴더 선택
            `;
            disableBtn.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
