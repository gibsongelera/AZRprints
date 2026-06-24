/**
 * Detect page count from uploaded print files (client-side).
 */
(function (global) {
  var PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  function ext(file) {
    var name = file.name || '';
    var dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function readArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function countPdf(file) {
    if (!global.pdfjsLib) return Promise.reject(new Error('PDF.js not loaded'));
    global.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    return readArrayBuffer(file).then(function (data) {
      return global.pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
        return pdf.numPages;
      });
    });
  }

  function countDocx(file) {
    if (!global.JSZip) return Promise.reject(new Error('JSZip not loaded'));
    return readArrayBuffer(file).then(function (data) {
      return global.JSZip.loadAsync(data).then(function (zip) {
        var entry = zip.file('word/document.xml');
        if (!entry) return 1;
        return entry.async('string').then(function (xml) {
          var pageBreaks = (xml.match(/<w:br[^>]*w:type="page"/g) || []).length;
          var rendered = (xml.match(/<w:lastRenderedPageBreak/g) || []).length;
          return Math.max(1, pageBreaks + rendered + 1);
        });
      });
    });
  }

  function detect(file) {
    var type = ext(file);
    if (type === 'pdf') {
      return countPdf(file).then(function (pages) {
        return { pages: pages, method: 'detected', label: 'detected from PDF' };
      });
    }
    if (type === 'docx') {
      return countDocx(file).then(function (pages) {
        return { pages: pages, method: 'estimated', label: 'estimated from DOCX breaks' };
      });
    }
    if (/^(jpe?g|png|gif|webp|bmp)$/.test(type)) {
      return Promise.resolve({ pages: 1, method: 'detected', label: '1 image page' });
    }
    if (type === 'doc') {
      var est = Math.max(1, Math.round(file.size / 3000));
      return Promise.resolve({ pages: est, method: 'estimated', label: 'estimated from file size' });
    }
    return Promise.resolve({ pages: 1, method: 'default', label: 'default' });
  }

  global.PrintPortPageCount = { detect: detect, ext: ext };
})(window);
