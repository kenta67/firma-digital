/**
 * FirmaDigital Bolivia Studio - Core Application & Routing
 */

window.App = {
  currentTab: 'tab-users',
  systemInfo: null,
  users: [],
  latestSignedPdf: null,
  latestOriginalPdf: null,

  init() {
    this.setupTabs();
    this.fetchSystemStatus();
    console.log('FirmaDigital Bolivia Studio inicializado.');
  },

  setupTabs() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update buttons
    document.querySelectorAll('.nav-tab-btn').forEach((b) => {
      if (b.getAttribute('data-tab') === tabId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Update panes
    document.querySelectorAll('.tab-pane').forEach((p) => {
      if (p.id === tabId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Lifecycle triggers on tab change
    if (tabId === 'tab-users' && window.UsersModule) {
      window.UsersModule.loadUsers();
    } else if (tabId === 'tab-viewer' && window.ViewerModule) {
      window.ViewerModule.onTabActivated();
    }
  },

  async fetchSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      this.systemInfo = data.systemInfo;

      const opensslText = document.getElementById('openssl-version-text');
      if (opensslText && this.systemInfo?.opensslVersion) {
        const versionFirstLine = this.systemInfo.opensslVersion.split('\n')[0];
        opensslText.textContent = versionFirstLine.replace(' (Library: ...)', '');
      }
    } catch (e) {
      console.warn('No se pudo verificar el estado del sistema:', e);
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    if (type === 'success') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }

    toast.innerHTML = `
      ${icon}
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
