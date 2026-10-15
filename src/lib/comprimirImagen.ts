// Redimensiona a máx. 1600 px y exporta JPEG 82 % antes de subir: el plan gratis de Storage es 1 GB.
const MAX_DIM = 1600;
const QUALITY = 0.82;

export async function comprimirImagen(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("No se pudo comprimir la imagen");
  return blob;
}
