import { InjectionToken } from '@angular/core';

let initialCode: string | null = null;

export function captureVerificationCode(): string | null {
  if (window.location.pathname !== '/verificar-correo') return null;
  const url = new URL(window.location.href);
  const codes = url.searchParams.getAll('oobCode');
  const code = codes.length === 1 ? codes[0] : null;
  if (codes.length) {
    url.searchParams.delete('oobCode');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  return code;
}

export function prepareVerificationCode() {
  initialCode = captureVerificationCode();
}

export const VERIFICATION_CODE = new InjectionToken<() => string | null>('VERIFICATION_CODE', {
  providedIn: 'root',
  factory: () => () => {
    const code = initialCode ?? captureVerificationCode();
    initialCode = null;
    return code;
  },
});
