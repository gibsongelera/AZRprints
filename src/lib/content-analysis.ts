"use client";

import JSZip from "jszip";
import { detectPageCount } from "./page-count";

export type ContentAnalysis = {
  totalPages: number;
  documentPages: number;
  photoPages: number;
  isMixed: boolean;
  method: string;
  label: string;
};

function ext(file: File): string {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function analyzePdf(file: File): Promise<ContentAnalysis> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const OPS = pdfjs.OPS;
  let documentPages = 0;
  let photoPages = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    let hasLargeImage = false;
    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintXObject
      ) {
        hasLargeImage = true;
        break;
      }
    }
    if (hasLargeImage) photoPages += 1;
    else documentPages += 1;
  }

  const totalPages = pdf.numPages;
  if (documentPages === 0 && photoPages === 0) {
    documentPages = totalPages;
  }

  const isMixed = documentPages > 0 && photoPages > 0;
  return {
    totalPages,
    documentPages,
    photoPages,
    isMixed,
    method: "detected",
    label: isMixed
      ? `mixed: ${documentPages} text + ${photoPages} photo page(s)`
      : photoPages > 0
        ? `${photoPages} photo page(s)`
        : `${documentPages} document page(s)`,
  };
}

async function analyzeDocx(file: File): Promise<ContentAnalysis> {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const mediaFiles = Object.keys(zip.files).filter((p) =>
    /^word\/media\//i.test(p)
  );
  const entry = zip.file("word/document.xml");
  let documentPages = 1;
  if (entry) {
    const xml = await entry.async("string");
    const pageBreaks = (xml.match(/<w:br[^>]*w:type="page"/g) || []).length;
    const rendered = (xml.match(/<w:lastRenderedPageBreak/g) || []).length;
    documentPages = Math.max(1, pageBreaks + rendered + 1);
  }
  const embeddedImages = mediaFiles.length;
  const photoPages = embeddedImages > 0 ? Math.min(embeddedImages, documentPages) : 0;
  const docOnly = Math.max(0, documentPages - photoPages);
  const isMixed = docOnly > 0 && photoPages > 0;
  const totalPages = Math.max(documentPages, docOnly + photoPages);

  return {
    totalPages,
    documentPages: docOnly || (photoPages ? 0 : documentPages),
    photoPages: photoPages || (ext(file).match(/^(jpe?g|png|gif|webp)$/) ? 1 : 0),
    isMixed,
    method: embeddedImages ? "estimated" : "estimated",
    label: isMixed
      ? `mixed: ~${docOnly} text + ${photoPages} embedded image(s)`
      : photoPages
        ? `${photoPages} embedded image(s)`
        : `~${documentPages} document page(s)`,
  };
}

export async function analyzeUploadContent(file: File): Promise<ContentAnalysis> {
  const type = ext(file);
  if (type === "pdf") return analyzePdf(file);
  if (type === "docx") return analyzeDocx(file);
  if (/^(jpe?g|png|gif|webp|bmp)$/.test(type)) {
    return {
      totalPages: 1,
      documentPages: 0,
      photoPages: 1,
      isMixed: false,
      method: "detected",
      label: "1 image page",
    };
  }

  const fallback = await detectPageCount(file);
  const pages = fallback.pages;
  return {
    totalPages: pages,
    documentPages: pages,
    photoPages: 0,
    isMixed: false,
    method: fallback.method,
    label: fallback.label,
  };
}
