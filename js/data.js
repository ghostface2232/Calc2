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

    // 재료: 이름+컬러 조합별로 개별 단가
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

    // === 설정 ===
    getSettings() {
        return this.load(this.KEYS.SETTINGS) || this.DEFAULT_SETTINGS;
    },

    saveSettings(settings) {
        this.save(this.KEYS.SETTINGS, settings);
    },

    // === 재료 ===
    getMaterials() {
        return this.load(this.KEYS.MATERIALS) || [];
    },

    getMaterial(id) {
        return this.getMaterials().find(m => m.id === id);
    },

    // 재료명 목록 (중복 제거)
    getMaterialNames() {
        const materials = this.getMaterials();
        return [...new Set(materials.map(m => m.name))];
    },

    // 특정 재료명의 컬러 목록
    getColorsForMaterial(materialName) {
        const materials = this.getMaterials();
        return materials.filter(m => m.name === materialName);
    },

    // 재료명 + 컬러로 찾기
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
        return material;
    },

    deleteMaterial(id) {
        const materials = this.getMaterials().filter(m => m.id !== id);
        this.save(this.KEYS.MATERIALS, materials);
    },

    // === 고객사 (핵심 고객사) ===
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
        return client;
    },

    deleteClient(id) {
        const clients = this.getClients().filter(c => c.id !== id);
        this.save(this.KEYS.CLIENTS, clients);
    },

    // === 옵션 프리셋 ===
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
        return preset;
    },

    deleteOptionPreset(id) {
        const presets = this.getOptionPresets().filter(p => p.id !== id);
        this.save(this.KEYS.OPTIONS, presets);
    },

    // === 견적 ===
    getQuotes() {
        const quotes = this.load(this.KEYS.QUOTES) || [];
        
        // 데이터 마이그레이션 (구버전 호환)
        return quotes.map(quote => {
            // views 배열이 없는 경우
            if (!quote.views) {
                quote.views = [this.createView()];
            }
            
            quote.views.forEach((view, index) => {
                // 뷰 이름이 없는 경우
                if (!view.name) {
                    view.name = `뷰 ${index + 1}`;
                }
                // parts 배열이 없는 경우
                if (!view.parts) {
                    view.parts = [];
                }
                // 파트별 옵션의 가격 타입이 없는 경우 'fixed'로 기본값
                view.parts.forEach(part => {
                    if (part.options) {
                        part.options.forEach(opt => {
                            if (!opt.priceType) opt.priceType = 'fixed';
                        });
                    }
                });
            });
            return quote;
        });
    },

    getQuote(id) {
        return this.getQuotes().find(q => q.id === id);
    },

    createQuote(name = '새 견적') {
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
        return quote;
    },

    deleteQuote(id) {
        const quotes = this.getQuotes().filter(q => q.id !== id);
        this.save(this.KEYS.QUOTES, quotes);
    },

    // 견적 파일 복제
    duplicateQuote(id) {
        const original = this.getQuote(id);
        if (!original) return null;

        const duplicate = JSON.parse(JSON.stringify(original));
        duplicate.id = this.generateId('quote');
        duplicate.name = original.name + ' (복사본)';
        duplicate.createdAt = new Date().toISOString();
        duplicate.updatedAt = new Date().toISOString();
        
        // 뷰와 파트 ID 재생성
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

    // 뷰 복제
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

    createPart(name = '파트') {
        return {
            id: this.generateId('part'),
            name: name,
            materialId: null,
            volume: 0,
            options: []
        };
    },

    // 파트 복제
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

        this.saveQuote(quote);
        return newPart;
    },

    // === 계산 ===
    calculatePartPrice(part) {
        const material = this.getMaterial(part.materialId);
        const pricePerUnit = material ? material.pricePerUnit : 500;
        const printingPrice = pricePerUnit * (part.volume || 0);
        
        let postProcessing = 0;
        let mechanism = 0;
        
        if (part.options) {
            part.options.forEach(opt => {
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
        }
        
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
        
        if (view.parts) {
            view.parts.forEach(part => {
                const partPrice = this.calculatePartPrice(part);
                subtotal += partPrice.subtotal;
                partSummary.push({
                    name: part.name,
                    price: partPrice.subtotal
                });
            });
        }
        
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
        } else if (quote.customClient) {
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
        return num.toLocaleString('ko-KR');
    },

    formatCurrency(num) {
        return this.formatNumber(num) + '원';
    }
};

DataManager.init();