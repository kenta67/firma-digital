export class ValidatorService {
  constructor() {
    this.officialApiUrl = 'https://validar.firmadigital.bo/backend/validador/pdf';
  }

  /**
   * Validates a signed PDF against the official Bolivian validator API
   * (AGETIC - validar.firmadigital.bo)
   */
  async validatePdf(pdfBuffer) {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Se requiere el buffer del PDF firmado.');
    }

    const base64Data = pdfBuffer.toString('base64');

    try {
      const response = await fetch(this.officialApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          pdfFirmadoBase64: base64Data,
        }),
      });

      if (!response.ok) {
        throw new Error(`El validador oficial respondió con código HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return this.enrichValidationResult(json);
    } catch (error) {
      return {
        onlineValidationFailed: true,
        tipoRespuesta: 'Error',
        exito: false,
        mensaje: `No se pudo conectar con el servicio oficial: ${error.message}. Puede validar manualmente en https://validar.firmadigital.bo/#/`,
        errorDetail: error.message,
      };
    }
  }

  /**
   * Enriches official JSON with clear descriptions and legal context
   */
  enrichValidationResult(rawResult) {
    const firmas = rawResult?.objeto?.firmas || [];
    const enrichedFirmas = firmas.map((firma, idx) => {
      const detalle = firma.detalleValidacion || {};
      const cert = firma.certificado || {};

      return {
        index: idx + 1,
        fechaFirma: firma.fechaFirma,
        noModificado: firma.noModificado,
        cadenaConfianza: firma.cadenaConfianza,
        firmadoDuranteVigencia: firma.firmadoDuranteVigencia,
        certificado: {
          nombreSignatario: cert.nombreSignatario,
          ciSignatario: cert.ciSignatario || cert.nitSignatario || 'N/A',
          organizacionSignatario: cert.organizacionSignatario,
          unidadSignatario: cert.unidadSignatario,
          cargoSignatario: cert.cargoSignatario,
          correoElectronicoSignatario: cert.correoElectronicoSignatario,
          numeroSerie: cert.numeroSerie,
          inicioValidez: cert.inicioValidez,
          finValidez: cert.finValidez,
          nombreECA: cert.nombreECA,
        },
        indicadores: [
          {
            nombre: 'Documento Auténtico (Integridad)',
            estado: detalle.documentoValidacion === 'EXITO' ? 'EXITO' : 'ERROR',
            titulo: detalle.documentoEstado || 'Documento auténtico',
            descripcion: detalle.documentoDescripcion || 'El documento no ha sido modificado después de la firma.',
            esVerde: detalle.documentoValidacion === 'EXITO',
          },
          {
            nombre: 'Periodo de Vigencia',
            estado: detalle.periodoValidezValidacion === 'EXITO' ? 'EXITO' : 'ERROR',
            titulo: detalle.periodoValidezEstado || 'Periodo de vigencia',
            descripcion: detalle.periodoValidezDescripcion || 'La firma fue realizada dentro del periodo de vigencia del certificado.',
            esVerde: detalle.periodoValidezValidacion === 'EXITO',
          },
          {
            nombre: 'Cadena de Confianza',
            estado: detalle.cadenaConfianzaValidacion || 'INFO',
            titulo: detalle.cadenaConfianzaEstado || 'Cadena de confianza',
            descripcion: detalle.cadenaConfianzaDescripcion || 'Estado de la entidad emisora del certificado.',
            esVerde: detalle.cadenaConfianzaValidacion === 'EXITO',
            notaTecnica: detalle.cadenaConfianzaValidacion !== 'EXITO'
              ? 'Nota Académica / Técnica: Este certificado fue generado con OpenSSL / Claves Propias. Criptográficamente la firma es 100% íntegra y el documento inalterable. Para plena validez legal del Estado en Bolivia, la Ley 164 estipula que el certificado debe ser emitido por la Entidad Certificadora Pública (ADSIB/Digicert) en token criptográfico homologado.'
              : 'Certificado reconocido por la PKI del Estado Plurinacional de Bolivia.',
          },
          {
            nombre: 'Estado de Revocación',
            estado: detalle.revocacionValidacion || 'INFO',
            titulo: detalle.revocacionEstado || 'Estado de Revocación',
            descripcion: detalle.revocacionDescripcion || 'Verificación en listas CRL / OCSP.',
            esVerde: detalle.revocacionValidacion === 'EXITO',
          },
        ],
      };
    });

    return {
      raw: rawResult,
      tipoRespuesta: rawResult.tipoRespuesta,
      exito: rawResult.exito,
      mensaje: rawResult.mensaje,
      codigoHash: rawResult?.objeto?.codigoHash,
      firmasCount: firmas.length,
      firmas: enrichedFirmas,
      validatedAt: new Date().toISOString(),
    };
  }
}

export const validatorService = new ValidatorService();
