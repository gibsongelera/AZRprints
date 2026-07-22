"use client";

import JSZip from "jszip";

function ext(file: File): string {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function countPdf(file: File): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  return pdf.numPages;
}

async function countDocx(file: File): Promise<number> {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const entry = zip.file("word/document.xml");
  if (!entry) return 1;
  const xml = await entry.async("string");
  const pageBreaks = (xml.match(/<w:br[^>]*w:type="page"/g) || []).length;
  const rendered = (xml.match(/<w:lastRenderedPageBreak/g) || []).length;
  return Math.max(1, pageBreaks + rendered + 1);
}

export type PageCountResult = {
  pages: number;
  method: string;
  label: string;
};

export async function detectPageCount(file: File): Promise<PageCountResult> {
  const type = ext(file);
  if (type === "pdf") {
    const pages = await countPdf(file);
    return { pages, method: "detected", label: "detected from PDF" };
  }
  if (type === "docx") {
    const pages = await countDocx(file);
    return { pages, method: "estimated", label: "estimated from DOCX breaks" };
  }
  if (/^(jpe?g|png|gif|webp|bmp)$/.test(type)) {
    return { pages: 1, method: "detected", label: "1 image page" };
  }
  if (type === "doc") {
    const pages = Math.max(1, Math.round(file.size / 3000));
    return { pages, method: "estimated", label: "estimated from file size" };
  }
  return { pages: 1, method: "default", label: "default" };
}
