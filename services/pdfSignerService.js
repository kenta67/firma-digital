import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import placeholderPkg from '@signpdf/placeholder-pdf-lib';
const { pdflibAddPlaceholder } = placeholderPkg;
import signpdfPkg from '@signpdf/signpdf';
const { SignPdf } = signpdfPkg;
import signerPkg from '@signpdf/signer-p12';
const { P12Signer } = signerPkg;
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SIGNED_DIR = path.join(process.cwd(), 'data', 'signed_docs');

export class PdfSignerService {
  constructor() {
    if (!fs.existsSync(SIGNED_DIR)) {
      fs.mkdirSync(SIGNED_DIR, { recursive: true });
    }
  }

  /**
   * Generates a formal Bolivian Technical Report PDF
   */
  async createSampleReport(options = {}) {
    const {
      title = 'INFORME TÉCNICO DE AUDITORÍA DE SEGURIDAD INFORMÁTICA',
      code = 'INF-TIC-2026-089',
      recipient = 'Ing. Juan Pérez Gómez - Director General de Tecnologías',
      author = 'Ing. Carlos Mendoza Alarcón',
      authorPosition = 'Auditor de Seguridad y Firma Digital',
      dateStr = new Date().toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      contentSubject = 'Verificación e Implementación de Infraestructura de Clave Pública y Firma Digital PAdES',
    } = options;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 format
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Bolivian Tricolor Top Banner (Red, Yellow, Green)
    const bannerHeight = 5;
    page.drawRectangle({
      x: 0,
      y: height - bannerHeight,
      width: width,
      height: bannerHeight,
      color: rgb(0.85, 0.15, 0.15), // Red
    });
    page.drawRectangle({
      x: 0,
      y: height - bannerHeight * 2,
      width: width,
      height: bannerHeight,
      color: rgb(0.95, 0.8, 0.1), // Yellow
    });
    page.drawRectangle({
      x: 0,
      y: height - bannerHeight * 3,
      width: width,
      height: bannerHeight,
      color: rgb(0.1, 0.65, 0.3), // Green
    });

    let y = height - 50;

    // Header Title
    page.drawText('ESTADO PLURINACIONAL DE BOLIVIA', {
      x: 50,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 16;
    page.drawText('SISTEMA INTEGRAL DE GESTIÓN Y FIRMA DIGITAL', {
      x: 50,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });
    y -= 25;

    // Report Title Box
    page.drawRectangle({
      x: 50,
      y: y - 28,
      width: width - 100,
      height: 38,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
    });
    page.drawText(title, {
      x: 65,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.18, 0.35),
    });
    page.drawText(`CÓDIGO: ${code}  |  FECHA DE EMISIÓN: ${dateStr}`, {
      x: 65,
      y: y - 24,
      size: 8,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.45),
    });
    y -= 50;

    // Metadata Table
    const metaBoxY = y - 65;
    page.drawRectangle({
      x: 50,
      y: metaBoxY,
      width: width - 100,
      height: 65,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    page.drawText('A:', { x: 65, y: y - 16, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
    page.drawText(recipient, { x: 120, y: y - 16, size: 9, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

    page.drawText('DE:', { x: 65, y: y - 32, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
    page.drawText(`${author} (${authorPosition})`, { x: 120, y: y - 32, size: 9, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

    page.drawText('REF:', { x: 65, y: y - 48, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
    page.drawText(contentSubject, { x: 120, y: y - 48, size: 9, font: fontOblique, color: rgb(0.2, 0.25, 0.3) });
    y -= 85;

    // Body Sections
    const drawSection = (heading, lines) => {
      page.drawText(heading, { x: 50, y, size: 10, font: fontBold, color: rgb(0.1, 0.3, 0.6) });
      y -= 16;
      for (const line of lines) {
        page.drawText(line, { x: 50, y, size: 8.5, font: fontRegular, color: rgb(0.2, 0.22, 0.25) });
        y -= 13;
      }
      y -= 10;
    };

    drawSection('1. OBJETIVO Y MARCO NORMATIVO', [
      'El presente informe formaliza la evaluación de seguridad, integridad y no repudio de documentos electrónicos',
      'firmados digitalmente, en estricto cumplimiento de la Ley N° 164 (Ley General de Telecomunicaciones, Tecnologías',
      'de Información y Comunicación) y el D.S. N° 1793 del Estado Plurinacional de Bolivia.',
      'La firma digital estampada garantiza autenticidad, integridad inalterable y validez probatoria oficial.',
    ]);

    drawSection('2. ESPECIFICACIONES CRIPTOGRÁFICAS DE LA FIRMA', [
      '• Estándar de Firma: PAdES (PDF Advanced Electronic Signatures - ISO 32000-1 / RFC 5652).',
      '• Algoritmo de Cifrado Asimétrico: RSA 2048 / 4096 bits conforme a estándares PKCS#1 v2.1 y OpenSSL.',
      '• Función Resumen Criptográfico (Hash): SHA-256 (Secure Hash Algorithm 256 bits).',
      '• Formato de Empaquetado: PKCS#7 / CMS detached con inclusión de certificado digital X.509 v3.',
      '• Plataforma de Validación Oficial: https://validar.firmadigital.bo/#/ (AGETIC Bolivia).',
    ]);

    drawSection('3. CONCLUSIONES Y CONFORMIDAD', [
      'Se verifica que el proceso de firma digital incorpora los metadatos institucionales del firmante (Nombre, C.I.,',
      'Cargo, Entidad y Vigencia). La firma electrónica contenida en este PDF certifica que el contenido no ha sido',
      'modificado desde su emisión, permitiendo su verificación inmediata en los portales del Estado Plurinacional.',
    ]);

    // Bottom Notice
    y = 175;
    page.drawText('ESPACIO RESERVADO PARA ESTAMPADO DE FIRMA DIGITAL CONFORME A LEY 164', {
      x: 50,
      y,
      size: 7.5,
      font: fontBold,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawLine({
      start: { x: 50, y: y - 5 },
      end: { x: width - 50, y: y - 5 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.9),
    });

    // Footer
    page.drawText('Documento Oficial Generado Electrónicamente - Estado Plurinacional de Bolivia', {
      x: 50,
      y: 25,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.6, 0.65, 0.7),
    });
    page.drawText('Página 1 de 1', {
      x: width - 95,
      y: 25,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.6, 0.65, 0.7),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Signs a PDF document with PAdES digital signature and optional visual stamp
   */
  async signPdf(options) {
    const {
      pdfBuffer,
      p12Buffer,
      passphrase = '123456',
      user,
      reason = 'Aprobación y conformidad de informe técnico',
      location = 'La Paz, Bolivia',
      pageNumber = null, // null means last page
      stampPosition = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right'
      addVisualStamp = true,
    } = options;

    if (!pdfBuffer || !p12Buffer) {
      throw new Error('Se requiere el buffer del PDF y el buffer del archivo PKCS#12 (.p12).');
    }

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const targetPageIndex = pageNumber ? Math.min(Math.max(1, pageNumber), pages.length) - 1 : pages.length - 1;
    const targetPage = pages[targetPageIndex];
    const { width, height } = targetPage.getSize();

    const signerName = (user?.name || 'Signatario Autorizado').toUpperCase();
    const signerCi = user?.ci || 'C.I. Registrado';
    const signerOrg = user?.organization || 'Entidad Oficial';
    const signerPos = user?.position || 'Responsable';
    const now = new Date();
    const nowBoliviaStr = now.toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + ' GMT-04:00';

    if (addVisualStamp) {
      // Generate QR Code pointing to official validator
      const qrDataUrl = await QRCode.toDataURL('https://validar.firmadigital.bo/#/', {
        margin: 1,
        width: 150,
        color: { dark: '#0b192c', light: '#ffffff' },
      });
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Stamp dimensions
      const stampWidth = 260;
      const stampHeight = 84;
      let stampX = width - stampWidth - 40;
      let stampY = 55;

      if (stampPosition === 'bottom-left') {
        stampX = 40;
        stampY = 55;
      } else if (stampPosition === 'top-right') {
        stampX = width - stampWidth - 40;
        stampY = height - stampHeight - 50;
      }

      // Draw Stamp Container (Glassmorphic border effect)
      targetPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        color: rgb(0.97, 0.99, 1.0),
        borderColor: rgb(0.06, 0.45, 0.75),
        borderWidth: 1.2,
      });

      // Accent Left bar (Bolivia Tricolor flag indicator)
      targetPage.drawRectangle({
        x: stampX,
        y: stampY + (stampHeight * 2) / 3,
        width: 4,
        height: stampHeight / 3,
        color: rgb(0.85, 0.15, 0.15), // Red
      });
      targetPage.drawRectangle({
        x: stampX,
        y: stampY + stampHeight / 3,
        width: 4,
        height: stampHeight / 3,
        color: rgb(0.95, 0.8, 0.1), // Yellow
      });
      targetPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: 4,
        height: stampHeight / 3,
        color: rgb(0.1, 0.65, 0.3), // Green
      });

      // Draw QR Code
      const qrSize = 64;
      targetPage.drawImage(qrImage, {
        x: stampX + 10,
        y: stampY + 10,
        width: qrSize,
        height: qrSize,
      });

      // Stamp Text Elements
      let textX = stampX + 80;
      let textY = stampY + stampHeight - 14;

      targetPage.drawText('FIRMADO DIGITALMENTE POR:', {
        x: textX,
        y: textY,
        size: 7,
        font: fontBold,
        color: rgb(0.06, 0.45, 0.75),
      });
      textY -= 12;

      // Truncate long names
      const truncatedName = signerName.length > 25 ? signerName.substring(0, 24) + '...' : signerName;
      targetPage.drawText(truncatedName, {
        x: textX,
        y: textY,
        size: 8.5,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2),
      });
      textY -= 10;

      targetPage.drawText(`CI: ${signerCi} | ${signerPos.substring(0, 22)}`, {
        x: textX,
        y: textY,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      });
      textY -= 9;

      const truncatedOrg = signerOrg.length > 32 ? signerOrg.substring(0, 31) + '...' : signerOrg;
      targetPage.drawText(truncatedOrg, {
        x: textX,
        y: textY,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      });
      textY -= 9;

      targetPage.drawText(`Fecha: ${nowBoliviaStr}`, {
        x: textX,
        y: textY,
        size: 6.2,
        font: fontRegular,
        color: rgb(0.1, 0.5, 0.3),
      });
      textY -= 9;

      targetPage.drawText('Validador: https://validar.firmadigital.bo', {
        x: textX,
        y: textY,
        size: 5.8,
        font: fontRegular,
        color: rgb(0.06, 0.45, 0.75),
      });
      textY -= 8;

      targetPage.drawText('Conforme a Ley 164 - Estado Plurinacional de Bolivia', {
        x: textX,
        y: textY,
        size: 5.5,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.55),
      });
    }

    // Add PAdES digital signature placeholder dictionary
    pdflibAddPlaceholder({
      pdfDoc,
      reason: reason || 'Aprobación oficial',
      contactInfo: user?.email || 'firmadigital@bolivia.bo',
      name: signerName,
      location: location || 'La Paz, Bolivia',
      signatureLength: 16384,
    });

    const pdfWithPlaceholderBytes = await pdfDoc.save();

    // Sign with P12Signer
    let signedPdfBuffer;
    try {
      const signer = new P12Signer(p12Buffer, { passphrase });
      const signPdf = new SignPdf();
      signedPdfBuffer = await signPdf.sign(Buffer.from(pdfWithPlaceholderBytes), signer);
    } catch (signerErr) {
      if (
        signerErr.message &&
        (signerErr.message.includes('MAC') ||
          signerErr.message.includes('password') ||
          signerErr.message.includes('PKCS#12') ||
          signerErr.message.includes('passphrase'))
      ) {
        throw new Error('Contraseña de la llave privada incorrecta. No se pudo descifrar el contenedor PKCS#12.');
      }
      throw signerErr;
    }

    // Save signed PDF to records
    const filename = `signed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.pdf`;
    const filePath = path.join(SIGNED_DIR, filename);
    fs.writeFileSync(filePath, signedPdfBuffer);

    // Calculate SHA-256 and SHA-1 hashes of signed PDF
    const sha256 = crypto.createHash('sha256').update(signedPdfBuffer).digest('hex');
    const sha1 = crypto.createHash('sha1').update(signedPdfBuffer).digest('hex');

    return {
      filename,
      filePath,
      signedPdfBuffer,
      signedPdfBase64: signedPdfBuffer.toString('base64'),
      size: signedPdfBuffer.length,
      hashes: { sha256, sha1 },
      metadata: {
        signerName,
        signerCi,
        signerOrg,
        reason,
        location,
        signedAt: now.toISOString(),
      },
    };
  }
}

export const pdfSignerService = new PdfSignerService();
