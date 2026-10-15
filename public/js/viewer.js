/**
 * FirmaDigital Bolivia Studio - PDF Viewer Controller (PDF.js Engine)
 */

window.ViewerModule = {
  pdfDoc: null,
  pageNum: 1,
  pageRendering: false,
  pageNumPending: null,
  scale: 1.25,
  currentMode: 'signed', // 'signed' or 'original'
  signedPdfBase64: null,
  originalPdfBase64: null,

  init() {
    this.bindEvents();
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  },

  bindEvents() {
    // Mode buttons
    const btnSigned = document.getElementById('viewer-btn-show-signed');
    const btnOriginal = document.getElementById('viewer-btn-show-original');

    if (btnSigned) {
      btnSigned.addEventListener('click', () => {
        this.currentMode = 'signed';
        btnSigned.classList.add('active');
        btnOriginal?.classList.remove('active');
        this.loadCurrentModeDocument();
      });
    }

    if (btnOriginal) {
      btnOriginal.addEventListener('click', () => {
        this.currentMode = 'original';
        btnOriginal.classList.add('active');
        btnSigned?.classList.remove('active');
        this.loadCurrentModeDocument();
      });
    }

    // Page navigation
    const btnPrev = document.getElementById('viewer-prev-page');
    const btnNext = document.getElementById('viewer-next-page');

    if (btnPrev) btnPrev.addEventListener('click', () => this.onPrevPage());
    if (btnNext) btnNext.addEventListener('click', () => this.onNextPage());

    // Zoom controls
    const btnZoomIn = document.getElementById('viewer-zoom-in');
    const btnZoomOut = document.getElementById('viewer-zoom-out');
    const btnZoomFit = document.getElementById('viewer-zoom-fit');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.scale = Math.min(3.0, this.scale + 0.2);
        this.updateZoomDisplay();
        this.renderPage(this.pageNum);
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.scale = Math.max(0.5, this.scale - 0.2);
        this.updateZoomDisplay();
        this.renderPage(this.pageNum);
      });
    }

    if (btnZoomFit) {
      btnZoomFit.addEventListener('click', () => {
        this.fitToWidth();
      });
    }
  },

  onTabActivated() {
    this.loadCurrentModeDocument();
  },

  updateZoomDisplay() {
    const el = document.getElementById('viewer-zoom-level');
    if (el) el.textContent = `${Math.round(this.scale * 100)}%`;
  },

  async loadCurrentModeDocument() {
    const url =
      this.currentMode === 'signed' ? '/api/pdf/latest/signed' : '/api/pdf/latest/original';

    // Update download button link
    const dlBtn = document.getElementById('btn-viewer-download');
    if (dlBtn) {
      dlBtn.href = url;
      dlBtn.download =
        this.currentMode === 'signed' ? 'informe_firmado.pdf' : 'informe_original.pdf';
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        // If not generated yet, try creating a sample
        if (this.currentMode === 'original' || this.currentMode === 'signed') {
          await this.loadFallbackSample();
          return;
        }
      }

      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      this.renderPdfBuffer(arrayBuffer);
    } catch (e) {
      console.warn('Error al cargar documento para visor:', e);
      this.loadFallbackSample();
    }
  },

  async loadFallbackSample() {
    try {
      const res = await fetch('/api/pdf/create-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'INFORME TÉCNICO OFICIAL DE MUESTRA',
          author: 'Usuario del Sistema',
        }),
      });
      const data = await res.json();
      if (data.success && data.pdfBase64) {
        this.loadSignedPdfFromBase64(data.pdfBase64);
      }
    } catch (err) {
      console.error('Fallback sample creation failed:', err);
    }
  },

  loadSignedPdfFromBase64(base64) {
    this.signedPdfBase64 = base64;
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    this.renderPdfBuffer(buffer.buffer);
  },

  async renderPdfBuffer(arrayBuffer) {
    if (!window.pdfjsLib) {
      this.showIframeFallback(arrayBuffer);
      return;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;

      this.pageNum = 1;
      this.renderPage(this.pageNum);
    } catch (err) {
      console.warn('PDF.js render failed, switching to iframe fallback:', err);
      this.showIframeFallback(arrayBuffer);
    }
  },

  showIframeFallback(arrayBuffer) {
    const iframe = document.getElementById('pdf-fallback-iframe');
    const canvasWrap = document.getElementById('pdf-canvas-wrapper');
    if (!iframe || !canvasWrap) return;

    canvasWrap.style.display = 'none';
    iframe.style.display = 'block';

    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    iframe.src = URL.createObjectURL(blob);
  },

  renderPage(num) {
    if (!this.pdfDoc) return;
    this.pageRendering = true;

    this.pdfDoc.getPage(num).then((page) => {
      const canvas = document.getElementById('pdf-canvas');
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: this.scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        this.pageRendering = false;
        if (this.pageNumPending !== null) {
          this.renderPage(this.pageNumPending);
          this.pageNumPending = null;
        }
      });
    });

    const counter = document.getElementById('viewer-page-counter');
    if (counter) {
      counter.textContent = `Página ${num} de ${this.pdfDoc.numPages}`;
    }
  },

  queueRenderPage(num) {
    if (this.pageRendering) {
      this.pageNumPending = num;
    } else {
      this.renderPage(num);
    }
  },

  onPrevPage() {
    if (this.pageNum <= 1) return;
    this.pageNum--;
    this.queueRenderPage(this.pageNum);
  },

  onNextPage() {
    if (!this.pdfDoc || this.pageNum >= this.pdfDoc.numPages) return;
    this.pageNum++;
    this.queueRenderPage(this.pageNum);
  },

  fitToWidth() {
    const viewport = document.getElementById('viewer-viewport');
    if (!viewport || !this.pdfDoc) return;

    const availableWidth = viewport.clientWidth - 60;
    this.pdfDoc.getPage(this.pageNum).then((page) => {
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      this.scale = Math.max(0.6, Math.min(2.5, availableWidth / unscaledViewport.width));
      this.updateZoomDisplay();
      this.renderPage(this.pageNum);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.ViewerModule.init();
});
