/**
 * 메인 애플리케이션
 */
const App = {
    state: {
        activeQuoteId: null,
        // targetQuoteIdForIcon 삭제됨 (아이콘 커스텀 기능 제거)
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
    },

    // UI 전체 업데이트
    renderAll() {
        this.renderQuoteList();
        this.renderCalculator();
        this.renderMaterialList();
        this.renderClientList();
        this.renderOptionPresetList();
        // renderIconPicker 호출 제거
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
        document.getElementById('btn-settings').addEventListener('click', () => Modal.open('modal-settings'));
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
        const quotes = DataManager.getQuotes();
        if (Calculator.renderQuoteList) {
            Calculator.renderQuoteList(quotes, this.state.activeQuoteId);
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

    // [버그 수정 1] 아이콘 피커 관련 메서드 삭제 (openIconPicker, renderIconPicker, setIcon)

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
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
