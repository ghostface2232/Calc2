/**
 * UI 렌더링 모듈
 * 계산기 뷰, 사이드바 목록, 설정 모달 목록의 HTML 생성을 담당합니다.
 */
const Calculator = {
    // ==========================================
    // 1. 메인 계산기 영역 렌더링
    // ==========================================
    
    renderQuote(quote) {
        if (!quote) return this.renderEmpty();

        // 뷰 렌더링
        let viewsHtml = quote.views.map((view, index) => 
            this.renderView(quote, view, index)
        ).join('');

        // 비교 뷰 추가 버튼
        // [수정 3] 수직 중앙 정렬을 위해 래퍼 div를 추가
        viewsHtml += `
            <div class="add-view-container">
                <button class="btn-add-view" onclick="App.addView('${quote.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>비교 뷰 추가</span>
                </button>
            </div>
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
                       onblur="this.readOnly = true; this.style.pointerEvents='none';"
                       onchange="App.updateViewName('${quote.id}', '${view.id}', this.value)"
                       onkeypress="if(event.key === 'Enter') this.blur();">
                <button class="btn-icon" 
                        onclick="const input = document.getElementById('view-name-${view.id}'); input.readOnly = false; input.style.pointerEvents='auto'; input.focus(); input.select();" 
                        title="뷰 이름 수정" 
                        style="margin-left:4px; width:24px; height:24px;">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
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
                            ${canRemove ? `
                                <button class="btn-icon danger" onclick="App.removeView('${quote.id}', '${view.id}')" title="이 뷰 삭제">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                                <option value="">고객사 선택...</option>
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
                        `}
                    </div>
                </div>
                
                <div class="calculator-body">
                    ${view.parts && view.parts.length > 5 ? `
                        <div class="parts-summary-card" onclick="App.openPartsModal('${quote.id}', '${view.id}')">
                            <div class="parts-summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                                    <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                                    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                                    <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                                </svg>
                            </div>
                            <div class="parts-summary-info">
                                <span class="parts-summary-count">파트 수: ${view.parts.length}개</span>
                                <span class="parts-summary-hint">클릭하여 전체 파트 보기</span>
                            </div>
                            <svg class="parts-summary-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                    ` : view.parts && view.parts.length > 0 ?
                        view.parts.map((part, i) => this.renderPart(quote.id, view.id, part, i)).join('') : ''
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
                    <div class="footer-title">견적 요약</div>
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

    renderPart(quoteId, viewId, part, partIndex) {
        const partPrice = DataManager.calculatePartPrice(part);
        const materialNames = DataManager.getMaterialNames();
        const selectedMaterial = DataManager.getMaterial(part.materialId);
        const optionPresets = DataManager.getOptionPresets();
        
        let colorOptions = [];
        if (selectedMaterial) {
            colorOptions = DataManager.getColorsForMaterial(selectedMaterial.name);
        } else if (part.materialId) {
            const mat = DataManager.getMaterial(part.materialId);
            if(mat) colorOptions = DataManager.getColorsForMaterial(mat.name);
        }

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
                        <button class="part-action-btn" onclick="App.duplicatePart('${quoteId}', '${viewId}', '${part.id}')" title="파트 복제">
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
                            <option value="">재료 선택</option>
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
                            <option value="">컬러 선택</option>
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
                               placeholder="부피(ml)"
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
                        후가공 추가
                    </button>
                    <button class="btn-add-option" onclick="App.addOption('${quoteId}', '${viewId}', '${part.id}', 'mechanism')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        옵션 추가
                    </button>
                </div>
                
                ${part.options && part.options.length > 0 ? `
                    <div class="part-options-list">
                        ${part.options.map((opt, optIndex) => {
                            const availablePresets = optionPresets.filter(p => p.type === opt.type);
                            const isPreset = !!opt.presetId;
                            return `
                            <div class="option-item">
                                <div class="option-item-header">
                                    <span class="option-type-label">${opt.type === 'postProcessing' ? '후가공' : '옵션'}</span>
                                    <select class="option-preset-select"
                                            onchange="App.applyOptionPreset('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, this.value)">
                                        <option value="" ${!opt.presetId ? 'selected' : ''}>직접 입력</option>
                                        ${availablePresets.map(p => `
                                            <option value="${p.id}" ${opt.presetId === p.id ? 'selected' : ''}>${p.name} (${p.priceType === 'percent' ? p.price + '%' : p.price + '원'})</option>
                                        `).join('')}
                                    </select>
                                    <button class="option-remove" onclick="App.removeOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex})">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                                <div class="option-item-row">
                                    <input type="text" class="option-name-input"
                                           value="${opt.name || ''}"
                                           placeholder="항목명"
                                           ${isPreset ? 'disabled' : ''}
                                           onchange="App.updateOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, 'name', this.value)">

                                    <input type="number" class="option-price-input"
                                           value="${opt.price || ''}"
                                           placeholder="${opt.priceType === 'percent' ? '%' : '원'}"
                                           min="0"
                                           ${isPreset ? 'disabled' : ''}
                                           onchange="App.updateOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, 'price', parseInt(this.value) || 0)">

                                    <select class="option-price-type-select"
                                            ${isPreset ? 'disabled' : ''}
                                            onchange="App.updateOption('${quoteId}', '${viewId}', '${part.id}', ${optIndex}, 'priceType', this.value)">
                                        <option value="fixed" ${opt.priceType !== 'percent' ? 'selected' : ''}>원</option>
                                        <option value="percent" ${opt.priceType === 'percent' ? 'selected' : ''}>%</option>
                                    </select>
                                </div>
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
                <p>왼쪽 목록에서 견적을 선택하거나<br>새 견적을 생성하여 시작하세요.</p>
            </div>
        `;
    },

// ==========================================
    // 2. 사이드바 및 설정 리스트 렌더링
    // ==========================================

    renderQuoteList(quotes, activeQuoteId, options = { isSelectionMode: false, selectedIds: new Set() }) {
        const listEl = document.getElementById('quote-list');
        if (!listEl) return;

        if (quotes.length === 0) {
            listEl.innerHTML = `<li class="quote-list-empty">조건에 맞는 견적이 없습니다.</li>`;
            return;
        }

        listEl.innerHTML = quotes.map(quote => {
            // 태그 데이터 가져오기 및 3글자 자르기
            const tag = DataManager.getTag(quote.tagId);
            const tagName = tag ? (tag.name.length > 3 ? tag.name.substring(0, 3) : tag.name) : '+';
            const tagColor = tag ? tag.color : '#e2e8f0';
            const tagStyle = tag ? `background-color:${tagColor}; color:#fff;` : `background-color:var(--bg-input); color:var(--color-text-light);`;

            return `
            <li class="quote-list-item ${quote.id === activeQuoteId ? 'active' : ''}" onclick="App.selectQuote('${quote.id}')">
                
                ${options.isSelectionMode ? `
                    <div class="quote-checkbox ${options.selectedIds.has(quote.id) ? 'checked' : ''}" 
                         onclick="event.stopPropagation(); App.toggleQuoteSelection('${quote.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                ` : ''}

                <div class="quote-tag" style="${tagStyle}" 
                     onclick="event.stopPropagation(); App.openTagModal('${quote.id}')">
                    ${tagName}
                </div>

                <div class="quote-list-item-name">${quote.name}</div>
                
                <div class="quote-list-item-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); App.editQuoteName('${quote.id}')" title="이름 변경">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); App.duplicateQuote('${quote.id}')" title="복제">
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
        `}).join('');
    },
    renderMaterialList(materials) {
        const listEl = document.getElementById('material-list');
        if (!listEl) return;

        if (materials.length === 0) {
            listEl.innerHTML = `<li class="item-list-empty">등록된 재료가 없습니다.</li>`;
            return;
        }

        listEl.innerHTML = materials.map(m => `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">${m.name} - ${m.color}</div>
                    <div class="item-list-item-detail">${DataManager.formatNumber(m.pricePerUnit)}원 / unit</div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openMaterialModal('${m.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteMaterial('${m.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <line x1="18" y1="6" x2="6" y2="18"></line>
                             <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    },

    renderClientList(clients) {
        const listEl = document.getElementById('client-list');
        if (!listEl) return;

        if (clients.length === 0) {
            listEl.innerHTML = `<li class="item-list-empty">등록된 고객사가 없습니다.</li>`;
            return;
        }

        listEl.innerHTML = clients.map(c => `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">${c.name}</div>
                    <div class="item-list-item-detail">기본 할인율 ${c.discountRate}%</div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openClientModal('${c.id}')">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteClient('${c.id}')">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <line x1="18" y1="6" x2="6" y2="18"></line>
                             <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    },

    renderOptionPresetList(presets) {
        const listEl = document.getElementById('option-preset-list');
        if (!listEl) return;

        if (presets.length === 0) {
            listEl.innerHTML = `<li class="item-list-empty">등록된 옵션 프리셋이 없습니다.</li>`;
            return;
        }

        listEl.innerHTML = presets.map(p => `
            <li class="item-list-item">
                <div class="item-list-item-content">
                    <div class="item-list-item-name">
                        <span style="font-size:11px; color:var(--color-primary); margin-right:4px;">
                            [${p.type === 'postProcessing' ? '후가공' : '옵션'}]
                        </span>
                        ${p.name}
                    </div>
                    <div class="item-list-item-detail">
                        ${p.priceType === 'percent' ? `+${p.price}%` : `+${DataManager.formatNumber(p.price)}원`}
                    </div>
                </div>
                <div class="item-list-item-actions">
                    <button class="btn-icon" onclick="App.openOptionPresetModal('${p.id}')">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="App.deleteOptionPreset('${p.id}')">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <line x1="18" y1="6" x2="6" y2="18"></line>
                             <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    }
};
