/**
 * FirmaDigital Bolivia Studio - PDF Digital Signing & AGETIC Validation Module
 */

window.SignerModule = {
  selectedUserId: null,
  uploadedPdfFile: null,
  latestSignedResult: null,

  init() {
    this.bindEvents();
    this.populateUserDropdown();
  },

  bindEvents() {
    // PDF Source Radios
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

    // Drag and Drop PDF
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

    // Validation tab button
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
  },

  setSelectedUser(id) {
    this.selectedUserId = id;
    this.populateUserDropdown();
  },

  async executeSigning() {
    const btnSign = document.getElementById('btn-execute-sign-pdf');
    const selectUser = document.getElementById('select-signing-user');
    const userId = selectUser ? selectUser.value : this.selectedUserId;

    if (!userId) {
      window.App.showToast('Debe seleccionar un usuario firmante.', 'error');
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
        Firmando digitalmente con PAdES...
      `;
    }

    const formData = new FormData();
    formData.append('userId', userId);
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
        this.renderSigningSuccess(data);
        window.App.showToast('Documento firmado con éxito. Listo para validar.', 'success');

        // Refresh viewer if initialized
        if (window.ViewerModule) {
          window.ViewerModule.loadSignedPdfFromBase64(data.pdfBase64);
        }
      } else {
        window.App.showToast(`Error al firmar: ${data.error}`, 'error');
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
          <p style="font-size: 15px; font-weight: 600;">No hay ningún documento firmado para validar.</p>
          <p style="color: var(--text-muted); font-size: 12.5px; margin-top: 6px;">Por favor diríjase a la pestaña "3. Firmar Informe PDF" y firme un documento primero.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="window.App.switchTab('tab-signer')">Ir a Firmar Documento</button>
        </div>
      `;
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Consultando validar.firmadigital.bo...';
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
        this.renderValidationResults(data.result);
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

  renderValidationResults(result) {
    const container = document.getElementById('validator-results-container');
    if (!container) return;

    if (result.onlineValidationFailed) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 24px;">
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
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 16px;">
            <div>
              <span class="brand-badge-bo">FIRMA DIGITAL #${f.index} IDENTIFICADA</span>
              <h3 style="font-size: 19px; color: #fff; margin-top: 6px;">Signatario: ${f.certificado?.nombreSignatario || 'N/A'}</h3>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                C.I. / NIT: <strong style="color: var(--cyan-primary);">${f.certificado?.ciSignatario}</strong> | 
                Entidad: <strong>${f.certificado?.organizacionSignatario || 'N/A'}</strong> | 
                Cargo: <strong>${f.certificado?.cargoSignatario || 'N/A'}</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: var(--text-faint);">FECHA DE FIRMA OFICIAL:</div>
              <div style="font-size: 13px; font-weight: 600; color: #fff;">${new Date(f.fechaFirma).toLocaleString('es-BO')}</div>
            </div>
          </div>

          <h4 style="font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
            Evaluación de los 4 Filtros de Seguridad de Bolivia:
          </h4>
          <div class="indicator-grid">
            ${indicadoresHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="glass-card" style="margin-bottom: 20px; padding: 20px; background: rgba(6, 182, 212, 0.05); border-color: var(--border-highlight);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 12px; color: var(--emerald-success); font-weight: 700;">DICTAMEN DEL VALIDADOR OFICIAL AGETIC:</div>
            <div style="font-size: 17px; font-weight: 700; color: #fff; margin-top: 2px;">
              ${result.mensaje}
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted); background: rgba(0, 0, 0, 0.4); padding: 8px 12px; border-radius: 6px;">
            Código Hash SHA-1: <span style="color: var(--cyan-primary);">${result.codigoHash || 'Verificado'}</span>
          </div>
        </div>
      </div>

      ${firmasHtml}
    `;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.SignerModule.init();
});
