import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrepararImagenService {
  async preparar(archivo: File): Promise<File> {
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      throw new Error('Selecciona una foto JPG o PNG.');
    }
    const firma = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
    const jpg = firma[0] === 255 && firma[1] === 216 && firma[2] === 255;
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => firma[i] === b);
    if (!jpg && !png) throw new Error('Selecciona una foto JPG o PNG válida.');
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      throw new Error('No pudimos leer la foto. Selecciona otra imagen JPG o PNG.');
    }
    try {
      const canvas = document.createElement('canvas');
      const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('No pudimos preparar la foto en este navegador.');
      contexto.fillStyle = '#fff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // Recodificar elimina EXIF y otros metadatos; la orientación ya está aplicada.
      for (const calidad of [0.9, 0.8, 0.65, 0.5, 0.35]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', calidad),
        );
        if (blob && blob.size < 1_500_000) {
          return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
        }
      }
      throw new Error('La foto es demasiado grande. Prueba con otra imagen.');
    } finally {
      bitmap.close();
    }
  }
}
