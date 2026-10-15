import fs from 'fs';
import path from 'path';
import { cryptoService } from './cryptoService.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const KEYS_DIR = path.join(DATA_DIR, 'keys');

export class UserStore {
  constructor() {
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  async initDefaultUsersIfNeeded() {
    const users = this.getUsers();
    if (users.length === 0) {
      console.log('Inicializando usuarios y pares de llaves por defecto...');
      const sampleProfiles = [
        {
          name: 'Ing. Carlos Mendoza Alarcon',
          ci: '4928192 LP',
          organization: 'AGENCIA DE GOBIERNO ELECTRONICO (AGETIC)',
          unit: 'DIRECCION DE TECNOLOGIAS E INFRAESTRUCTURA',
          position: 'DIRECTOR DE TECNOLOGIAS',
          email: 'cmendoza@agetic.gob.bo',
          city: 'La Paz',
          country: 'BO',
          passphrase: 'FirmaDigital2026!',
          keySize: 2048,
          validityDays: 365,
          method: cryptoService.isOpenSslAvailable ? 'openssl' : 'forge',
        },
        {
          name: 'Dra. Patricia Flores Mamani',
          ci: '6183920 SC',
          organization: 'UNIVERSIDAD MAYOR DE SAN ANDRES (UMSA)',
          unit: 'CARRERA DE INFORMATICA',
          position: 'INVESTIGADORA Y DOCENTE TITULAR',
          email: 'pflores@umsa.bo',
          city: 'La Paz',
          country: 'BO',
          passphrase: 'UmsaSegura2026!',
          keySize: 2048,
          validityDays: 365,
          method: 'forge',
        },
        {
          name: 'Lic. Roberto Choque Gutierrez',
          ci: '5392014 CB',
          organization: 'CONTRALORIA GENERAL DEL ESTADO',
          unit: 'SUBGERENCIA DE AUDITORIA DE SISTEMAS',
          position: 'AUDITOR GUBERNAMENTAL',
          email: 'rchoque@contraloria.gob.bo',
          city: 'Cochabamba',
          country: 'BO',
          passphrase: 'AuditoriaBolivia2026!',
          keySize: 2048,
          validityDays: 365,
          method: 'forge',
        },
      ];

      for (const profile of sampleProfiles) {
        try {
          await this.createUser(profile);
        } catch (err) {
          console.error(`Error al crear usuario de prueba ${profile.name}:`, err.message);
        }
      }
      console.log('Usuarios de prueba inicializados correctamente.');
    }
  }

  getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  getUserById(id) {
    const users = this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async createUser(userData) {
    this.ensureDirectories();

    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const userDir = path.join(KEYS_DIR, id);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    // Generate keys using requested method
    const keyBundle = await cryptoService.generateKeyPair({
      name: userData.name,
      ci: userData.ci,
      organization: userData.organization,
      unit: userData.unit,
      position: userData.position,
      email: userData.email,
      city: userData.city,
      country: userData.country || 'BO',
      passphrase: userData.passphrase || '123456',
      keySize: userData.keySize ? parseInt(userData.keySize, 10) : 2048,
      validityDays: userData.validityDays ? parseInt(userData.validityDays, 10) : 365,
      method: userData.method || (cryptoService.isOpenSslAvailable ? 'openssl' : 'forge'),
    });

    // Write files to user directory
    fs.writeFileSync(path.join(userDir, 'private.key'), keyBundle.privateKeyPem, 'utf8');
    fs.writeFileSync(path.join(userDir, 'public.pub'), keyBundle.publicKeyPem, 'utf8');
    fs.writeFileSync(path.join(userDir, 'certificate.crt'), keyBundle.certPem, 'utf8');
    fs.writeFileSync(path.join(userDir, 'keystore.p12'), keyBundle.p12Buffer);

    const userRecord = {
      id,
      name: userData.name,
      ci: userData.ci,
      organization: userData.organization,
      unit: userData.unit,
      position: userData.position,
      email: userData.email,
      city: userData.city || 'La Paz',
      country: userData.country || 'BO',
      passphrase: userData.passphrase || '123456',
      keySize: userData.keySize || 2048,
      validityDays: userData.validityDays || 365,
      method: keyBundle.method,
      serialNumber: keyBundle.serialNumber,
      fingerprintSha256: keyBundle.fingerprintSha256,
      fingerprintSha1: keyBundle.fingerprintSha1,
      validity: keyBundle.validity,
      createdAt: new Date().toISOString(),
      keyFiles: {
        privateKey: path.join(userDir, 'private.key'),
        publicKey: path.join(userDir, 'public.pub'),
        certificate: path.join(userDir, 'certificate.crt'),
        keystore: path.join(userDir, 'keystore.p12'),
      },
    };

    const users = this.getUsers();
    users.push(userRecord);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

    return {
      user: userRecord,
      keyBundle,
    };
  }

  deleteUser(id) {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    users.splice(index, 1);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

    const userDir = path.join(KEYS_DIR, id);
    if (fs.existsSync(userDir)) {
      try {
        fs.rmSync(userDir, { recursive: true, force: true });
      } catch {}
    }
    return true;
  }

  getUserKeyBuffers(id) {
    const user = this.getUserById(id);
    if (!user) return null;
    const userDir = path.join(KEYS_DIR, id);

    return {
      user,
      privateKeyPem: fs.readFileSync(path.join(userDir, 'private.key'), 'utf8'),
      publicKeyPem: fs.readFileSync(path.join(userDir, 'public.pub'), 'utf8'),
      certPem: fs.readFileSync(path.join(userDir, 'certificate.crt'), 'utf8'),
      p12Buffer: fs.readFileSync(path.join(userDir, 'keystore.p12')),
    };
  }
}

export const userStore = new UserStore();
