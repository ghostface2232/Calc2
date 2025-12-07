/**
 * 메인 애플리케이션
 */
const App = {
    state: {
        activeQuoteId: null
    },

    init() {
        Modal.init();
        TabManager.init();
        this.initSidebar();
        this.bindEvents();
        this.renderQuoteList();
        this.renderCalculator();
        this.renderMaterialList();
        this.renderClientList();
        this.renderOptionPresetList();
    },

    // === 사이드바 초기화 ===
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const settings = DataManager.getSettings();
        
        if (!settings.sidebarCollapsed) {
            sidebar.style.width = settings.sidebarWidth + 'px';
            document.documentElement.style.setProperty('--sidebar-width', settings.sidebarWidth + 'px');
        }
        
        if (settings.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
        
        const resizeHandle = document.getElementById('sidebar-resize');
        let isResizing = false;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeHandle.classList.add('active');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
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
                settings.sidebarWidth = parseInt(sidebar.style.width);
                DataManager.saveSettings(settings);
            }
        });
        
        document.getElementById('btn-collapse').addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            const settings = DataManager.getSettings();
            settings.sidebarCollapsed = sidebar.classList.contains('collapsed');
            
            if (!settings.sidebarCollapsed) {
                sidebar.style.width = settings.sidebarWidth + 'px';
            } else {
                sidebar.style.width = ''; 
            }
            
            DataManager.saveSettings(settings);
        });
    },

    bindEvents() {
        document.getElementById('btn-new-quote').addEventListener('click', () => this.createNewQuote());
        document.getElementById('btn-settings').addEventListener('click', () => Modal.open('modal-settings'));
        document.getElementById('btn-add-material').addEventListener('click', () => this.openMaterialModal());
        document.getElementById('btn-add-client').addEventListener('click', () => this.openClientModal());
        document.getElementById('btn-add-option-preset').addEventListener('click', () => this.openOptionPresetModal());
        
        document.getElementById('form-material').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMaterial();
        });
        document.getElementById('form-client').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClient();
        });
        document.getElementById('form-option-preset').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOptionPreset();
        });
        document.getElementById('form-quote-name').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuoteName();
        });
    },

    // === 견적 관리 ===
    createNewQuote() {
        const quotes = DataManager.getQuotes();
        const num = quotes.length + 1;
        const quote = DataManager.createQuote(`견적 ${String(num).padStart(2, '0')}`);
        this.state.activeQuoteId = quote.id;
        this.renderQuoteList();
        this.renderCalculator();
    },

    selectQuote(quoteId) {
        this.state.activeQuoteId = quoteId;
        this.renderQuoteList();
        this.renderCalculator();
    },

    deleteQuote(quoteId) {
        if (!confirm('이 견적을 삭제하시겠습니까?')) return;
        DataManager.deleteQuote(quoteId);
        if (this.state.activeQuoteId === quoteId) {
            this.state.activeQuoteId = null;
        }
        this.renderQuoteList();
        this.renderCalculator();
    },

    duplicateQuote(quoteId) {
        const duplicate = DataManager.duplicateQuote(quoteId);
        if (duplicate) {
            this.state.activeQuoteId = duplicate.id;
            this.renderQuoteList();
            this.renderCalculator();
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
        const quoteId = document.getElementById('quote-name-id').value;
        const name = document.getElementById('quote-name-input').value.trim();
        if (!name) return;
        
        const quote = DataManager.getQuote(quoteId);
        if (quote) {
            quote.name = name;
            DataManager.saveQuote(quote);
            this.renderQuoteList();
            this.renderCalculator();
        }
        Modal.close('modal-quote-name');
    },

    // === 고객사 설정 ===
    setClientType(quoteId, type) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        if (type === 'preset') {
            quote.customClient = null;
        } else {
            quote.clientId = null;
            quote.customClient = quote.customClient || { name: '', discountRate: 0 };
        }
        
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    setQuoteClient(quoteId, clientId) {
        const quote = DataManager.getQuote(quoteId);
        if (quote) {
            quote.clientId = clientId || null;
            quote.customClient = null;
            DataManager.saveQuote(quote);
            this.renderCalculator();
        }
    },

    setCustomClient(quoteId, field, value) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        if (!quote.customClient) {
            quote.customClient = { name: '', discountRate: 0 };
        }
        quote.customClient[field] = value;
        quote.clientId = null;
        
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    // === 뷰 관리 ===
    addView(quoteId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const lastView = quote.views[quote.views.length - 1];
        if (lastView) {
            DataManager.duplicateView(quoteId, lastView.id);
        } else {
            quote.views.push(DataManager.createView());
            DataManager.saveQuote(quote);
        }
        
        this.renderCalculator();
    },

    duplicateView(quoteId, viewId) {
        DataManager.duplicateView(quoteId, viewId);
        this.renderCalculator();
    },

    removeView(quoteId, viewId) {
        if (DataManager.removeView(quoteId, viewId)) {
            this.renderCalculator();
        }
    },

    // === 파트 관리 ===
    addPart(quoteId, viewId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        const num = view.parts.length + 1;
        view.parts.push(DataManager.createPart(`파트 ${num}`));
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    duplicatePart(quoteId, viewId, partId) {
        if (DataManager.duplicatePart(quoteId, viewId, partId)) {
            this.renderCalculator();
        }
    },

    deletePart(quoteId, viewId, partId) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        view.parts = view.parts.filter(p => p.id !== partId);
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    updatePart(quoteId, viewId, partId, field, value) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        const part = view.parts.find(p => p.id === partId);
        if (part) {
            part[field] = value;
            DataManager.saveQuote(quote);
            this.renderCalculator();
        }
    },

    setPartMaterialName(quoteId, viewId, partId, materialName) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        const part = view.parts.find(p => p.id === partId);
        if (!part) return;
        
        const colors = DataManager.getColorsForMaterial(materialName);
        if (colors.length > 0) {
            part.materialId = colors[0].id;
        } else {
            part.materialId = null;
        }
        
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    setPartMaterialColor(quoteId, viewId, partId, materialId) {
        this.updatePart(quoteId, viewId, partId, 'materialId', materialId || null);
    },

    // === 옵션 관리 ===
    addOption(quoteId, viewId, partId, type) {
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
    },

    updateOption(quoteId, viewId, partId, optionIndex, field, value) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        const part = view.parts.find(p => p.id === partId);
        if (!part || !part.options || !part.options[optionIndex]) return;
        
        part.options[optionIndex][field] = value;
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    applyOptionPreset(quoteId, viewId, partId, optionIndex, presetId) {
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
    },

    removeOption(quoteId, viewId, partId, optionIndex) {
        const quote = DataManager.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;
        
        const part = view.parts.find(p => p.id === partId);
        if (!part || !part.options) return;
        
        part.options.splice(optionIndex, 1);
        DataManager.saveQuote(quote);
        this.renderCalculator();
    },

    // === 재료 관리 ===
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
        } else {
            document.getElementById('material-modal-title').textContent = '재료 추가';
        }
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
        this.renderCalculator();
        Modal.close('modal-material-edit');
    },

    deleteMaterial(materialId) {
        if (!confirm('이 재료를 삭제하시겠습니까?')) return;
        DataManager.deleteMaterial(materialId);
        this.renderMaterialList();
        this.renderCalculator();
    },

    // === 고객사 관리 ===
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
        } else {
            document.getElementById('client-modal-title').textContent = '고객사 추가';
        }
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

    // === 옵션 프리셋 관리 ===
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
        } else {
            document.getElementById('option-preset-modal-title').textContent = '옵션 추가';
        }
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

    // === 렌더링 ===
    renderQuoteList() {
        const container = document.getElementById('quote-list');
        const quotes = DataManager.getQuotes();
        
        if (quotes.length === 0) {
            container.innerHTML = `<li class="quote-list-empty">견적이 없습니다<br>새 견적을 생성하세요</li>`;
            return;
        }
        
        container.innerHTML = quotes.map(quote => {
            const isActive = quote.id === this.state.activeQuoteId;
            
            return `
                <li class="quote-list-item ${isActive ? 'active' : ''}" 
                    onclick="App.selectQuote('${quote.id}')">
                    <div class="quote-color"></div>
                    <span class="quote-list-item-name">${quote.name}</span>
                    <div class="quote-list-item-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); App.editQuoteName('${quote.id}')" title="이름 변경">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); App.duplicateQuote('${quote.id}')" title="견적 복제">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="event.stopPropagation(); App.deleteQuote('${quote.id}')" title="삭제">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    },

    renderCalculator() {
        const container = document.getElementById('calculator-container');
        const quote = DataManager.getQuote(this.state.activeQuoteId);
        container.innerHTML = Calculator.renderQuote(quote);
    },

    renderMaterialList() {
        const container = document.getElementById('material-list');
        const materials = DataManager.getMaterials();
        
        if (materials.length === 0) {
            container.innerHTML = '<li class="item-list-empty">등록된 재료가 없습니다</li>';
            return;
        }
        
        container.innerHTML = materials.map(m => `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">${m.name} - ${m.color}</div>
                    <div class="item-list-item-detail">${DataManager.formatCurrency(m.pricePerUnit)} / 단위</div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openMaterialModal('${m.id}')" title="수정">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteMaterial('${m.id}')" title="삭제">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    },

    renderClientList() {
        const container = document.getElementById('client-list');
        const clients = DataManager.getClients();
        
        if (clients.length === 0) {
            container.innerHTML = '<li class="item-list-empty">등록된 핵심 고객사가 없습니다</li>';
            return;
        }
        
        container.innerHTML = clients.map(c => `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">${c.name}</div>
                    <div class="item-list-item-detail">할인율: ${c.discountRate}%</div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openClientModal('${c.id}')" title="수정">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteClient('${c.id}')" title="삭제">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    },

    renderOptionPresetList() {
        const container = document.getElementById('option-preset-list');
        const presets = DataManager.getOptionPresets();
        
        if (presets.length === 0) {
            container.innerHTML = '<li class="item-list-empty">등록된 옵션 프리셋이 없습니다</li>';
            return;
        }
        
        container.innerHTML = presets.map(p => {
            const priceText = p.priceType === 'percent' ? `+${p.price}%` : `+${DataManager.formatCurrency(p.price)}`;
            const typeText = p.type === 'postProcessing' ? '후가공' : '옵션';
            return `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">${p.name} <small style="color:var(--color-text-light); font-weight:normal">(${typeText})</small></div>
                    <div class="item-list-item-detail">${priceText}</div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openOptionPresetModal('${p.id}')" title="수정">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteOptionPreset('${p.id}')" title="삭제">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `}).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());