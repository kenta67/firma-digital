import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ZipArchive } from 'archiver';
import { fileURLToPath } from 'url';

import { cryptoService } from './services/cryptoService.js';
import { userStore } from './services/userStore.js';
import { pdfSignerService } from './services/pdfSignerService.js';
import { validatorService } from './services/validatorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data/signed_docs', express.static(path.join(__dirname, 'data', 'signed_docs')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Memory cache for the latest signed/previewed PDF
let latestSignedPdf = null;
let latestOriginalPdf = null;

// ==========================================
// 1. SYSTEM & STATUS APIS
// ==========================================
app.get('/api/status', (req, res) => {
  const info = cryptoService.getSystemInfo();
  res.json({
    status: 'online',
    systemInfo: info,
    officialValidatorUrl: 'https://validar.firmadigital.bo/#/',
    time: new Date().toISOString(),
  });
});

// ==========================================
// 2. USER MANAGEMENT & KEY GENERATION APIS
// ==========================================
app.get('/api/users', (req, res) => {
  try {
    const users = userStore.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, ci, organization, unit, position, email, city, passphrase, keySize, validityDays, method } = req.body;

    if (!name || !ci) {
      return res.status(400).json({ success: false, error: 'El nombre completo y C.I. son obligatorios.' });
    }

    const result = await userStore.createUser({
      name,
      ci,
      organization: organization || 'Entidad Oficial',
      unit: unit || 'Tecnología',
      position: position || 'Firmante',
      email: email || 'usuario@dominio.bo',
      city: city || 'La Paz',
      country: 'BO',
      passphrase: passphrase || '123456',
      keySize: keySize || 2048,
      validityDays: validityDays || 365,
      method: method || 'openssl',
    });

    res.json({
      success: true,
      message: 'Usuario y par de llaves generados exitosamente.',
      user: result.user,
      commandsLog: result.keyBundle.commandsLog,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  const user = userStore.getUserById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  res.json({ success: true, user });
});

app.delete('/api/users/:id', (req, res) => {
  const success = userStore.deleteUser(req.params.id);
  if (!success) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  res.json({ success: true, message: 'Usuario eliminado exitosamente.' });
});

app.get('/api/users/:id/download/:fileType', (req, res) => {
  const { id, fileType } = req.params;
  const user = userStore.getUserById(id);
  if (!user) return res.status(404).send('Usuario no encontrado.');

  const keyFiles = user.keyFiles;

  if (fileType === 'zip') {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const cleanName = user.name.replace(/[^a-zA-Z0-9]/g, '_');
    res.attachment(`llaves_${cleanName}.zip`);

    archive.pipe(res);
    archive.file(keyFiles.privateKey, { name: 'private_key.pem' });
    archive.file(keyFiles.publicKey, { name: 'public_key.pub' });
    archive.file(keyFiles.certificate, { name: 'certificate.crt' });
    archive.file(keyFiles.keystore, { name: 'keystore.p12' });
    archive.append(
      JSON.stringify(
        {
          usuario: user.name,
          ci: user.ci,
          organizacion: user.organization,
          cargo: user.position,
          email: user.email,
          serialNumber: user.serialNumber,
          fingerprintSha256: user.fingerprintSha256,
          passphraseP12: user.passphrase,
          nota: 'Conserve su llave privada en estricta confidencialidad. Para firmar use keystore.p12.',
        },
        null,
        2
      ),
      { name: 'instrucciones_y_metadatos.json' }
    );
    archive.finalize();
    return;
  }

  const map = {
    key: { path: keyFiles.privateKey, name: 'private.key', mime: 'application/x-pem-file' },
    pub: { path: keyFiles.publicKey, name: 'public.pub', mime: 'application/x-pem-file' },
    crt: { path: keyFiles.certificate, name: 'certificate.crt', mime: 'application/x-x509-ca-cert' },
    p12: { path: keyFiles.keystore, name: 'keystore.p12', mime: 'application/x-pkcs12' },
  };

  const fileConfig = map[fileType];
  if (!fileConfig || !fs.existsSync(fileConfig.path)) {
    return res.status(404).send('Archivo no encontrado.');
  }

  res.setHeader('Content-Type', fileConfig.mime);
  res.download(fileConfig.path, `${user.name.replace(/[^a-zA-Z0-9]/g, '_')}_${fileConfig.name}`);
});

// ==========================================
// 3. STANDALONE OPENSSL WORKBENCH API
// ==========================================
app.post('/api/keys/generate-standalone', async (req, res) => {
  try {
    const { name, ci, organization, unit, position, email, city, passphrase, keySize, validityDays, method } = req.body;

    const result = await cryptoService.generateKeyPair({
      name: name || 'USUARIO DE PRUEBA',
      ci: ci || '1234567 LP',
      organization: organization || 'ORGANIZACION DE PRUEBA',
      unit: unit || 'SISTEMAS',
      position: position || 'RESPONSABLE',
      email: email || 'usuario@dominio.bo',
      city: city || 'La Paz',
      country: 'BO',
      passphrase: passphrase || '123456',
      keySize: keySize || 2048,
      validityDays: validityDays || 365,
      method: method || 'openssl',
    });

    res.json({
      success: true,
      result: {
        privateKeyPem: result.privateKeyPem,
        publicKeyPem: result.publicKeyPem,
        certPem: result.certPem,
        p12Base64: result.p12Base64,
        fingerprintSha256: result.fingerprintSha256,
        fingerprintSha1: result.fingerprintSha1,
        serialNumber: result.serialNumber,
        validity: result.validity,
        subject: result.subject,
        commandsLog: result.commandsLog,
        method: result.method,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. SAMPLE REPORT GENERATION API
// ==========================================
app.post('/api/pdf/create-sample', async (req, res) => {
  try {
    const { title, code, recipient, author, authorPosition, contentSubject } = req.body;
    const pdfBuffer = await pdfSignerService.createSampleReport({
      title,
      code,
      recipient,
      author,
      authorPosition,
      contentSubject,
    });

    latestOriginalPdf = {
      buffer: pdfBuffer,
      base64: pdfBuffer.toString('base64'),
      filename: `informe_tecnico_${Date.now()}.pdf`,
    };

    res.json({
      success: true,
      message: 'Informe oficial de prueba generado exitosamente.',
      pdfBase64: latestOriginalPdf.base64,
      filename: latestOriginalPdf.filename,
      size: pdfBuffer.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. PDF DIGITAL SIGNING API
// ==========================================
app.post(
  '/api/pdf/sign',
  upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'p12File', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let pdfBuffer = null;
      let p12Buffer = null;
      let passphrase = req.body.passphrase || '123456';
      let userObj = null;

      // Handle PDF source (uploaded file or generated sample)
      if (req.files?.pdfFile?.[0]) {
        pdfBuffer = fs.readFileSync(req.files.pdfFile[0].path);
        // Clean temp upload
        fs.unlinkSync(req.files.pdfFile[0].path);
      } else if (req.body.useSamplePdf === 'true' || !req.body.pdfBase64) {
        pdfBuffer = await pdfSignerService.createSampleReport({
          title: req.body.sampleTitle || 'INFORME TÉCNICO OFICIAL',
          author: req.body.sampleAuthor || 'Firmante Oficial',
        });
      } else if (req.body.pdfBase64) {
        pdfBuffer = Buffer.from(req.body.pdfBase64, 'base64');
      }

      if (!pdfBuffer) {
        return res.status(400).json({ success: false, error: 'No se proporcionó ningún documento PDF para firmar.' });
      }

      // Store as latest original
      latestOriginalPdf = {
        buffer: pdfBuffer,
        base64: pdfBuffer.toString('base64'),
        filename: 'documento_original.pdf',
      };

      // Handle Key source (From User Store OR Uploaded .p12)
      if (req.body.userId) {
        const userKeys = userStore.getUserKeyBuffers(req.body.userId);
        if (!userKeys) return res.status(404).json({ success: false, error: 'Usuario firmante no encontrado.' });
        
        const inputPassphrase = (req.body.passphrase || '').trim();
        if (!inputPassphrase) {
          return res.status(400).json({
            success: false,
            error: 'Debe ingresar la contraseña de la llave privada del usuario para autorizar la firma digital.',
          });
        }

        // Verify password against user's encrypted keystore password
        if (userKeys.user.passphrase && inputPassphrase !== userKeys.user.passphrase) {
          return res.status(401).json({
            success: false,
            error: 'Contraseña de la llave privada incorrecta. La firma digital no fue autorizada.',
          });
        }

        p12Buffer = userKeys.p12Buffer;
        passphrase = inputPassphrase;
        userObj = userKeys.user;
      } else if (req.files?.p12File?.[0]) {
        p12Buffer = fs.readFileSync(req.files.p12File[0].path);
        fs.unlinkSync(req.files.p12File[0].path);
        const inputPassphrase = (req.body.passphrase || '').trim();
        if (!inputPassphrase) {
          return res.status(400).json({
            success: false,
            error: 'Debe ingresar la contraseña del archivo .p12 para autorizar la firma digital.',
          });
        }
        passphrase = inputPassphrase;
        userObj = {
          name: req.body.customSignerName || 'Signatario Externo',
          ci: req.body.customSignerCi || 'C.I. Externo',
          organization: req.body.customSignerOrg || 'Entidad Certificada',
          position: req.body.customSignerPosition || 'Signatario',
          email: req.body.customSignerEmail || 'contacto@dominio.bo',
        };
      } else if (req.body.p12Base64) {
        p12Buffer = Buffer.from(req.body.p12Base64, 'base64');
        const inputPassphrase = (req.body.passphrase || '').trim();
        if (!inputPassphrase) {
          return res.status(400).json({
            success: false,
            error: 'Debe ingresar la contraseña del archivo .p12 para autorizar la firma digital.',
          });
        }
        passphrase = inputPassphrase;
        userObj = {
          name: req.body.customSignerName || 'Signatario',
          ci: req.body.customSignerCi || '',
          organization: req.body.customSignerOrg || '',
          position: req.body.customSignerPosition || '',
          email: req.body.customSignerEmail || '',
        };
      } else {
        return res.status(400).json({
          success: false,
          error: 'No se seleccionó un usuario ni se adjuntó un archivo .p12 para la firma.',
        });
      }

      // Execute PAdES Digital Signature
      const signResult = await pdfSignerService.signPdf({
        pdfBuffer,
        p12Buffer,
        passphrase,
        user: userObj,
        reason: req.body.reason || 'Aprobación y conformidad de informe técnico',
        location: req.body.location || 'La Paz, Bolivia',
        pageNumber: req.body.pageNumber ? parseInt(req.body.pageNumber, 10) : null,
        stampPosition: req.body.stampPosition || 'bottom-right',
        addVisualStamp: req.body.addVisualStamp !== 'false',
      });

      latestSignedPdf = signResult;

      res.json({
        success: true,
        message: 'Documento PDF firmado digitalmente con éxito conforme a estándar PAdES.',
        filename: signResult.filename,
        pdfBase64: signResult.signedPdfBase64,
        size: signResult.size,
        hashes: signResult.hashes,
        metadata: signResult.metadata,
        officialValidatorUrl: 'https://validar.firmadigital.bo/#/',
      });
    } catch (err) {
      console.error('Error al firmar PDF:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 6. OFFICIAL VALIDATION PROXY API
// ==========================================
app.post('/api/pdf/validate-official', upload.single('pdfFile'), async (req, res) => {
  try {
    let pdfBuffer = null;

    if (req.file) {
      pdfBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);
    } else if (req.body.pdfBase64) {
      pdfBuffer = Buffer.from(req.body.pdfBase64, 'base64');
    } else if (latestSignedPdf) {
      pdfBuffer = latestSignedPdf.signedPdfBuffer;
    }

    if (!pdfBuffer) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró ningún PDF para validar. Firme un documento o suba un archivo.',
      });
    }

    const validationResult = await validatorService.validatePdf(pdfBuffer);
    res.json({
      success: true,
      result: validationResult,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. DOWNLOAD / SERVE LATEST PDFS
// ==========================================
app.get('/api/pdf/latest/signed', (req, res) => {
  if (!latestSignedPdf) {
    return res.status(404).send('No hay ningún PDF firmado disponible.');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="informe_firmado_digitalmente.pdf"');
  res.send(latestSignedPdf.signedPdfBuffer);
});

app.get('/api/pdf/latest/original', (req, res) => {
  if (!latestOriginalPdf) {
    return res.status(404).send('No hay ningún PDF original disponible.');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="informe_original.pdf"');
  res.send(latestOriginalPdf.buffer);
});

// Start Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 FirmaDigital Bolivia Studio iniciado en puerto ${PORT}`);
  console.log(`🔗 URL Local: http://localhost:${PORT}`);
  console.log(`=======================================================`);

  // Initialize sample users if needed
  await userStore.initDefaultUsersIfNeeded();
});
