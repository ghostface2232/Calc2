/**
 * 계산기 UI 렌더링
 */
const Calculator = {
    renderQuote(quote) {
        if (!quote) return this.renderEmpty();

        const clients = DataManager.getClients();
        const isCustomClient = !quote.clientId && quote.customClient;
        const selectedClient = quote.clientId ? DataManager.getClient(quote.clientId) : null;
        
        let viewsHtml = quote.views.map((view, index) => 
            this.renderView(quote, view, index)
        ).join('');

        viewsHtml += `
            <button class="btn-add-view" onclick="App.addView('${quote.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>비교 뷰 추가</span>
            </button>
        `;

        return viewsHtml;
    },

    renderView(quote, view, viewIndex) {
        const materials = DataManager.getMaterials();
        const clients = DataManager.getClients();
        const totals = DataManager.calculateQuoteTotal(quote, view.id);
        const isCustomClient = !quote.clientId && quote.customClient;
        const selectedClient = quote.clientId ? DataManager.getClient(quote.clientId) : null;
        const canRemove = quote.views.length > 1;

        const viewName = view.name ? view.name : `뷰 ${viewIndex + 1}`;
        const viewLabel = `
            <div class="view-name-container">
                <span class="view-name-separator">|</span>
                <input type="text" 
                       class="view-name-input" 
                       id="view-name-${view.id}"
                       value="${viewName}" 
                       readonly
                       onblur="this.readOnly = true;"
                       onchange="App.updateViewName('${quote.id}', '${view.id}', this.value)"
                       onkeypress="if(event.key === 'Enter') this.blur();">
            </div>
        `;

        return `
            <div class="calculator" data-quote-id="${quote.id}" data-view-id="${view.id}">
                <div class="calculator-header">
                    <div class="calculator-title">
                        <h2>
                            <span class="quote-name">${quote.name}</span>
                            ${viewLabel}
                        </h2>
                        <div class="calculator-title-actions">
                            <button class="btn-icon" onclick="const input = document.getElementById('view-name-${view.id}'); input.readOnly = false; input.focus(); input.select();" title="뷰 이름 수정">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            ${canRemove ? `
                                <button class="btn-icon danger" onclick="App.removeView('${quote.id}', '${view.id}')" title="이 뷰 삭제">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="calculator-client">
                        <div class="client-type-toggle">
                            <button class="client-type-btn ${!isCustomClient ? 'active' : ''}" 
                                    onclick="App.setClientType('${quote.id}', 'preset')">핵심 고객사</button>
                            <button class="client-type-btn ${isCustomClient ? 'active' : ''}" 
                                    onclick="App.setClientType('${quote.id}', 'custom')">직접 입력</button>
                        </div>
                    </div>
                    
                    <div class="client-row">
                        ${!isCustomClient ? `
                            <select class="client-select" onchange="App.setQuoteClient('${quote.id}', this.value)">
                                <option value="">고객사 선택</option>
                                ${clients.map(c => `
                                    <option value="${c.id}" ${quote.clientId === c.id ? 'selected' : ''}>
                                        ${c.name} (${c.discountRate}%)
                                    </option>
                                `).join('')}
                            </select>
                            ${selectedClient ? `<span class="discount-badge">-${selectedClient.discountRate}%</span>` : ''}
                        ` : `
                            <input type="text" class="client-input" 
                                   value="${quote.customClient?.name || ''}" 
                                   placeholder="고객사명"
                                   onchange="App.setCustomClient('${quote.id}', 'name', this.value)">
                            <input type="number" class="client-discount-input" 
                                   value="${quote.customClient?.discountRate || ''}" 
                                   placeholder="할인%"
                                   min="0" max="100"
                                   onchange="App.setCustomClient('${quote.id}', 'discountRate', parseInt(this.value) || 0)">
                            ${quote.customClient?.discountRate ? `<span class="discount-badge">-${quote.customClient.discountRate}%</span>` : ''}
                        `}
                    </div>
                </div>
                
                <div class="calculator-body">
                    ${view.parts && view.parts.length > 0 ? 
                        view.parts.map((part, i) => this.renderPart(quote.id, view.id, part, i, materials)).join('') : ''
                    }
                    
                    <button class="btn-add-part" onclick="App.addPart('${quote.id}', '${view.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        파트 추가
                    </button>
                </div>
                
                <div class="calculator-footer">
                    <div class="footer-title">최종 견적</div>
                    <div class="summary-pills">
                        ${totals.partSummary.map(p => `
                            <div class="summary-pill">
                                <span>${p.name}</span>
                                <span class="amount">${DataManager.formatNumber(p.price)}</span>
                            </div>
                        `).join('')}
                        ${totals.discountRate > 0 ? `
                            <div class="summary-pill discount">
                                <span>할인 ${totals.discountRate}%</span>
                                <span class="amount">-${DataManager.formatNumber(totals.discountAmount)}</span>
                            </div>
                        ` : ''}
                        <div class="summary-pill total">
                            <span>최종 가격</span>
                            <span class="amount">${DataManager.formatCurrency(totals.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPart(quoteId, viewId, part, partIndex, materials) {
        const partPrice = DataManager.calculatePartPrice(part);
        const materialNames = DataManager.getMaterialNames();
        const selectedMaterial = DataManager.getMaterial(part.materialId);
        
        let colorOptions = [];
        if (selectedMaterial) {
            colorOptions = DataManager.getColorsForMaterial(selectedMaterial.name);
        }

        const optionPresets = DataManager.getOptionPresets();

        return `
            <div class="part-card" data-part-id="${part.id}">
                <div class="part-header">
                    <div class="part-name-wrapper">
                        <input type="text" 
                               class="part-name" 
                               value="${part.name}" 
                               readonly
                               onblur="this.readOnly = true;"
                               onchange="App.updatePart('${quoteId}', '${viewId}', '${part.id}', 'name', this.value)"
                               onkeypress="if(event.key === 'Enter') this.blur();">
                    </div>

                    <div class="part-header-actions">
                        <button class="part-action-btn" onclick="const input = this.closest('.part-header').querySelector('.part-name'); input.readOnly = false; input.focus(); input.select();" title="이름 수정">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="part-action-btn" onclick="App.duplicatePart('${quoteId}', '${viewId}', '${part.id}')" title="복제">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="part-action-btn danger" onclick="App.deletePart('${quoteId}', '${viewId}', '${part.id}')" title="삭제">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="part-fields">
                    <div class="part-field">
                        <select onchange="App.setPartMaterialName('${quoteId}', '${viewId}', '${part.id}', this.value)">
                            <option value="">재료명</option>
                            ${materialNames.map(name => `
                                <option value="${name}" ${selectedMaterial?.name === name ? 'selected' : ''}>
                                    ${name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="part-field">
                        <select onchange="App.setPartMaterialColor('${quoteId}', '${viewId}', '${part.id}', this.value)"
                                ${!selectedMaterial ? 'disabled' : ''}>
                            <option value="">컬러</option>
                            ${colorOptions.map(m => `
                                <option value="${m.id}" ${part.materialId === m.id ? 'selected' : ''}>
                                    ${m.color} (${DataManager.formatNumber(m.pricePerUnit)}원)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="part-field small">
                        <input type="number" 
                               value="${part.volume || ''}" 
                               placeholder="부피"
                               min="0"
                               step="0.1"
                               onchange="App.updatePart('${quoteId}', '${viewId}', '${part.id}', 'volume', parseFloat(this.value) || 0)">
                    </div>
                </div>
                
                <div class="part-options">
                    <button class="btn-add-option" onclick="App.addOption('${quoteId}', '${viewId}', '${part.id}', 'postProcessing')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        후가공
                    </button>
                    <button class="btn-add-option" onclick="App.addOption('${quoteId}', '${viewId}', '${part.id}', 'mechanism')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        옵션
                    </button>
                </div>
                
                ${part.options && part.options.length > 0 ? `
                    <div class="part-options-list">
                        ${part.options.map((opt, optIndex) => {
                            const availablePresets = optionPresets.filter(p => p.type === opt.type);
                            return `
                            <div class="option-item">
                                <label>${opt.type === 'postProcessing' ? '후가공' : '옵션'}</label>
                                
                                <select class="option-preset-select" 
                                        onchange="App.applyOptionPreset('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, this.value); this.value='';">
                                    <option value="">불러오기...</option>
                                    ${availablePresets.map(p => `
                                        <option value="${p.id}">${p.name} (${p.priceType === 'percent' ? p.price + '%' : p.price + '원'})</option>
                                    `).join('')}
                                </select>

                                <input type="text" 
                                       value="${opt.name || ''}" 
                                       placeholder="항목명"
                                       onchange="App.updateOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, 'name', this.value)">
                                
                                <input type="number" 
                                       value="${opt.price || ''}" 
                                       placeholder="${opt.priceType === 'percent' ? '%' : '가격'}"
                                       min="0"
                                       onchange="App.updateOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, 'price', parseInt(this.value) || 0)">
                                       
                                <button class="option-remove" onclick="App.removeOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex})">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        `}).join('')}
                    </div>
                ` : ''}

                <div class="part-footer">
                    <div class="part-price-breakdown">
                        <span>프린팅 ${DataManager.formatNumber(partPrice.printing)}원</span>
                        ${partPrice.postProcessing > 0 ? `<span>| 후가공 ${DataManager.formatNumber(partPrice.postProcessing)}원</span>` : ''}
                        ${partPrice.mechanism > 0 ? `<span>| 옵션 ${DataManager.formatNumber(partPrice.mechanism)}원</span>` : ''}
                    </div>
                    <div class="part-total-price">
                        합산 ${DataManager.formatNumber(partPrice.subtotal)}원
                    </div>
                </div>
            </div>
        `;
    },

    renderEmpty() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h3>견적을 선택해주세요</h3>
                <p>왼쪽에서 견적을 선택하거나<br>새 견적을 생성하세요</p>
            </div>
        `;
    }
};