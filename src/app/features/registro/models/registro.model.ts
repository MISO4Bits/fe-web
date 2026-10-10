export interface RegistrationRequest {
  identity: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    birthDate: string;
  };
  email: string;
  phone: string;
  password: string;
  consents: {
    terms: boolean;
    personalData: boolean;
    financialData: boolean;
    version: string;
    personalVersion: string;
    financialVersion: string;
  };
}

export interface RegistrationResponse {
  customerId: string;
  status: 'ACTIVE';
  emailConfirmed: boolean;
  email: string;
  financialConsent: boolean;
}

export type RegistrationErrorCode =
  | 'EMAIL_EXISTS'
  | 'DOCUMENT_EXISTS'
  | 'DISPOSABLE_EMAIL'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'VALIDATION'
  | 'SESSION_REQUIRED'
  | 'UNAVAILABLE';

export class RegistrationError extends Error {
  constructor(public readonly code: RegistrationErrorCode) {
    super(code);
  }
}
