// DTO del contrato OpenAPI BFF Web — Onboarding 0.1.0.
export interface BffRegistroRequest {
  email: string;
  password: string;
  tipoDocumento: 'CC' | 'CE' | 'PA';
  numeroDocumento: string;
  primerNombre: string;
  primerApellido: string;
  fechaNacimiento: string;
  telefono: string;
  politicaVersion: string;
  aceptaTerminos: boolean;
  autorizaTratamientoDatos: boolean;
  politicaVersionTratamientoDatos: string | null;
  autorizaDatosFinancieros: boolean;
  politicaVersionDatosFinancieros: string | null;
}
export interface BffCuenta {
  clienteId: string;
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  email: string;
  telefono?: string | null;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
  correoConfirmado?: boolean;
}
export interface BffSesion {
  accessToken: string;
  tokenType?: 'Bearer';
  expiresIn: number;
  refreshToken: string;
}
export interface BffRegistroResponse {
  cuenta: BffCuenta;
  sesion: BffSesion;
}
export interface BffDisponibilidad {
  correoDisponible?: boolean | null;
  documentoDisponible?: boolean | null;
}
