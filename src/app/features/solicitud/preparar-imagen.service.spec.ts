import { PrepararImagenService } from './preparar-imagen.service';

describe('PrepararImagenService', () => {
  const servicio = new PrepararImagenService();

  it('reduce una imagen grande y la recodifica sin conservar su archivo original', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1200;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    const entrada = new File([blob!], 'cedula.png', { type: 'image/png' });
    const resultado = await servicio.preparar(entrada);
    const bitmap = await createImageBitmap(resultado);
    expect(bitmap.width).toBe(1600);
    expect(bitmap.height).toBe(800);
    expect(resultado.type).toBe('image/jpeg');
    expect(resultado.size).toBeLessThan(1_500_000);
    expect(resultado.name).toBe('foto.jpg');
    bitmap.close();
  });

  it('rechaza archivos que simulan ser una imagen y formatos no admitidos', async () => {
    await expectAsync(
      servicio.preparar(new File(['pdf'], 'doc.pdf', { type: 'application/pdf' })),
    ).toBeRejectedWithError('Selecciona una foto JPG o PNG.');
    await expectAsync(
      servicio.preparar(new File(['invalido'], 'foto.jpg', { type: 'image/jpeg' })),
    ).toBeRejectedWithError('Selecciona una foto JPG o PNG válida.');
  });
});
