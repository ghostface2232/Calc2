/**
 * 데이터 관리 모듈
 */
const DataManager = {
    KEYS: {
        MATERIALS: 'quote_materials',
        CLIENTS: 'quote_clients',
        QUOTES: 'quote_quotes',
        SETTINGS: 'quote_settings',
        OPTIONS: 'quote_option_presets'
    },

    // 히스토리 관리 변수
    history: [],
    redoStack: [],
    isHistoryAction: false,

    // 기본 재료 데이터
    DEFAULT_MATERIALS: [
        { id: 'mat_1', name: '스탠다드 레진', color: '그레이', pricePerUnit: 500 },
        { id: 'mat_2', name: '스탠다드 레진', color: '화이트', pricePerUnit: 500 },
        { id: 'mat_3', name: '스탠다드 레진', color: '블랙', pricePerUnit: 520 },
        { id: 'mat_4', name: '투명 레진', color: '클리어', pricePerUnit: 600 },
        { id: 'mat_5', name: '투명 레진', color: '스모크', pricePerUnit: 650 },
        { id: 'mat_6', name: 'ABS-Like 레진', color: '그레이', pricePerUnit: 700 },
        { id: 'mat_7', name: 'ABS-Like 레진', color: '블랙', pricePerUnit: 700 }
    ],

    DEFAULT_SETTINGS: {
        sidebarWidth: 240,
        sidebarCollapsed: false
    },

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return null;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Error saving ${key}:`, e);
            return false;
        }
    },

    init() {
        if (!this.load(this.KEYS.MATERIALS)) {
            this.save(this.KEYS.MATERIALS, this.DEFAULT_MATERIALS);
        }
        if (!this.load(this.KEYS.CLIENTS)) {
            this.save(this.KEYS.CLIENTS, []);
        }
        if (!this.load(this.KEYS.QUOTES)) {
            this.save(this.KEYS.QUOTES, []);
        }
        if (!this.load(this.KEYS.SETTINGS)) {
            this.save(this.KEYS.SETTINGS, this.DEFAULT_SETTINGS);
        }
        if (!this.load(this.KEYS.OPTIONS)) {
            this.save(this.KEYS.OPTIONS, []);
        }
    },

    // === 설정 (Settings) ===
    getSettings() {
        return this.load(this.KEYS.SETTINGS) || this.DEFAULT_SETTINGS;
    },

    saveSettings(settings) {
        this.save(this.KEYS.SETTINGS, settings);
    },

    // === 재료 (Materials) ===
    getMaterials() {
        return this.load(this.KEYS.MATERIALS) || [];
    },

    getMaterial(id) {
        return this.getMaterials().find(m => m.id === id);
    },

    getMaterialNames() {
        const materials = this.getMaterials();
        return [...new Set(materials.map(m => m.name))];
    },

    getColorsForMaterial(materialName) {
        const materials = this.getMaterials();
        return materials.filter(m => m.name === materialName);
    },

    findMaterial(name, color) {
        return this.getMaterials().find(m => m.name === name && m.color === color);
    },

    saveMaterial(material) {
        const materials = this.getMaterials();
        if (material.id) {
            const index = materials.findIndex(m => m.id === material.id);
            if (index !== -1) materials[index] = material;
        } else {
            material.id = this.generateId('mat');
            materials.push(material);
        }
        this.save(this.KEYS.MATERIALS, materials);
    },

    deleteMaterial(id) {
        const materials = this.getMaterials().filter(m => m.id !== id);
        this.save(this.KEYS.MATERIALS, materials);
    },

    // === 고객사 (Clients) ===
    getClients() {
        return this.load(this.KEYS.CLIENTS) || [];
    },

    getClient(id) {
        return this.getClients().find(c => c.id === id);
    },

    saveClient(client) {
        const clients = this.getClients();
        if (client.id) {
            const index = clients.findIndex(c => c.id === client.id);
            if (index !== -1) clients[index] = client;
        } else {
            client.id = this.generateId('cli');
            clients.push(client);
        }
        this.save(this.KEYS.CLIENTS, clients);
    },

    deleteClient(id) {
        const clients = this.getClients().filter(c => c.id !== id);
        this.save(this.KEYS.CLIENTS, clients);
    },

    // === 옵션 프리셋 (Option Presets) ===
    getOptionPresets() {
        return this.load(this.KEYS.OPTIONS) || [];
    },

    getOptionPreset(id) {
        return this.getOptionPresets().find(o => o.id === id);
    },

    saveOptionPreset(preset) {
        const presets = this.getOptionPresets();
        if (preset.id) {
            const index = presets.findIndex(p => p.id === preset.id);
            if (index !== -1) presets[index] = preset;
        } else {
            preset.id = this.generateId('opt');
            presets.push(preset);
        }
        this.save(this.KEYS.OPTIONS, presets);
    },

    deleteOptionPreset(id) {
        const presets = this.getOptionPresets().filter(p => p.id !== id);
        this.save(this.KEYS.OPTIONS, presets);
    },

    // === Undo / Redo Logic ===
    captureState(activeQuoteId) {
        if (this.isHistoryAction) return;

        const currentState = {
            quotes: this.getQuotes(),
            activeQuoteId: activeQuoteId || null
        };
        
        this.history.push(JSON.stringify(currentState));
        this.redoStack = [];
        
        if (this.history.length > 50) {
            this.history.shift();
        }
    },

    undo() {
        if (this.history.length === 0) return null;
        
        this.isHistoryAction = true;
        
        // 현재 상태 Redo 스택에 저장
        const currentState = {
            quotes: this.getQuotes(),
            activeQuoteId: App.state.activeQuoteId // App.state 참조 필요
        };
        this.redoStack.push(JSON.stringify(currentState));
        
        // 이전 상태 복원
        const previousState = JSON.parse(this.history.pop());
        this.save(this.KEYS.QUOTES, previousState.quotes);
        
        this.isHistoryAction = false;
        
        // 복원된 activeQuoteId 반환
        return previousState.activeQuoteId;
    },

    redo() {
        if (this.redoStack.length === 0) return null;

        this.isHistoryAction = true;

        // 현재 상태 Undo 스택에 저장
        const currentState = {
            quotes: this.getQuotes(),
            activeQuoteId: App.state.activeQuoteId
        };
        this.history.push(JSON.stringify(currentState));

        // 다음 상태 복원
        const nextState = JSON.parse(this.redoStack.pop());
        this.save(this.KEYS.QUOTES, nextState.quotes);

        this.isHistoryAction = false;
        
        return nextState.activeQuoteId;
    },

    canUndo() {
        return this.history.length > 0;
    },

    canRedo() {
        return this.redoStack.length > 0;
    },

    // === 견적 관리 (Quotes) ===
    getQuotes() {
        const quotes = this.load(this.KEYS.QUOTES) || [];
        
        // 데이터 무결성 보장 (필수 필드 누락 시 자동 생성)
        return quotes.map(quote => {
            if (!quote.views) {
                quote.views = [this.createView()];
            }
            
            quote.views.forEach((view, index) => {
                if (!view.name) {
                    view.name = `뷰 ${index + 1}`;
                }
                if (!view.parts) {
                    view.parts = [];
                }
                
                view.parts.forEach(part => {
                    if (!part.options) {
                        part.options = [];
                    }
                    part.options.forEach(opt => {
                        if (!opt.priceType) {
                            opt.priceType = 'fixed';
                        }
                    });
                });
            });
            return quote;
        });
    },

    getQuote(id) {
        return this.getQuotes().find(q => q.id === id);
    },

    createQuote(name = '새 견적') {
        // App.state.activeQuoteId가 아직 할당되지 않았을 수 있으므로 null 처리
        // 하지만 create 직후 activeQuoteId가 바뀔 것이므로, 이전 상태(현재 상태)를 캡처
        // App.js에서 호출 시 captureState 먼저 함
        const quote = {
            id: this.generateId('quote'),
            name: name,
            icon: null,
            clientId: null,
            customClient: null,
            views: [
                this.createView('뷰 1')
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const quotes = this.getQuotes();
        quotes.unshift(quote);
        this.save(this.KEYS.QUOTES, quotes);
        return quote;
    },

    createView(name = '뷰 1') {
        return {
            id: this.generateId('view'),
            name: name,
            parts: []
        };
    },

    saveQuote(quote) {
        const quotes = this.getQuotes();
        const index = quotes.findIndex(q => q.id === quote.id);
        quote.updatedAt = new Date().toISOString();
        
        if (index !== -1) {
            quotes[index] = quote;
        } else {
            quotes.unshift(quote);
        }
        this.save(this.KEYS.QUOTES, quotes);
    },

    deleteQuote(id) {
        const quotes = this.getQuotes().filter(q => q.id !== id);
        this.save(this.KEYS.QUOTES, quotes);
    },

    duplicateQuote(id) {
        const original = this.getQuote(id);
        if (!original) return null;

        const duplicate = JSON.parse(JSON.stringify(original));
        duplicate.id = this.generateId('quote');
        duplicate.name = original.name + ' (복사본)';
        duplicate.createdAt = new Date().toISOString();
        duplicate.updatedAt = new Date().toISOString();
        
        if (duplicate.views) {
            duplicate.views = duplicate.views.map(view => ({
                ...view,
                id: this.generateId('view'),
                parts: view.parts.map(part => ({
                    ...part,
                    id: this.generateId('part')
                }))
            }));
        }

        const quotes = this.getQuotes();
        quotes.unshift(duplicate);
        this.save(this.KEYS.QUOTES, quotes);
        return duplicate;
    },

    duplicateView(quoteId, viewId) {
        const quote = this.getQuote(quoteId);
        if (!quote) return null;

        const originalView = quote.views.find(v => v.id === viewId);
        if (!originalView) return null;

        const newView = JSON.parse(JSON.stringify(originalView));
        newView.id = this.generateId('view');
        newView.name = originalView.name + ' (복사본)';
        newView.parts = newView.parts.map(part => ({
            ...part,
            id: this.generateId('part')
        }));

        quote.views.push(newView);
        // 직접 전체 배열 저장하여 업데이트
        this.save(this.KEYS.QUOTES, this.getQuotes());
        return newView;
    },

    removeView(quoteId, viewId) {
        const quote = this.getQuote(quoteId);
        if (!quote || quote.views.length <= 1) return false;
        
        quote.views = quote.views.filter(v => v.id !== viewId);
        this.save(this.KEYS.QUOTES, this.getQuotes());
        return true;
    },

    createPart(name = '파트') {
        return {
            id: this.generateId('part'),
            name: name,
            materialId: null,
            volume: 0,
            options: []
        };
    },

    duplicatePart(quoteId, viewId, partId) {
        const quote = this.getQuote(quoteId);
        if (!quote) return null;

        const view = quote.views.find(v => v.id === viewId);
        if (!view) return null;

        const originalPart = view.parts.find(p => p.id === partId);
        if (!originalPart) return null;

        const newPart = JSON.parse(JSON.stringify(originalPart));
        newPart.id = this.generateId('part');
        newPart.name = `${originalPart.name} - 복사본`;

        const index = view.parts.indexOf(originalPart);
        view.parts.splice(index + 1, 0, newPart);

        this.save(this.KEYS.QUOTES, this.getQuotes());
        return newPart;
    },

    // === 계산 로직 ===
    calculatePartPrice(part) {
        const material = this.getMaterial(part.materialId);
        const pricePerUnit = material ? material.pricePerUnit : 500;
        const printingPrice = pricePerUnit * (part.volume || 0);
        
        let postProcessing = 0;
        let mechanism = 0;
        
        const options = part.options || [];
        
        options.forEach(opt => {
            let price = opt.price || 0;
            if (opt.priceType === 'percent') {
                price = Math.floor(printingPrice * (opt.price / 100));
            }
            
            if (opt.type === 'postProcessing') {
                postProcessing += price;
            } else {
                mechanism += price;
            }
        });
        
        return {
            printing: printingPrice,
            postProcessing: postProcessing,
            mechanism: mechanism,
            subtotal: printingPrice + postProcessing + mechanism
        };
    },

    calculateViewTotal(view) {
        let subtotal = 0;
        const partSummary = [];
        const parts = view.parts || [];
        
        parts.forEach(part => {
            const partPrice = this.calculatePartPrice(part);
            subtotal += partPrice.subtotal;
            partSummary.push({
                name: part.name,
                price: partPrice.subtotal
            });
        });
        
        return { partSummary, subtotal };
    },

    calculateQuoteTotal(quote, viewId = null) {
        const view = viewId 
            ? quote.views.find(v => v.id === viewId) 
            : quote.views[0];
        
        if (!view) return { partSummary: [], subtotal: 0, discountRate: 0, discountAmount: 0, total: 0 };

        const viewTotal = this.calculateViewTotal(view);
        
        let discountRate = 0;
        if (quote.clientId) {
            const client = this.getClient(quote.clientId);
            discountRate = client ? client.discountRate : 0;
        } else if (quote.customClient && typeof quote.customClient === 'object') {
            discountRate = quote.customClient.discountRate || 0;
        }
        
        const discountAmount = Math.floor(viewTotal.subtotal * discountRate / 100);
        const total = viewTotal.subtotal - discountAmount;
        
        return {
            ...viewTotal,
            discountRate,
            discountAmount,
            total
        };
    },

    formatNumber(num) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return num.toLocaleString('ko-KR');
    },

    formatCurrency(num) {
        return this.formatNumber(num) + '원';
    },

    // === 설정 Export / Import ===
    exportConfiguration() {
        const config = {
            materials: this.getMaterials(),
            clients: this.getClients(),
            options: this.getOptionPresets(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        return JSON.stringify(config, null, 2);
    },

    importConfiguration(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            
            if (config.materials && Array.isArray(config.materials)) {
                this.save(this.KEYS.MATERIALS, config.materials);
            }
            if (config.clients && Array.isArray(config.clients)) {
                this.save(this.KEYS.CLIENTS, config.clients);
            }
            if (config.options && Array.isArray(config.options)) {
                this.save(this.KEYS.OPTIONS, config.options);
            }
            if (config.settings && typeof config.settings === 'object') {
                this.save(this.KEYS.SETTINGS, config.settings);
            }
            
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
};

DataManager.init();