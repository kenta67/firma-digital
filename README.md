# FirmaDigital Bolivia Studio 🇧🇴
### Sistema Integral de Gestión de Usuarios, Generación de Llaves OpenSSL, Firma Digital PAdES de PDFs y Validación Oficial AGETIC

Este sistema implementa una solución completa para la gestión de múltiples usuarios, generación de pares de llaves asimétricas (Pública/Privada) con **OpenSSL 3.5**, estampado y firma digital de informes PDF bajo el estándar **PAdES (PDF Advanced Electronic Signatures)**, visualizador interactivo de PDF y verificación en vivo contra el portal oficial del Estado Plurinacional de Bolivia: **[validar.firmadigital.bo](https://validar.firmadigital.bo/#/)**.

---

## 🚀 Características Principales

1. **Apartado de Creación y Gestión de Múltiples Usuarios y Firmas**:
   - Registro de usuarios con sus metadatos oficiales: Nombre Completo, C.I., Cargo, Entidad / Institución, Correo y Contraseña de protección.
   - Generación automática de par de llaves (Pública / Privada) RSA de 2048 o 4096 bits.
   - Generación de Certificado Digital X.509 v3 con estructura y metadatos bolivianos (CN, O, OU, C=BO, serialNumber para C.I.).
   - Empaquetado en contenedor seguro **PKCS#12 (`.p12` / `.pfx`)**.
   - Descarga individual de archivos (`.key`, `.pub`, `.crt`, `.p12`) o descarga completa en paquete comprimido **`.ZIP`**.
   - Cálculo y visualización de la Huella Digital **SHA-256** del certificado.

2. **Laboratorio Interactivo OpenSSL (Workbench)**:
   - Generador en tiempo real mediante ejecución binaria real de **OpenSSL 3.5.3 CLI**.
   - Consola tipo terminal con registro de comandos ejecutados paso a paso:
     - `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048`
     - `openssl rsa -pubout -in private.key -out public.pub`
     - `openssl req -new -x509 -utf8 -key private.key -out cert.crt -days 365 -subj "..."`
   - Visor de llaves en formato PEM con pestañas y botón de copiado rápido al portapapeles.

3. **Firmador Digital de Informes PDF**:
   - Selección de informe: Opción de **generar un informe técnico oficial boliviano** de prueba o **subir cualquier archivo PDF propio** mediante arrastrar y soltar (drag & drop).
   - Estampado visual oficial con Tricolor boliviano, datos del signatario y **código QR escaneable** que redirige a `https://validar.firmadigital.bo/#/`.
   - Firma criptográfica **PAdES** (incremental update, cálculo de hash SHA-256 e incrustación de firma digital CMS/PKCS#7 detached).
   - Cálculo y reporte de resúmenes criptográficos SHA-256 y SHA-1.

4. **Visualizador de PDF Integrado**:
   - Visor de alta resolución potenciado por el motor **PDF.js**.
   - Selector para alternar instantáneamente entre **"Documento Firmado"** y **"Documento Original"**.
   - Controles de zoom (Aumentar, Reducir, 100%, Ajustar al Ancho).
   - Navegación interactiva de páginas (Anterior / Siguiente con contador).
   - Botón directo de descarga del documento en visualización.

5. **Validación Oficial en https://validar.firmadigital.bo/#/**:
   - **Verificación en Tiempo Real vía API Oficial**: Conexión directa con el backend de AGETIC (`https://validar.firmadigital.bo/backend/validador/pdf`), analizando los **4 Filtros de Seguridad de Bolivia (Ley 164)**:
     - **Documento Auténtico (Integridad)**: ✅ Certifica que el PDF no ha sufrido ninguna modificación posterior a la firma.
     - **Periodo de Vigencia**: ✅ Certifica que el documento fue firmado dentro del periodo de vigencia del certificado.
     - **Identidad del Signatario**: Reconoce Nombre, C.I., Cargo y Organización del firmante.
     - **Cadena de Confianza**: Explica la jerarquía PKI y el valor probatorio conforme a la Ley N° 164.
   - **Validación Manual en el Portal Web**: Botón de descarga del PDF firmado y enlace directo para arrastrarlo y comprobarlo en la interfaz web oficial de AGETIC.

---

## 🛠️ Tecnologías Empleadas

- **Backend**: Node.js (v22), Express.js, Multer, Archiver, Child Process.
- **Criptografía**: OpenSSL 3.5.3 CLI, Node-Forge, `@signpdf/signpdf`, `@signpdf/signer-p12`, `@signpdf/placeholder-pdf-lib`.
- **Manipulación de PDF**: `pdf-lib`, `qrcode`.
- **Frontend**: HTML5 Semántico, Vanilla CSS (Modo Oscuro, Glassmorphism, Paleta HSL, Tipografías Google Fonts Outfit/Inter/JetBrains Mono).
- **Visor**: PDF.js (Mozilla).

---

## 💻 Instrucciones de Ejecución

El servidor ya se encuentra en ejecución en segundo plano:

- **URL de la Aplicación**: [http://localhost:3000](http://localhost:3000)

Para iniciar o reiniciar manualmente el servidor en el futuro:
```bash
# Instalar dependencias (ya instaladas)
npm install

# Iniciar servidor
npm start
```

---

## ⚖️ Marco Legal y Normativo

- **Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación N° 164** (Estado Plurinacional de Bolivia).
- **Decreto Supremo N° 1793** (Reglamento a la Ley N° 164).
- **Entidades Rectoras**: ATT (Autoridad de Regulación y Fiscalización de Telecomunicaciones y Transportes) y AGETIC (Agencia de Gobierno Electrónico y Tecnologías de Información y Comunicación).
