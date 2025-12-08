/**
 * 데이터 관리 모듈
 * LocalStorage를 사용하여 데이터를 저장하고 관리합니다.
 */
const DataManager = {
    // 기본 키
    KEYS: {
        QUOTES: 'gluck_quotes',
        MATERIALS: 'gluck_materials',
        CLIENTS: 'gluck_clients',
        OPTION_PRESETS: 'gluck_option_presets',
        SETTINGS: 'gluck_settings',
        LOCAL_SETTINGS: 'gluck_local_settings', // [수정 4] Export 제외용 로컬 설정 키 추가
        HISTORY: 'gluck_history'
    },

    // 초기 데이터
    DEFAULTS: {
        materials: [
            { id: 'mat_1', name: 'PA12', color: 'White', pricePerUnit: 150 },
            { id: 'mat_2', name: 'PA12', color: 'Grey', pricePerUnit: 180 },
            { id: 'mat_3', name: 'PA12', color: 'Black', pricePerUnit: 180 }
        ],
        settings: {
            sidebarCollapsed: false,
            // sidebarWidth는 이제 LOCAL_SETTINGS에서 관리되지만, 
            // 기존 데이터와의 하위 호환성을 위해 이곳의 기본값은 유지하거나 무시될 수 있음
        }
    },

    // Undo/Redo 스택
    history: {
        past: [],
        future: []
    },

    init() {
        if (!localStorage.getItem(this.KEYS.MATERIALS)) {
            this.saveMaterials(this.DEFAULTS.materials);
        }
        if (!localStorage.getItem(this.KEYS.SETTINGS)) {
            this.saveSettings(this.DEFAULTS.settings);
        }
        // 초기 로컬 설정이 없으면 기본값 설정 (필요시)
        if (!localStorage.getItem(this.KEYS.LOCAL_SETTINGS)) {
            this.saveLocalSetting('sidebarWidth', 280);
        }
    },

    // === 견적 관리 ===
    getQuotes() {
        return JSON.parse(localStorage.getItem(this.KEYS.QUOTES)) || [];
    },

    getQuote(id) {
        const quotes = this.getQuotes();
        return quotes.find(q => q.id === id) || null;
    },

    saveQuote(quote) {
        const quotes = this.getQuotes();
        const index = quotes.findIndex(q => q.id === quote.id);
        if (index >= 0) {
            quotes[index] = quote;
        } else {
            quotes.push(quote);
        }
        localStorage.setItem(this.KEYS.QUOTES, JSON.stringify(quotes));
    },

    saveQuotes(quotes) {
        localStorage.setItem(this.KEYS.QUOTES, JSON.stringify(quotes));
    },

    createQuote(name) {
        const quote = {
            id: 'qt_' + Date.now(),
            name: name,
            // [수정 1] icon 필드 초기화 제거 (첫 글자 자동 썸네일 사용으로 불필요)
            createdAt: new Date().toISOString(),
            clientId: null,
            customClient: null,
            views: [this.createView()]
        };
        this.saveQuote(quote);
        return quote;
    },

    deleteQuote(id) {
        const quotes = this.getQuotes().filter(q => q.id !== id);
        this.saveQuotes(quotes);
    },

    duplicateQuote(id) {
        const quote = this.getQuote(id);
        if (!quote) return null;

        const newQuote = JSON.parse(JSON.stringify(quote));
        newQuote.id = 'qt_' + Date.now();
        newQuote.name = `${quote.name} (복사본)`;
        newQuote.createdAt = new Date().toISOString();
        
        // 뷰와 파트 ID도 새로 생성해야 함
        newQuote.views.forEach(view => {
            view.id = 'vw_' + Math.random().toString(36).substr(2, 9);
            view.parts.forEach(part => {
                part.id = 'pt_' + Math.random().toString(36).substr(2, 9);
            });
        });

        this.saveQuote(newQuote);
        return newQuote;
    },

    // === 뷰/파트 관리 ===
    createView(name = '기본 뷰') {
        return {
            id: 'vw_' + Math.random().toString(36).substr(2, 9),
            name: name,
            parts: []
        };
    },

    createPart(name = '파트 1') {
        return {
            id: 'pt_' + Math.random().toString(36).substr(2, 9),
            name: name,
            materialId: null,
            volume: 0,
            options: [] // { type: 'postProcessing' | 'mechanism', name: '', price: 0, priceType: 'fixed' | 'percent' }
        };
    },

    duplicateView(quoteId, viewId) {
        const quote = this.getQuote(quoteId);
        if (!quote) return;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return;

        const newView = JSON.parse(JSON.stringify(view));
        newView.id = 'vw_' + Math.random().toString(36).substr(2, 9);
        newView.name = `${view.name} (복사본)`;
        newView.parts.forEach(p => p.id = 'pt_' + Math.random().toString(36).substr(2, 9));
        
        quote.views.push(newView);
        this.saveQuote(quote);
        return newView;
    },

    removeView(quoteId, viewId) {
        const quote = this.getQuote(quoteId);
        if (!quote || quote.views.length <= 1) return false;
        
        quote.views = quote.views.filter(v => v.id !== viewId);
        this.saveQuote(quote);
        return true;
    },

    duplicatePart(quoteId, viewId, partId) {
        const quote = this.getQuote(quoteId);
        if (!quote) return false;
        
        const view = quote.views.find(v => v.id === viewId);
        if (!view) return false;

        const partIndex = view.parts.findIndex(p => p.id === partId);
        if (partIndex === -1) return false;

        const newPart = JSON.parse(JSON.stringify(view.parts[partIndex]));
        newPart.id = 'pt_' + Math.random().toString(36).substr(2, 9);
        newPart.name = `${newPart.name} (복사본)`;
        
        view.parts.splice(partIndex + 1, 0, newPart);
        this.saveQuote(quote);
        return true;
    },

    // === 재료 관리 ===
    getMaterials() {
        return JSON.parse(localStorage.getItem(this.KEYS.MATERIALS)) || this.DEFAULTS.materials;
    },

    getMaterial(id) {
        return this.getMaterials().find(m => m.id === id);
    },

    getMaterialNames() {
        const materials = this.getMaterials();
        return [...new Set(materials.map(m => m.name))];
    },

    getColorsForMaterial(name) {
        return this.getMaterials().filter(m => m.name === name);
    },

    saveMaterial(material) {
        let materials = this.getMaterials();
        if (material.id) {
            const index = materials.findIndex(m => m.id === material.id);
            if (index >= 0) materials[index] = material;
        } else {
            material.id = 'mat_' + Date.now();
            materials.push(material);
        }
        localStorage.setItem(this.KEYS.MATERIALS, JSON.stringify(materials));
    },

    deleteMaterial(id) {
        const materials = this.getMaterials().filter(m => m.id !== id);
        localStorage.setItem(this.KEYS.MATERIALS, JSON.stringify(materials));
    },

    // === 고객사 관리 ===
    getClients() {
        return JSON.parse(localStorage.getItem(this.KEYS.CLIENTS)) || [];
    },

    getClient(id) {
        return this.getClients().find(c => c.id === id);
    },

    saveClient(client) {
        let clients = this.getClients();
        if (client.id) {
            const index = clients.findIndex(c => c.id === client.id);
            if (index >= 0) clients[index] = client;
        } else {
            client.id = 'cli_' + Date.now();
            clients.push(client);
        }
        localStorage.setItem(this.KEYS.CLIENTS, JSON.stringify(clients));
    },

    deleteClient(id) {
        const clients = this.getClients().filter(c => c.id !== id);
        localStorage.setItem(this.KEYS.CLIENTS, JSON.stringify(clients));
    },

    // === 옵션 프리셋 관리 ===
    getOptionPresets() {
        return JSON.parse(localStorage.getItem(this.KEYS.OPTION_PRESETS)) || [];
    },

    getOptionPreset(id) {
        return this.getOptionPresets().find(p => p.id === id);
    },

    saveOptionPreset(preset) {
        let presets = this.getOptionPresets();
        if (preset.id) {
            const index = presets.findIndex(p => p.id === preset.id);
            if (index >= 0) presets[index] = preset;
        } else {
            preset.id = 'opt_' + Date.now();
            presets.push(preset);
        }
        localStorage.setItem(this.KEYS.OPTION_PRESETS, JSON.stringify(presets));
    },

    deleteOptionPreset(id) {
        const presets = this.getOptionPresets().filter(p => p.id !== id);
        localStorage.setItem(this.KEYS.OPTION_PRESETS, JSON.stringify(presets));
    },

    // === 설정 관리 ===
    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || this.DEFAULTS.settings;
    },

    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    // [수정 4] 로컬 전용 설정 (Export 제외) 관리 메서드 추가
    // app.js에서 호출됨: DataManager.getLocalSetting('sidebarWidth')
    getLocalSetting(key) {
        const localData = JSON.parse(localStorage.getItem(this.KEYS.LOCAL_SETTINGS)) || {};
        return localData[key];
    },

    saveLocalSetting(key, value) {
        const localData = JSON.parse(localStorage.getItem(this.KEYS.LOCAL_SETTINGS)) || {};
        localData[key] = value;
        localStorage.setItem(this.KEYS.LOCAL_SETTINGS, JSON.stringify(localData));
    },

    // === 계산 로직 ===
    calculatePartPrice(part) {
        let printingPrice = 0;
        let material = null;
        
        if (part.materialId) {
            material = this.getMaterial(part.materialId);
        }

        if (material && part.volume > 0) {
            printingPrice = part.volume * material.pricePerUnit;
        }

        let postProcessingPrice = 0;
        let mechanismPrice = 0;

        if (part.options) {
            part.options.forEach(opt => {
                let price = 0;
                if (opt.priceType === 'percent') {
                    price = printingPrice * (opt.price / 100);
                } else {
                    price = opt.price;
                }

                if (opt.type === 'postProcessing') postProcessingPrice += price;
                else mechanismPrice += price;
            });
        }

        return {
            printing: Math.round(printingPrice),
            postProcessing: Math.round(postProcessingPrice),
            mechanism: Math.round(mechanismPrice),
            subtotal: Math.round(printingPrice + postProcessingPrice + mechanismPrice)
        };
    },

    calculateQuoteTotal(quote, viewId = null) {
        if (!quote) return { total: 0, partSummary: [] };

        // viewId가 있으면 해당 뷰만, 없으면 첫 번째 뷰 기준(혹은 전체 합산 정책에 따라)
        // 여기서는 화면에 보이는 뷰 단위 계산을 지원
        let view = quote.views.find(v => v.id === viewId);
        if (!view && quote.views.length > 0) view = quote.views[0];
        if (!view) return { total: 0, partSummary: [] };

        let total = 0;
        const partSummary = [];

        view.parts.forEach(part => {
            const prices = this.calculatePartPrice(part);
            total += prices.subtotal;
            partSummary.push({
                name: part.name,
                price: prices.subtotal
            });
        });

        let discountRate = 0;
        if (quote.clientId) {
            const client = this.getClient(quote.clientId);
            if (client) discountRate = client.discountRate;
        } else if (quote.customClient) {
            discountRate = quote.customClient.discountRate || 0;
        }

        const discountAmount = Math.round(total * (discountRate / 100));
        const finalTotal = total - discountAmount;

        return {
            total: finalTotal,
            subtotal: total,
            discountRate,
            discountAmount,
            partSummary
        };
    },

    formatNumber(num) {
        return new Intl.NumberFormat('ko-KR').format(num);
    },

    formatCurrency(num) {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);
    },

    // === Import/Export ===
    exportConfiguration() {
        const data = {
            quotes: this.getQuotes(),
            materials: this.getMaterials(),
            clients: this.getClients(),
            optionPresets: this.getOptionPresets(),
            settings: this.getSettings() // 여기에는 sidebarCollapsed 등 글로벌 설정만 포함됨
        };
        
        // [수정 4] sidebarWidth는 LOCAL_SETTINGS에 별도로 저장되므로 
        // settings 객체 안에 혹시라도 남아있을 수 있는 sidebarWidth를 명시적으로 제거하여 내보냄
        if (data.settings.sidebarWidth) {
            const cleanSettings = { ...data.settings };
            delete cleanSettings.sidebarWidth;
            data.settings = cleanSettings;
        }

        return JSON.stringify(data, null, 2);
    },

    importConfiguration(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // 데이터 유효성 검사 (간단하게)
            if (data.quotes) localStorage.setItem(this.KEYS.QUOTES, JSON.stringify(data.quotes));
            if (data.materials) localStorage.setItem(this.KEYS.MATERIALS, JSON.stringify(data.materials));
            if (data.clients) localStorage.setItem(this.KEYS.CLIENTS, JSON.stringify(data.clients));
            if (data.optionPresets) localStorage.setItem(this.KEYS.OPTION_PRESETS, JSON.stringify(data.optionPresets));
            if (data.settings) localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
            
            // localSettings(사이드바 너비 등)는 덮어쓰지 않음 (현재 환경 유지)

            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    },

    // === Undo/Redo (메모리 상에서만 관리) ===
    captureState(activeQuoteId) {
        // 현재 상태 스냅샷 저장 (최대 20개)
        const snapshot = {
            quotes: JSON.stringify(this.getQuotes()),
            activeQuoteId: activeQuoteId
        };
        
        this.history.past.push(snapshot);
        if (this.history.past.length > 20) this.history.past.shift();
        
        // 새로운 동작이 발생하면 미래 기록은 날림
        this.history.future = [];
    },

    undo() {
        if (this.history.past.length === 0) return null;

        // 현재 상태를 미래 스택으로
        const currentSnapshot = {
            quotes: localStorage.getItem(this.KEYS.QUOTES),
            activeQuoteId: null // 호출하는 쪽에서 처리하거나 저장 필요시 수정
        };
        this.history.future.push(currentSnapshot);

        const previousState = this.history.past.pop();
        localStorage.setItem(this.KEYS.QUOTES, previousState.quotes);
        return previousState.activeQuoteId;
    },

    redo() {
        if (this.history.future.length === 0) return null;

        // 현재 상태를 과거 스택으로
        const currentSnapshot = {
            quotes: localStorage.getItem(this.KEYS.QUOTES),
            activeQuoteId: null
        };
        this.history.past.push(currentSnapshot);

        const nextState = this.history.future.pop();
        localStorage.setItem(this.KEYS.QUOTES, nextState.quotes);
        return nextState.activeQuoteId || true; // ID가 없으면 그냥 성공 플래그
    },

    canUndo() {
        return this.history.past.length > 0;
    },

    canRedo() {
        return this.history.future.length > 0;
    }
};

DataManager.init();
