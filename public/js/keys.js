/**
 * FirmaDigital Bolivia Studio - OpenSSL Interactive Workbench
 */

window.KeysModule = {
  currentGeneratedResult: null,
  activePemTarget: 'pem-priv',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('standalone-keys-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleGenerateKeys(e));
    }

    // PEM tabs
    const btnPriv = document.getElementById('btn-tab-priv');
    const btnPub = document.getElementById('btn-tab-pub');
    const btnCrt = document.getElementById('btn-tab-crt');

    if (btnPriv) btnPriv.addEventListener('click', () => this.switchPemTab('pem-priv', btnPriv));
    if (btnPub) btnPub.addEventListener('click', () => this.switchPemTab('pem-pub', btnPub));
    if (btnCrt) btnCrt.addEventListener('click', () => this.switchPemTab('pem-crt', btnCrt));

    // Copy PEM
    const btnCopy = document.getElementById('btn-copy-pem');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyCurrentPem());
    }
  },

  async handleGenerateKeys(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-generate-standalone');
    const term = document.getElementById('standalone-terminal-log');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Ejecutando OpenSSL en segundo plano...';
    }

    const payload = {
      name: document.getElementById('sk-name').value.trim(),
      ci: document.getElementById('sk-ci').value.trim(),
      email: document.getElementById('sk-email').value.trim(),
      organization: document.getElementById('sk-org').value.trim(),
      unit: document.getElementById('sk-unit').value.trim(),
      position: document.getElementById('sk-position').value.trim(),
      city: 'La Paz',
      passphrase: document.getElementById('sk-passphrase').value,
      keySize: parseInt(document.getElementById('sk-keysize').value, 10),
      method: document.getElementById('sk-method').value,
      validityDays: 365,
    };

    if (term) {
      term.innerHTML = `
        <div class="term-cmd">$ # Iniciando generación de llaves criptográficas...</div>
        <div class="term-out">Parámetros: RSA ${payload.keySize} bits | Titular: ${payload.name}</div>
      `;
    }

    try {
      const res = await fetch('/api/keys/generate-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        this.currentGeneratedResult = data.result;
        this.renderTerminalLogs(data.result.commandsLog);
        this.updatePemViewer();
        window.App.showToast('Par de llaves y certificado X.509 generados con éxito.', 'success');
      } else {
        window.App.showToast(`Error: ${data.error}`, 'error');
      }
    } catch (err) {
      window.App.showToast(`Error de conexión: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Ejecutar Generación con OpenSSL
        `;
      }
    }
  },

  renderTerminalLogs(logs) {
    const term = document.getElementById('standalone-terminal-log');
    if (!term || !logs) return;

    let html = `<div class="term-cmd">$ # Proceso criptográfico completado con éxito</div>`;
    logs.forEach((log) => {
      html += `
        <div class="term-cmd">$ ${log.cmd}</div>
        <div class="term-out">✓ ${log.step}</div>
      `;
    });

    if (this.currentGeneratedResult?.fingerprintSha256) {
      html += `
        <div class="term-cmd"># Huella Digital SHA-256 del Certificado:</div>
        <div class="term-out" style="color: #4ade80;">${this.currentGeneratedResult.fingerprintSha256}</div>
      `;
    }

    term.innerHTML = html;
    term.scrollTop = term.scrollHeight;
  },

  switchPemTab(target, clickedBtn) {
    this.activePemTarget = target;
    document.querySelectorAll('#pem-tab-buttons button').forEach((b) => b.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    this.updatePemViewer();
  },

  updatePemViewer() {
    const viewer = document.getElementById('pem-content-viewer');
    if (!viewer) return;

    if (!this.currentGeneratedResult) {
      viewer.textContent = 'Presione "Ejecutar Generación con OpenSSL" para ver el contenido PEM.';
      return;
    }

    if (this.activePemTarget === 'pem-priv') {
      viewer.textContent = this.currentGeneratedResult.privateKeyPem;
    } else if (this.activePemTarget === 'pem-pub') {
      viewer.textContent = this.currentGeneratedResult.publicKeyPem;
    } else if (this.activePemTarget === 'pem-crt') {
      viewer.textContent = this.currentGeneratedResult.certPem;
    }
  },

  copyCurrentPem() {
    const viewer = document.getElementById('pem-content-viewer');
    if (!viewer || !viewer.textContent) return;

    navigator.clipboard.writeText(viewer.textContent).then(() => {
      window.App.showToast('Contenido PEM copiado al portapapeles.', 'info');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.KeysModule.init();
});
