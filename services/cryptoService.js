import { execSync } from 'child_process';
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

// OpenSSL executable path on Windows (Git for Windows includes OpenSSL 3.5)
const DEFAULT_OPENSSL_PATH = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';

export class CryptoService {
  constructor(opensslPath = DEFAULT_OPENSSL_PATH) {
    this.opensslPath = opensslPath;
    this.isOpenSslAvailable = this.checkOpenSslAvailability();
  }

  checkOpenSslAvailability() {
    try {
      if (fs.existsSync(this.opensslPath)) {
        return true;
      }
      execSync('openssl version', { stdio: 'ignore' });
      this.opensslPath = 'openssl';
      return true;
    } catch {
      return false;
    }
  }

  getSystemInfo() {
    let opensslVersion = 'No detectado';
    if (this.isOpenSslAvailable) {
      try {
        opensslVersion = execSync(`"${this.opensslPath}" version`).toString().trim();
      } catch {
        opensslVersion = 'Error al leer versión de OpenSSL';
      }
    }
    return {
      isOpenSslAvailable: this.isOpenSslAvailable,
      opensslPath: this.opensslPath,
      opensslVersion,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Generate keypair, certificate and PKCS#12 bundle
   * Supports OpenSSL CLI and native node-forge engine
   */
  async generateKeyPair(options = {}) {
    const {
      name = 'USUARIO DE PRUEBA',
      ci = '1234567 LP',
      organization = 'ENTIDAD PUBLICA / PRIVADA',
      unit = 'TECNOLOGIA DE LA INFORMACION',
      position = 'RESPONSABLE TECNICO',
      email = 'firmante@dominio.bo',
      city = 'La Paz',
      country = 'BO',
      passphrase = 'Password123!',
      keySize = 2048,
      validityDays = 365,
      method = 'openssl', // 'openssl' or 'forge'
    } = options;

    if (method === 'openssl' && this.isOpenSslAvailable) {
      return this.generateWithOpenSsl({
        name,
        ci,
        organization,
        unit,
        position,
        email,
        city,
        country,
        passphrase,
        keySize,
        validityDays,
      });
    } else {
      return this.generateWithForge({
        name,
        ci,
        organization,
        unit,
        position,
        email,
        city,
        country,
        passphrase,
        keySize,
        validityDays,
      });
    }
  }

  /**
   * Generates keys using OpenSSL CLI commands
   */
  generateWithOpenSsl(params) {
    const tmpDir = path.join(process.cwd(), 'uploads', `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const keyPath = path.join(tmpDir, 'private.key');
    const pubPath = path.join(tmpDir, 'public.pub');
    const certPath = path.join(tmpDir, 'cert.crt');
    const commandsLog = [];

    try {
      // 1. Generate RSA Private Key
      const genKeyCmd = `"${this.opensslPath}" genpkey -algorithm RSA -out "${keyPath}" -pkeyopt rsa_keygen_bits:${params.keySize}`;
      commandsLog.push({ cmd: genKeyCmd, step: '1. Generación de Llave Privada RSA' });
      const genKeyOut = execSync(genKeyCmd).toString();
      if (genKeyOut) commandsLog[commandsLog.length - 1].output = genKeyOut;

      // 2. Extract Public Key in PEM format
      const pubCmd = `"${this.opensslPath}" rsa -pubout -in "${keyPath}" -out "${pubPath}"`;
      commandsLog.push({ cmd: pubCmd, step: '2. Extracción de Llave Pública RSA (PEM)' });
      const pubOut = execSync(pubCmd).toString();
      if (pubOut) commandsLog[commandsLog.length - 1].output = pubOut;

      // 3. Format Subject for Bolivian X.509 standard
      // Normalize accents to avoid Windows CLI codepage/ASN.1 byte corruption
      const cleanSubj = (str) =>
        (str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[\\/]/g, ' ')
          .trim();

      const subj = `/C=${cleanSubj(params.country)}/ST=${cleanSubj(params.city)}/L=${cleanSubj(params.city)}/O=${cleanSubj(params.organization)}/OU=${cleanSubj(params.unit)}/CN=${cleanSubj(params.name)}/title=${cleanSubj(params.position)}/emailAddress=${cleanSubj(params.email)}/serialNumber=${cleanSubj(params.ci)}`;

      // 4. Create OpenSSL configuration with official Bolivian CRL and OCSP extensions
      const cnfPath = path.join(tmpDir, 'openssl.cnf');
      const cnfContent = `
[ req ]
default_bits        = ${params.keySize || 2048}
distinguished_name  = req_distinguished_name
x509_extensions     = v3_ca
string_mask         = utf8only

[ req_distinguished_name ]

[ v3_ca ]
basicConstraints        = CA:FALSE
keyUsage                = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage        = clientAuth, emailProtection
subjectKeyIdentifier    = hash
authorityKeyIdentifier  = keyid:always,issuer
crlDistributionPoints   = URI:http://firmadigital.bo/firmadigital_bo2.crl
authorityInfoAccess     = OCSP;URI:http://firmadigital.bo/ocsp2/
`;
      fs.writeFileSync(cnfPath, cnfContent, 'utf8');

      // 5. Generate Self-Signed X.509 Certificate with OpenSSL (-utf8 flag and config with CRL/OCSP)
      const reqCmd = `"${this.opensslPath}" req -new -x509 -utf8 -config "${cnfPath}" -key "${keyPath}" -out "${certPath}" -days ${params.validityDays} -subj "${subj}"`;
      commandsLog.push({ cmd: reqCmd, step: '3. Generación de Certificado Digital X.509 con CRL y OCSP' });
      const reqOut = execSync(reqCmd).toString();
      if (reqOut) commandsLog[commandsLog.length - 1].output = reqOut;

      // Read generated files
      const privateKeyPem = fs.readFileSync(keyPath, 'utf8');
      const publicKeyPem = fs.readFileSync(pubPath, 'utf8');
      let certPem = fs.readFileSync(certPath, 'utf8');

      // Adjust notBefore to 1 day earlier so it is immediately valid across all timezone offsets
      try {
        const forgePriv = forge.pki.privateKeyFromPem(privateKeyPem);
        const forgeCert = forge.pki.certificateFromPem(certPem);
        forgeCert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
        forgeCert.validity.notAfter = new Date(Date.now() + params.validityDays * 24 * 60 * 60 * 1000);
        forgeCert.sign(forgePriv, forge.md.sha256.create());
        certPem = forge.pki.certificateToPem(forgeCert);
      } catch (err) {
        console.warn('Advertencia ajustando validez de certificado:', err.message);
      }

      // Package to PKCS#12 using forge (guarantees cross-platform PAdES signer compatibility without legacy.dll issues)
      const p12Buffer = this.buildP12FromPems(privateKeyPem, certPem, params.passphrase);
      commandsLog.push({
        cmd: `node-forge pkcs12 -export [with passphrase]`,
        step: '4. Empaquetado en contenedor PKCS#12 (.p12 / .pfx)',
        output: 'Keystore PKCS#12 generado exitosamente con cifrado seguro.',
      });

      // Parse metadata
      const certDetails = this.parseCertificate(certPem);

      return {
        privateKeyPem,
        publicKeyPem,
        certPem,
        p12Buffer,
        p12Base64: p12Buffer.toString('base64'),
        fingerprintSha256: certDetails.fingerprintSha256,
        fingerprintSha1: certDetails.fingerprintSha1,
        serialNumber: certDetails.serialNumber,
        validity: certDetails.validity,
        subject: certDetails.subject,
        commandsLog,
        method: 'openssl',
      };
    } finally {
      // Clean temporary directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Generates keys using native node-forge engine
   */
  generateWithForge(params) {
    const commandsLog = [];
    commandsLog.push({
      cmd: `forge.pki.rsa.generateKeyPair(${params.keySize})`,
      step: '1. Generación de Par de Llaves Criptográficas RSA (Nativo)',
    });

    const keypair = forge.pki.rsa.generateKeyPair(params.keySize);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

    commandsLog.push({
      cmd: `forge.pki.createCertificate()`,
      step: '2. Creación y Estructuración de Certificado X.509',
    });

    const cert = forge.pki.createCertificate();
    cert.publicKey = keypair.publicKey;
    cert.serialNumber = '01' + Date.now().toString(16).toUpperCase();

    // Set notBefore to yesterday so it is immediately valid in any timezone
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expireDate = new Date(Date.now() + params.validityDays * 24 * 60 * 60 * 1000);
    cert.validity.notBefore = yesterday;
    cert.validity.notAfter = expireDate;

    // Attributes for Bolivia digital signature metadata
    const attrs = [
      { name: 'commonName', value: params.name },
      { name: 'countryName', value: params.country || 'BO' },
      { shortName: 'ST', value: params.city || 'La Paz' },
      { name: 'localityName', value: params.city || 'La Paz' },
      { name: 'organizationName', value: params.organization },
      { shortName: 'OU', value: params.unit },
      { name: 'title', value: params.position },
      { name: 'emailAddress', value: params.email },
      { name: 'serialNumber', value: params.ci }, // Identificador de C.I. / NIT
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      {
        name: 'keyUsage',
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        clientAuth: true,
        emailProtection: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    commandsLog.push({
      cmd: `cert.sign(privateKey, sha256)`,
      step: '3. Firma Digital del Certificado con SHA-256',
    });

    cert.sign(keypair.privateKey, forge.md.sha256.create());
    const certPem = forge.pki.certificateToPem(cert);

    commandsLog.push({
      cmd: `forge.pkcs12.toPkcs12Asn1(privateKey, [cert], passphrase)`,
      step: '4. Generación de Keystore PKCS#12 (.p12 / .pfx)',
    });

    const p12Buffer = this.buildP12FromPems(privateKeyPem, certPem, params.passphrase);
    const certDetails = this.parseCertificate(certPem);

    return {
      privateKeyPem,
      publicKeyPem,
      certPem,
      p12Buffer,
      p12Base64: p12Buffer.toString('base64'),
      fingerprintSha256: certDetails.fingerprintSha256,
      fingerprintSha1: certDetails.fingerprintSha1,
      serialNumber: certDetails.serialNumber,
      validity: certDetails.validity,
      subject: certDetails.subject,
      commandsLog,
      method: 'forge',
    };
  }

  buildP12FromPems(privateKeyPem, certPem, passphrase) {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const cert = forge.pki.certificateFromPem(certPem);
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], passphrase, {
      generateLocalKeyId: true,
      friendlyName: cert.subject.getField('CN')?.value || 'Certificado Firma Digital',
    });
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    return Buffer.from(p12Der, 'binary');
  }

  parseCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();

      // Fingerprints
      const mdSha256 = forge.md.sha256.create();
      mdSha256.update(der);
      const fingerprintSha256 = mdSha256.digest().toHex().match(/.{2}/g).join(':').toUpperCase();

      const mdSha1 = forge.md.sha1.create();
      mdSha1.update(der);
      const fingerprintSha1 = mdSha1.digest().toHex().match(/.{2}/g).join(':').toUpperCase();

      const getVal = (name) => cert.subject.getField(name)?.value || '';

      return {
        serialNumber: cert.serialNumber,
        validity: {
          notBefore: cert.validity.notBefore.toISOString(),
          notAfter: cert.validity.notAfter.toISOString(),
          isActive: new Date() >= cert.validity.notBefore && new Date() <= cert.validity.notAfter,
        },
        subject: {
          commonName: getVal('CN'),
          organization: getVal('O'),
          organizationalUnit: getVal('OU'),
          country: getVal('C'),
          locality: getVal('L'),
          state: getVal('ST'),
          emailAddress: getVal('emailAddress'),
          title: getVal('title'),
          serialNumber: getVal('serialNumber'),
        },
        issuer: {
          commonName: cert.issuer.getField('CN')?.value || '',
          organization: cert.issuer.getField('O')?.value || '',
        },
        fingerprintSha256,
        fingerprintSha1,
      };
    } catch (e) {
      return {
        serialNumber: 'Desconocido',
        validity: { notBefore: '', notAfter: '', isActive: false },
        subject: {},
        issuer: {},
        fingerprintSha256: '',
        fingerprintSha1: '',
        error: e.message,
      };
    }
  }
}

export const cryptoService = new CryptoService();
