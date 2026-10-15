/**
 * FirmaDigital Bolivia Studio - PDF Digital Signing & AGETIC Validation Module
 */

window.SignerModule = {
  selectedUserId: null,
  uploadedPdfFile: null,
  latestSignedResult: null,
  selectedExternalFile: null,
  currentValidatedFileObj: null,

  init() {
    this.bindEvents();
    this.populateUserDropdown();
  },

  bindEvents() {
    // PDF Source Radios for Tab 3 (Signing)
    const radioSample = document.getElementById('pdf-choice-sample');
    const radioUpload = document.getElementById('pdf-choice-upload');
    const sampleConfig = document.getElementById('sample-pdf-config-box');
    const uploadBox = document.getElementById('upload-pdf-box');

    if (radioSample && radioUpload) {
      radioSample.addEventListener('change', () => {
        sampleConfig.style.display = 'block';
        uploadBox.style.display = 'none';
        this.uploadedPdfFile = null;
        document.getElementById('selected-file-label').textContent = '';
      });

      radioUpload.addEventListener('change', () => {
        sampleConfig.style.display = 'none';
        uploadBox.style.display = 'block';
      });
    }

    // Drag and Drop PDF for Tab 3
    const dropzone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length > 0) {
          this.handleSelectedFile(e.target.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--cyan-primary)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        if (e.dataTransfer.files?.length > 0) {
          this.handleSelectedFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Password Toggle in Tab 3 (Signing)
    const btnTogglePass = document.getElementById('btn-toggle-signing-pass');
    const passInput = document.getElementById('signing-passphrase');
    const iconShow = document.getElementById('icon-pass-show');
    const iconHide = document.getElementById('icon-pass-hide');

    if (btnTogglePass && passInput) {
      btnTogglePass.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          if (iconShow) iconShow.style.display = 'none';
          if (iconHide) iconHide.style.display = 'block';
        } else {
          passInput.type = 'password';
          if (iconShow) iconShow.style.display = 'block';
          if (iconHide) iconHide.style.display = 'none';
        }
      });
    }

    if (passInput) {
      passInput.addEventListener('input', () => {
        passInput.style.borderColor = '';
      });
    }

    // User selector change event to update password hint
    const userSelect = document.getElementById('select-signing-user');
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        this.selectedUserId = e.target.value;
        if (passInput) {
          passInput.value = '';
          passInput.style.borderColor = '';
        }
        this.updatePassphraseHint();
      });
    }

    // Visual Stamp toggle
    const toggleStamp = document.getElementById('toggle-visual-stamp');
    const stampControls = document.getElementById('stamp-position-controls');
    if (toggleStamp && stampControls) {
      toggleStamp.addEventListener('change', () => {
        stampControls.style.display = toggleStamp.checked ? 'flex' : 'none';
      });
    }

    // Execute Sign Button
    const btnSign = document.getElementById('btn-execute-sign-pdf');
    if (btnSign) {
      btnSign.addEventListener('click', () => this.executeSigning());
    }

    // Action buttons in success card
    const btnViewInViewer = document.getElementById('btn-view-signed-pdf-in-viewer');
    if (btnViewInViewer) {
      btnViewInViewer.addEventListener('click', () => {
        window.App.switchTab('tab-viewer');
      });
    }

    const btnValidateFromSigner = document.getElementById('btn-validate-now-from-signer');
    if (btnValidateFromSigner) {
      btnValidateFromSigner.addEventListener('click', () => {
        window.App.switchTab('tab-validator');
        this.executeOfficialValidation();
      });
    }

    // ==========================================
    // TAB 5: VALIDATOR CONTROLS
    // ==========================================
    const valDropzone = document.getElementById('val-external-dropzone');
    const valFileInput = document.getElementById('val-external-pdf-input');
    const btnValidateExternal = document.getElementById('btn-validate-external-pdf');

    if (valDropzone && valFileInput) {
      valDropzone.addEventListener('click', () => valFileInput.click());

      valFileInput.addEventListener('change', (e) => {
        if (e.target.files?.length > 0) {
          this.handleSelectedExternalPdf(e.target.files[0]);
        }
      });

      valDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        valDropzone.style.borderColor = 'var(--cyan-primary)';
        valDropzone.style.background = 'rgba(6, 182, 212, 0.08)';
      });

      valDropzone.addEventListener('dragleave', () => {
        valDropzone.style.borderColor = 'rgba(6, 182, 212, 0.35)';
        valDropzone.style.background = 'rgba(0, 0, 0, 0.25)';
      });

      valDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        valDropzone.style.borderColor = 'rgba(6, 182, 212, 0.35)';
        valDropzone.style.background = 'rgba(0, 0, 0, 0.25)';
        if (e.dataTransfer.files?.length > 0) {
          this.handleSelectedExternalPdf(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnValidateExternal) {
      btnValidateExternal.addEventListener('click', () => this.executeExternalPdfValidation());
    }

    const btnValidateLatest = document.getElementById('btn-validate-latest-pdf');
    if (btnValidateLatest) {
      btnValidateLatest.addEventListener('click', () => this.executeOfficialValidation());
    }
  },

  handleSelectedFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      window.App.showToast('El archivo seleccionado debe ser un documento PDF.', 'error');
      return;
    }
    this.uploadedPdfFile = file;
    const label = document.getElementById('selected-file-label');
    if (label) {
      label.textContent = `Archivo cargado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
    window.App.showToast(`PDF "${file.name}" cargado listo para firmar.`, 'info');
  },

  handleSelectedExternalPdf(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      window.App.showToast('El archivo seleccionado debe ser un documento PDF (.pdf).', 'error');
      return;
    }
    this.selectedExternalFile = file;
    const label = document.getElementById('val-external-file-label');
    const btn = document.getElementById('btn-validate-external-pdf');
    if (label) {
      label.textContent = `PDF cargado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
    if (btn) {
      btn.disabled = false;
    }
    window.App.showToast(`Archivo "${file.name}" cargado para auditoría de firmas.`, 'info');
  },

  populateUserDropdown() {
    const select = document.getElementById('select-signing-user');
    if (!select) return;

    const users = window.App.users || [];
    if (users.length === 0) {
      select.innerHTML = '<option value="">No hay usuarios disponibles. Cree uno en la pestaña 1.</option>';
      return;
    }

    select.innerHTML = users
      .map(
        (u) => `
        <option value="${u.id}" ${this.selectedUserId === u.id ? 'selected' : ''}>
          ${u.name} (CI: ${u.ci}) - ${u.organization}
        </option>
      `
      )
      .join('');

    if (!this.selectedUserId && users.length > 0) {
      this.selectedUserId = users[0].id;
    }

    this.updatePassphraseHint();
  },

  setSelectedUser(id) {
    this.selectedUserId = id;
    this.populateUserDropdown();
    const passInput = document.getElementById('signing-passphrase');
    if (passInput) {
      passInput.value = '';
      passInput.style.borderColor = '';
      passInput.focus();
    }
  },

  updatePassphraseHint() {
    const hint = document.getElementById('signing-user-pass-hint');
    if (!hint) return;

    const users = window.App.users || [];
    const currentUser = users.find((u) => u.id === this.selectedUserId) || users[0];
    if (currentUser) {
      hint.textContent = `Clave requerida para ${currentUser.name.split(' ')[0]}`;
    } else {
      hint.textContent = 'Requerida para autorizar la firma';
    }
  },

  async executeSigning() {
    const btnSign = document.getElementById('btn-execute-sign-pdf');
    const selectUser = document.getElementById('select-signing-user');
    const userId = selectUser ? selectUser.value : this.selectedUserId;
    const passInput = document.getElementById('signing-passphrase');
    const passphrase = passInput ? passInput.value.trim() : '';

    if (!userId) {
      window.App.showToast('Debe seleccionar un usuario firmante.', 'error');
      return;
    }

    // Require and validate password on client before submitting
    if (!passphrase) {
      window.App.showToast('Debe ingresar la contraseña de la llave privada para autorizar la firma.', 'error');
      if (passInput) {
        passInput.focus();
        passInput.style.borderColor = 'var(--rose-danger)';
        passInput.classList.add('shake-anim');
        setTimeout(() => passInput.classList.remove('shake-anim'), 500);
      }
      return;
    }

    const isUpload = document.getElementById('pdf-choice-upload')?.checked;
    if (isUpload && !this.uploadedPdfFile) {
      window.App.showToast('Por favor seleccione o arrastre un archivo PDF para firmar.', 'error');
      return;
    }

    if (btnSign) {
      btnSign.disabled = true;
      btnSign.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Descifrando llave y firmando con PAdES...
      `;
    }

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('passphrase', passphrase);
    formData.append('reason', document.getElementById('signing-reason').value.trim());
    formData.append('location', document.getElementById('signing-location').value.trim());
    formData.append('addVisualStamp', document.getElementById('toggle-visual-stamp').checked ? 'true' : 'false');
    formData.append('stampPosition', document.getElementById('stamp-position-select').value);

    if (isUpload && this.uploadedPdfFile) {
      formData.append('pdfFile', this.uploadedPdfFile);
    } else {
      formData.append('useSamplePdf', 'true');
      formData.append('sampleTitle', document.getElementById('report-title-input').value.trim());
      formData.append('sampleCode', document.getElementById('report-code-input').value.trim());
    }

    try {
      const res = await fetch('/api/pdf/sign', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        this.latestSignedResult = data;
        window.App.latestSignedPdf = data;
        if (passInput) {
          passInput.style.borderColor = 'var(--emerald-success)';
        }
        this.renderSigningSuccess(data);
        window.App.showToast('¡Documento firmado con éxito! Contraseña verificada.', 'success');

        // Refresh viewer if initialized
        if (window.ViewerModule) {
          window.ViewerModule.loadSignedPdfFromBase64(data.pdfBase64);
        }
      } else {
        window.App.showToast(`Error al firmar: ${data.error}`, 'error');
        if (passInput && data.error && data.error.toLowerCase().includes('contraseña')) {
          passInput.focus();
          passInput.style.borderColor = 'var(--rose-danger)';
          passInput.classList.add('shake-anim');
          setTimeout(() => passInput.classList.remove('shake-anim'), 500);
        }
      }
    } catch (err) {
      window.App.showToast(`Error de conexión: ${err.message}`, 'error');
    } finally {
      if (btnSign) {
        btnSign.disabled = false;
        btnSign.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Firmar Digitalmente el Documento (PAdES)
        `;
      }
    }
  },

  renderSigningSuccess(data) {
    document.getElementById('signing-placeholder-state').style.display = 'none';
    document.getElementById('signing-success-content').style.display = 'block';
    document.getElementById('signing-success-actions').style.display = 'flex';

    document.getElementById('res-signer-name').textContent = data.metadata?.signerName || '-';
    document.getElementById('res-signer-org').textContent = `${data.metadata?.signerCi} | ${data.metadata?.signerOrg}`;
    document.getElementById('res-signer-date').textContent = new Date(data.metadata?.signedAt).toLocaleString('es-BO');
    document.getElementById('res-pdf-size').textContent = `${(data.size / 1024).toFixed(1)} KB`;
    document.getElementById('res-sha256-hash').textContent = data.hashes?.sha256 || '-';
  },

  async executeOfficialValidation() {
    const container = document.getElementById('validator-results-container');
    const btn = document.getElementById('btn-validate-latest-pdf');

    if (!container) return;

    if (!this.latestSignedResult && !window.App.latestSignedPdf) {
      container.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px; color: var(--rose-danger);">
          <p style="font-size: 15px; font-weight: 600;">No hay ningún documento firmado en la sesión para validar.</p>
          <p style="color: var(--text-muted); font-size: 12.5px; margin-top: 6px;">Por favor diríjase a la pestaña "3. Firmar Informe PDF" y firme un documento primero, o cargue un archivo PDF externo en el recuadro de la izquierda.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="window.App.switchTab('tab-signer')">Ir a Firmar Documento</button>
        </div>
      `;
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Consultando validar.firmadigital.bo...
      `;
    }

    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 50px;">
        <svg class="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" stroke-width="2" style="animation: spin 1s linear infinite; margin-bottom: 14px;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <h3 style="font-size: 17px; color: #fff;">Conectando con el Servidor Oficial de AGETIC...</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 6px;">Analizando estructura PAdES, ByteRange, hashes SHA-1/SHA-256 y certificados X.509...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/pdf/validate-official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: this.latestSignedResult?.pdfBase64 || window.App.latestSignedPdf?.pdfBase64,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        this.renderValidationResults(data.result, 'Documento de la Sesión (Informe Técnico Firmado)', null);
        window.App.showToast('Validación oficial completada.', 'success');
      } else {
        container.innerHTML = `
          <div class="glass-card" style="color: var(--rose-danger); padding: 24px;">
            <h4>Error al procesar la validación:</h4>
            <p>${data.error || 'Respuesta inválida del servidor.'}</p>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="color: var(--rose-danger); padding: 24px;">
          <h4>Error de red o conexión:</h4>
          <p>${err.message}</p>
        </div>
      `;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Validar Documento Firmado Actual
        `;
      }
    }
  },

  async executeExternalPdfValidation() {
    if (!this.selectedExternalFile) {
      window.App.showToast('Por favor seleccione o arrastre un archivo PDF para auditar.', 'error');
      return;
    }

    const container = document.getElementById('validator-results-container');
    const btn = document.getElementById('btn-validate-external-pdf');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Auditando archivo en validar.firmadigital.bo...
      `;
    }

    if (container) {
      container.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 50px;">
          <svg class="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" stroke-width="2" style="animation: spin 1s linear infinite; margin-bottom: 14px;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <h3 style="font-size: 17px; color: #fff;">Auditando Documento en Servidor de AGETIC...</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-top: 6px;">
            Enviando "<strong>${this.selectedExternalFile.name}</strong>" a validar.firmadigital.bo para detectar firmas digitales PAdES/CMS...
          </p>
        </div>
      `;
    }

    try {
      const formData = new FormData();
      formData.append('pdfFile', this.selectedExternalFile);

      const res = await fetch('/api/pdf/validate-official', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.result) {
        this.renderValidationResults(data.result, this.selectedExternalFile.name, this.selectedExternalFile);
        window.App.showToast('Auditoría oficial completada.', 'success');
      } else {
        container.innerHTML = `
          <div class="glass-card" style="color: var(--rose-danger); padding: 24px;">
            <h4>Error al procesar la auditoría:</h4>
            <p>${data.error || 'Respuesta inválida del servidor.'}</p>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `
        <div class="glass-card" style="color: var(--rose-danger); padding: 24px;">
          <h4>Error de red o conexión:</h4>
          <p>${err.message}</p>
        </div>
      `;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          Validar Firmas del PDF Seleccionado
        `;
      }
    }
  },

  renderValidationResults(result, docName = 'Documento PDF', fileObj = null) {
    const container = document.getElementById('validator-results-container');
    if (!container) return;

    this.currentValidatedFileObj = fileObj;

    if (result.onlineValidationFailed) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 24px; border-left: 4px solid var(--amber-warning);">
          <h3 style="color: var(--amber-warning); margin-bottom: 8px;">Conexión al servicio de validación offline</h3>
          <p style="color: var(--text-muted);">${result.mensaje}</p>
          <a href="https://validar.firmadigital.bo/#/" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="margin-top: 14px;">
            Validar manualmente en validar.firmadigital.bo
          </a>
        </div>
      `;
      return;
    }

    const firmas = result.firmas || [];
    const hasFirmas = firmas.length > 0;

    // Header Summary Box
    const headerHtml = `
      <div class="glass-card" style="margin-bottom: 20px; padding: 20px; background: rgba(6, 182, 212, 0.05); border-color: ${hasFirmas ? 'var(--border-emerald)' : 'var(--border-amber)'};">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="indicator-badge ${hasFirmas ? 'success' : 'warning'}">
                ${hasFirmas ? `${firmas.length} FIRMA(S) DETECTADA(S)` : '0 FIRMAS DETECTADAS'}
              </span>
              <span style="font-size: 13px; color: var(--text-muted); font-weight: 600;">${docName}</span>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: #fff;">
              DICTAMEN AGETIC: <span style="color: ${hasFirmas ? 'var(--emerald-success)' : 'var(--amber-warning)'};">${result.mensaje}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); background: rgba(0, 0, 0, 0.4); padding: 6px 12px; border-radius: 6px;">
              Hash SHA-1: <span style="color: var(--cyan-primary);">${result.codigoHash || 'Verificado'}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-faint);">
              Auditado el: ${new Date().toLocaleTimeString('es-BO')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Zero Signatures Content
    if (!hasFirmas) {
      container.innerHTML = `
        ${headerHtml}
        <div class="glass-card" style="border-left: 4px solid var(--amber-warning); padding: 26px; margin-bottom: 20px;">
          <div style="display: flex; align-items: flex-start; gap: 18px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--border-amber); color: var(--amber-warning); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div style="flex: 1;">
              <h3 style="font-size: 18px; color: #fff; font-weight: 700;">No se identificaron firmas digitales en este documento</h3>
              <p style="color: var(--text-muted); font-size: 13.5px; margin-top: 6px; line-height: 1.6;">
                El servicio oficial del Estado Plurinacional de Bolivia (<strong>validar.firmadigital.bo</strong>) analizó la estructura criptográfica del archivo y certificó que <strong>no posee ninguna firma digital incrustada (0 firmas identificadas)</strong>.
              </p>

              <div style="margin-top: 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
                <div style="font-weight: 600; color: var(--amber-warning); font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  ¿Por qué este archivo no tiene firmas digitales?
                </div>
                <ul style="margin-left: 20px; font-size: 12.5px; color: var(--text-muted); line-height: 1.8;">
                  <li><strong>Documento PDF Estándar / Plano:</strong> Este archivo es un PDF convencional creado sin firma criptográfica PAdES / CMS.</li>
                  <li><strong>Firmas Visuales o Escaneadas:</strong> Si el PDF muestra un dibujo de firma o rúbrica escaneada en las páginas, <em>una imagen gráfica NO es una firma digital</em> y no tiene validez jurídica bajo la <strong>Ley N° 164</strong> y <strong>D.S. 1793</strong> de Bolivia.</li>
                  <li><strong>Validez Jurídica de la Firma Digital:</strong> Para que un documento tenga presunción de autoría e inalterabilidad legal, debe estar firmado mediante una <em>llave privada y certificado X.509</em> con sello criptográfico incrustado.</li>
                </ul>
              </div>

              <!-- Action buttons for zero signatures -->
              <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
                ${
                  fileObj
                    ? `<button class="btn btn-primary" id="btn-val-preview-viewer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Ver Documento en el Visualizador PDF
                      </button>`
                    : ''
                }
                <button class="btn btn-success" onclick="window.App.switchTab('tab-signer')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Firmar este Documento Ahora
                </button>
                <a href="https://validar.firmadigital.bo/#/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                  Abrir Portal Oficial AGETIC
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      // Bind preview button if rendered
      const btnPreview = document.getElementById('btn-val-preview-viewer');
      if (btnPreview) {
        btnPreview.addEventListener('click', () => this.previewCurrentFileInViewer());
      }
      return;
    }

    // Has signatures - Render details of each signature
    let firmasHtml = '';

    firmas.forEach((f) => {
      const indicadoresHtml = (f.indicadores || [])
        .map((ind) => {
          const cardClass = ind.esVerde ? 'success' : 'warning';
          const badgeClass = ind.esVerde ? 'success' : 'warning';
          const badgeText = ind.esVerde ? 'VÁLIDO / CONFORME' : 'INFORMACIÓN / OBSERVACIÓN';

          return `
            <div class="indicator-card ${cardClass}">
              <div class="indicator-badge ${badgeClass}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  ${ind.esVerde ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
                </svg>
                ${badgeText}
              </div>
              <div class="indicator-title">${ind.nombre}</div>
              <div class="indicator-desc">${ind.descripcion}</div>
              ${ind.notaTecnica ? `<div class="indicator-note">${ind.notaTecnica}</div>` : ''}
            </div>
          `;
        })
        .join('');

      firmasHtml += `
        <div class="glass-card" style="margin-bottom: 24px; padding: 24px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="brand-badge-bo">FIRMA DIGITAL #${f.index} IDENTIFICADA</span>
                <span class="indicator-badge success" style="margin: 0;">PAdES / X.509</span>
              </div>
              <h3 style="font-size: 20px; color: #fff; font-weight: 700;">Signatario: ${f.certificado?.nombreSignatario || 'N/A'}</h3>
              
              <div class="grid-2" style="gap: 8px 24px; margin-top: 10px; font-size: 12.5px;">
                <div>
                  <span style="color: var(--text-muted);">C.I. / NIT:</span>
                  <strong style="color: var(--cyan-primary);">${f.certificado?.ciSignatario}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Entidad:</span>
                  <strong style="color: #fff;">${f.certificado?.organizacionSignatario || 'N/A'}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Unidad / Cargo:</span>
                  <strong style="color: #fff;">${f.certificado?.unidadSignatario || 'N/A'} - ${f.certificado?.cargoSignatario || 'N/A'}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Correo Oficial:</span>
                  <strong style="color: var(--cyan-primary);">${f.certificado?.correoElectronicoSignatario || 'N/A'}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Entidad Emisora (ECA):</span>
                  <strong style="color: var(--emerald-success);">${f.certificado?.nombreECA || 'Entidad Certificadora (OpenSSL PKI)'}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted);">Vigencia del Certificado:</span>
                  <strong style="color: #fff;">${f.certificado?.inicioValidez ? new Date(f.certificado.inicioValidez).toLocaleDateString('es-BO') : 'N/A'} hasta ${f.certificado?.finValidez ? new Date(f.certificado.finValidez).toLocaleDateString('es-BO') : 'N/A'}</strong>
                </div>
              </div>
            </div>

            <div style="text-align: right; background: rgba(0, 0, 0, 0.35); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; color: var(--text-faint); margin-bottom: 2px;">FECHA OFICIAL DE FIRMA:</div>
              <div style="font-size: 14px; font-weight: 700; color: #fff;">${new Date(f.fechaFirma).toLocaleString('es-BO')}</div>
              <div style="font-size: 11px; color: var(--emerald-success); margin-top: 4px;">Sello de tiempo criptográfico</div>
            </div>
          </div>

          <h4 style="font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
            Evaluación de los 4 Filtros de Seguridad de Bolivia (Ley 164):
          </h4>
          <div class="indicator-grid">
            ${indicadoresHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      ${headerHtml}
      ${firmasHtml}
      <div style="display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap;">
        ${
          fileObj
            ? `<button class="btn btn-primary" id="btn-val-preview-viewer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Ver Documento en el Visualizador PDF
              </button>`
            : `<button class="btn btn-primary" onclick="window.App.switchTab('tab-viewer')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Ver Documento en el Visualizador PDF
              </button>`
        }
        <a href="https://validar.firmadigital.bo/#/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
          Validar También en Portal Oficial AGETIC
        </a>
      </div>
    `;

    // Bind preview button if rendered
    const btnPreview = document.getElementById('btn-val-preview-viewer');
    if (btnPreview) {
      btnPreview.addEventListener('click', () => this.previewCurrentFileInViewer());
    }
  },

  previewCurrentFileInViewer() {
    if (!this.currentValidatedFileObj) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      if (window.ViewerModule) {
        window.ViewerModule.loadExternalDocument(arrayBuffer, this.currentValidatedFileObj.name);
        window.App.switchTab('tab-viewer');
        window.App.showToast(`Documento "${this.currentValidatedFileObj.name}" cargado en el visualizador.`, 'info');
      }
    };
    reader.readAsArrayBuffer(this.currentValidatedFileObj);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.SignerModule.init();
});
