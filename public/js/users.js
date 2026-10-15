/**
 * FirmaDigital Bolivia Studio - User Management & Keyring Module
 */

window.UsersModule = {
  users: [],

  init() {
    this.bindEvents();
    this.loadUsers();
  },

  bindEvents() {
    // Open Modal
    const btnOpenCreate = document.getElementById('btn-open-create-user-modal');
    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => this.openCreateModal());
    }

    // Close Modal
    const btnCloseCreate = document.getElementById('btn-close-modal-create-user');
    const btnCancelCreate = document.getElementById('btn-cancel-create-user');
    const modalCreate = document.getElementById('modal-create-user');

    if (btnCloseCreate) btnCloseCreate.addEventListener('click', () => this.closeCreateModal());
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', () => this.closeCreateModal());

    // Submit Create Form
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
      createForm.addEventListener('submit', (e) => this.handleCreateUser(e));
    }

    // Close Cert Details Modal
    const btnCloseCert = document.getElementById('btn-close-modal-cert-details');
    const btnCloseCertFooter = document.getElementById('btn-close-cert-details-footer');
    if (btnCloseCert) btnCloseCert.addEventListener('click', () => this.closeCertModal());
    if (btnCloseCertFooter) btnCloseCertFooter.addEventListener('click', () => this.closeCertModal());
  },

  async loadUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        this.users = data.users;
        window.App.users = data.users;
        this.renderUserCards();
        this.updateBadgeCount();
        if (window.SignerModule) {
          window.SignerModule.populateUserDropdown();
        }
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  },

  updateBadgeCount() {
    const badge = document.getElementById('users-count-badge');
    if (badge) {
      badge.textContent = `${this.users.length} Usuario${this.users.length === 1 ? '' : 's'}`;
    }
  },

  renderUserCards() {
    const container = document.getElementById('users-cards-container');
    if (!container) return;

    if (this.users.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <p style="color: var(--text-muted); font-size: 15px;">No hay usuarios registrados aún.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="window.UsersModule.openCreateModal()">Crear Primer Usuario</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.users
      .map((u) => {
        const initials = u.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        const methodLabel = u.method === 'openssl' ? 'OpenSSL 3.5' : 'Cripto Nativo';

        return `
          <div class="user-card" id="card-${u.id}">
            <div>
              <div class="user-card-header">
                <div class="user-avatar">${initials}</div>
                <div class="user-meta" style="flex: 1; overflow: hidden;">
                  <h3 title="${u.name}" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${u.name}</h3>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <span class="user-ci">CI: ${u.ci}</span>
                    <span class="indicator-badge success" style="margin: 0; font-size: 9.5px;">${methodLabel}</span>
                  </div>
                </div>
              </div>

              <div class="user-card-body">
                <div class="user-detail-row">
                  <span>Organización:</span>
                  <span title="${u.organization}">${u.organization}</span>
                </div>
                <div class="user-detail-row">
                  <span>Cargo:</span>
                  <span title="${u.position}">${u.position}</span>
                </div>
                <div class="user-detail-row">
                  <span>Correo:</span>
                  <span title="${u.email}">${u.email}</span>
                </div>
                <div class="user-detail-row">
                  <span>Tamaño RSA:</span>
                  <span>${u.keySize || 2048} bits</span>
                </div>
                <div class="user-detail-row">
                  <span>Contraseña (.p12):</span>
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span id="pass-val-${u.id}" style="font-family: var(--font-mono); font-size: 11.5px; color: var(--cyan-primary);">••••••••</span>
                    <button class="btn btn-secondary btn-sm" style="padding: 1px 7px; font-size: 10px;" onclick="window.UsersModule.togglePasswordVisibility('${u.id}', '${(u.passphrase || '').replace(/'/g, "\\'")}')">Ver</button>
                  </span>
                </div>
                <div class="user-detail-row">
                  <span>Estado Vigencia:</span>
                  <span style="color: var(--emerald-success); font-weight: 600;">● Activo / Vigente</span>
                </div>

                <div class="user-fingerprint" title="Huella Digital SHA-256">
                  <code id="fp-${u.id}">${(u.fingerprintSha256 || 'N/A').substring(0, 28)}...</code>
                  <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 10px;" onclick="window.UsersModule.copyFingerprint('${u.fingerprintSha256}')">Copiar</button>
                </div>
              </div>
            </div>

            <div class="user-card-actions">
              <button class="btn btn-primary btn-sm" onclick="window.UsersModule.useToSign('${u.id}')" title="Firmar PDF con este usuario">
                ✍️ Firmar
              </button>

              <button class="btn btn-secondary btn-sm" onclick="window.UsersModule.viewCertDetails('${u.id}')" title="Inspeccionar Certificado X.509">
                👁️ Ver Certificado
              </button>

              <a href="/api/users/${u.id}/download/zip" class="btn btn-secondary btn-sm" title="Descargar paquete de llaves (.ZIP)">
                📥 Llaves (.ZIP)
              </a>

              <button class="btn btn-danger btn-sm" onclick="window.UsersModule.deleteUser('${u.id}')" title="Eliminar este usuario">
                🗑️
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  },

  openCreateModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.add('active');
  },

  closeCreateModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) modal.classList.remove('active');
  },

  async handleCreateUser(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-create-user');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `
        <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Generando llaves con OpenSSL...
      `;
    }

    const payload = {
      name: document.getElementById('new-user-name').value.trim(),
      ci: document.getElementById('new-user-ci').value.trim(),
      email: document.getElementById('new-user-email').value.trim(),
      organization: document.getElementById('new-user-org').value.trim(),
      unit: document.getElementById('new-user-unit').value.trim(),
      position: document.getElementById('new-user-position').value.trim(),
      city: document.getElementById('new-user-city').value.trim(),
      passphrase: document.getElementById('new-user-passphrase').value,
      keySize: parseInt(document.getElementById('new-user-keysize').value, 10),
      method: document.getElementById('new-user-method').value,
      validityDays: 365,
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        window.App.showToast(`Usuario "${payload.name}" y par de llaves creados exitosamente.`, 'success');
        this.closeCreateModal();
        document.getElementById('create-user-form').reset();
        await this.loadUsers();
      } else {
        window.App.showToast(`Error: ${data.error}`, 'error');
      }
    } catch (err) {
      window.App.showToast(`Error en la solicitud: ${err.message}`, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Generar Usuario y Par de Llaves
        `;
      }
    }
  },

  async deleteUser(id) {
    const user = this.users.find((u) => u.id === id);
    if (!confirm(`¿Está seguro de eliminar al usuario "${user?.name || id}" y revocar sus llaves locales?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.App.showToast('Usuario eliminado correctamente.', 'info');
        await this.loadUsers();
      } else {
        window.App.showToast(`Error: ${data.error}`, 'error');
      }
    } catch (err) {
      window.App.showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  },

  useToSign(id) {
    if (window.SignerModule) {
      window.SignerModule.setSelectedUser(id);
    }
    window.App.switchTab('tab-signer');
    window.App.showToast(`Usuario seleccionado para la firma.`, 'info');
  },

  viewCertDetails(id) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return;

    const modalTitle = document.getElementById('cert-modal-title');
    const modalBody = document.getElementById('cert-modal-body');
    const modal = document.getElementById('modal-cert-details');

    if (modalTitle) modalTitle.textContent = `Certificado X.509 de ${user.name}`;

    if (modalBody) {
      modalBody.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: var(--cyan-primary); margin-bottom: 8px;">DISTINGUISHED NAME (SUBJECT):</div>
          <div style="font-family: var(--font-mono); font-size: 11.5px; line-height: 1.6; color: #e2e8f0;">
            CN = ${user.name}<br>
            C = BO (Bolivia)<br>
            O = ${user.organization}<br>
            OU = ${user.unit}<br>
            Title = ${user.position}<br>
            Email = ${user.email}<br>
            SerialNumber = ${user.ci}
          </div>
        </div>

        <div class="user-detail-row">
          <span>Número de Serie:</span>
          <span style="font-family: var(--font-mono);">${user.serialNumber || 'N/A'}</span>
        </div>
        <div class="user-detail-row">
          <span>Vigencia Desde:</span>
          <span>${user.validity?.notBefore ? new Date(user.validity.notBefore).toLocaleDateString() : 'Activo'}</span>
        </div>
        <div class="user-detail-row">
          <span>Vigencia Hasta:</span>
          <span>${user.validity?.notAfter ? new Date(user.validity.notAfter).toLocaleDateString() : '1 año'}</span>
        </div>
        <div class="user-detail-row">
          <span>Algoritmo de Firma:</span>
          <span>SHA-256 con cifrado RSA (${user.keySize || 2048} bits)</span>
        </div>

        <div style="margin-top: 14px;">
          <div style="font-size: 11px; color: var(--text-faint); margin-bottom: 4px;">FINGERPRINT SHA-256:</div>
          <div style="font-family: var(--font-mono); font-size: 10px; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; color: var(--emerald-success); word-break: break-all;">
            ${user.fingerprintSha256 || 'N/A'}
          </div>
        </div>

        <div style="margin-top: 18px; display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="/api/users/${user.id}/download/crt" class="btn btn-secondary btn-sm" download="certificado.crt">Descargar .CRT</a>
          <a href="/api/users/${user.id}/download/pub" class="btn btn-secondary btn-sm" download="public.pub">Descargar .PUB</a>
          <a href="/api/users/${user.id}/download/key" class="btn btn-secondary btn-sm" download="private.key">Descargar .KEY</a>
          <a href="/api/users/${user.id}/download/p12" class="btn btn-secondary btn-sm" download="keystore.p12">Descargar .P12</a>
        </div>
      `;
    }

    if (modal) modal.classList.add('active');
  },

  closeCertModal() {
    const modal = document.getElementById('modal-cert-details');
    if (modal) modal.classList.remove('active');
  },

  copyFingerprint(fp) {
    if (!fp) return;
    navigator.clipboard.writeText(fp).then(() => {
      window.App.showToast('Huella digital SHA-256 copiada al portapapeles.', 'info');
    });
  },

  togglePasswordVisibility(id, pass) {
    const el = document.getElementById(`pass-val-${id}`);
    if (!el) return;
    if (el.textContent === '••••••••') {
      el.textContent = pass || '123456';
    } else {
      el.textContent = '••••••••';
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.UsersModule.init();
});
