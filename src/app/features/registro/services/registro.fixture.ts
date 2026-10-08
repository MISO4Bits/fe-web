import { RegistrationRequest } from '../models/registro.model';
export const request: RegistrationRequest = {
  identity: {
    firstName: 'Martín',
    lastName: 'Flores',
    documentType: 'CC',
    documentNumber: '123456789',
    birthDate: '1985-08-02',
  },
  email: 'martin@example.com',
  phone: '3001234567',
  password: 'ClaveDemo123',
  consents: {
    terms: true,
    personalData: true,
    financialData: false,
    version: 'V1',
    personalVersion: 'V2',
    financialVersion: 'V3',
  },
  reference: { creditBalance: 320000000, currency: 'COP' },
};
