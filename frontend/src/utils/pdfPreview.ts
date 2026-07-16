import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfWorkerReady = false;

const PDF_WORKER_SRC =
  import.meta.env.VITE_PDF_WORKER_SRC ||
  pdfWorkerUrl;

const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfWorkerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    pdfWorkerReady = true;
  }
  return pdfjs;
};

export const renderPdfFirstPageToCanvas = async (source: File | string, targetWidth = 1500) => {
  const pdfjs = await loadPdfJs();
  const input = typeof source === 'string'
    ? { url: source }
    : { data: new Uint8Array(await source.arrayBuffer()) };
  const document = await pdfjs.getDocument(input).promise;
  const page = await document.getPage(1);
  const original = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / original.width });
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create PDF preview.');

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
};

export const createPdfFirstPagePreviewFile = async (source: File | string, sourceName = 'test-result.pdf') => {
  const canvas = await renderPdfFirstPageToCanvas(source);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((output) => output ? resolve(output) : reject(new Error('Unable to create PDF preview.')), 'image/png');
  });
  const fileName = source instanceof File ? source.name : sourceName;
  const name = fileName.replace(/\.pdf$/i, '') || 'test-result';
  return new File([blob], `${name}-preview.png`, { type: 'image/png' });
};
