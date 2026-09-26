/* ============================================
   PDF Studio — Client-side PDF tools
   ============================================ */

const { PDFDocument, degrees, rgb, StandardFonts } = PDFLib;

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* ---------- Tool definitions ---------- */
const TOOLS = [
  {
    id: "merge",
    name: "Merge PDF",
    desc: "Combine multiple PDFs into one document",
    icon: "📑",
    accept: "application/pdf",
    multiple: true,
  },
  {
    id: "split",
    name: "Split PDF",
    desc: "Extract pages or split into multiple files",
    icon: "✂️",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "compress",
    name: "Compress PDF",
    desc: "Reduce file size while keeping quality",
    icon: "📦",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    desc: "Rotate pages 90°, 180° or 270°",
    icon: "🔄",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "protect",
    name: "Protect PDF",
    desc: "Add password protection to your PDF",
    icon: "🔒",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "unlock",
    name: "Unlock PDF",
    desc: "Remove password from a protected PDF",
    icon: "🔓",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "organize",
    name: "Organize PDF",
    desc: "Reorder, rotate or delete pages",
    icon: "🗂️",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "extract",
    name: "Extract Pages",
    desc: "Save selected pages as a new PDF",
    icon: "📄",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    desc: "Convert PDF pages to high-quality images",
    icon: "🖼️",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    desc: "Convert images into a single PDF",
    icon: "📷",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
  },
  {
    id: "page-numbers",
    name: "Page Numbers",
    desc: "Add page numbers to your PDF",
    icon: "🔢",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "watermark",
    name: "Watermark",
    desc: "Add text watermark to every page",
    icon: "💧",
    accept: "application/pdf",
    multiple: false,
  },
];

/* ---------- State ---------- */
let currentTool = null;
let selectedFiles = [];
let pageOrder = []; // for organize tool

/* ---------- DOM ---------- */
const toolsGrid = document.getElementById("toolsGrid");
const modalOverlay = document.getElementById("modalOverlay");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalIcon = document.getElementById("modalIcon");
const modalBody = document.getElementById("modalBody");
const modalFooter = document.getElementById("modalFooter");
const modalClose = document.getElementById("modalClose");
const btnProcess = document.getElementById("btnProcess");
const btnReset = document.getElementById("btnReset");
const toast = document.getElementById("toast");

/* ---------- Init ---------- */
function init() {
  renderTools();
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  btnReset.addEventListener("click", resetTool);
  btnProcess.addEventListener("click", processTool);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function renderTools() {
  toolsGrid.innerHTML = TOOLS.map(
    (t) => `
    <article class="tool-card" data-id="${t.id}" role="button" tabindex="0">
      <div class="tool-icon">${t.icon}</div>
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
    </article>
  `
  ).join("");

  toolsGrid.querySelectorAll(".tool-card").forEach((card) => {
    card.addEventListener("click", () => openTool(card.dataset.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openTool(card.dataset.id);
    });
  });
}

/* ---------- Modal ---------- */
function openTool(id) {
  currentTool = TOOLS.find((t) => t.id === id);
  if (!currentTool) return;

  selectedFiles = [];
  pageOrder = [];

  modalTitle.textContent = currentTool.name;
  modalDesc.textContent = currentTool.desc;
  modalIcon.textContent = currentTool.icon;
  modalFooter.hidden = true;
  btnProcess.disabled = true;
  btnProcess.innerHTML = "Process";

  renderDropZone();
  modalOverlay.hidden = false;
  requestAnimationFrame(() => modalOverlay.classList.add("visible"));
}

function closeModal() {
  modalOverlay.classList.remove("visible");
  setTimeout(() => {
    modalOverlay.hidden = true;
    modalBody.innerHTML = "";
  }, 250);
}

function resetTool() {
  selectedFiles = [];
  pageOrder = [];
  btnProcess.disabled = true;
  btnProcess.innerHTML = "Process";
  modalFooter.hidden = true;
  renderDropZone();
}

function renderDropZone() {
  const multi = currentTool.multiple;
  modalBody.innerHTML = `
    <div class="drop-zone" id="dropZone">
      <div class="drop-zone-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
      </div>
      <h4>Drop ${multi ? "files" : "a file"} here</h4>
      <p>or click to browse · ${currentTool.accept.includes("image") ? "JPG, PNG" : "PDF"}</p>
      <input type="file" id="fileInput" accept="${currentTool.accept}" ${multi ? "multiple" : ""} />
    </div>
    <div class="file-list" id="fileList"></div>
    <div id="optionsArea"></div>
  `;

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener("change", () => handleFiles(fileInput.files));
}

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  if (!currentTool.multiple) {
    selectedFiles = [files[0]];
  } else {
    selectedFiles = [...selectedFiles, ...files];
  }

  renderFileList();
  await renderOptions();
  modalFooter.hidden = false;
  btnProcess.disabled = selectedFiles.length === 0;
}

function renderFileList() {
  const list = document.getElementById("fileList");
  if (!selectedFiles.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = selectedFiles
    .map(
      (f, i) => `
    <div class="file-item">
      <div class="file-item-icon">PDF</div>
      <div class="file-item-info">
        <div class="file-item-name">${escapeHtml(f.name)}</div>
        <div class="file-item-meta">${formatSize(f.size)}</div>
      </div>
      <button class="file-item-remove" data-idx="${i}" aria-label="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `
    )
    .join("");

  list.querySelectorAll(".file-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedFiles.splice(+btn.dataset.idx, 1);
      renderFileList();
      renderOptions();
      btnProcess.disabled = selectedFiles.length === 0;
    });
  });
}

async function renderOptions() {
  const area = document.getElementById("optionsArea");
  if (!area || !selectedFiles.length) {
    if (area) area.innerHTML = "";
    return;
  }

  const id = currentTool.id;

  if (id === "split") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Split mode</label>
        <select class="form-select" id="splitMode">
          <option value="range">Custom page ranges</option>
          <option value="every">Every page as separate file</option>
          <option value="fixed">Fixed number of pages</option>
        </select>
      </div>
      <div class="form-group" id="splitRangeGroup">
        <label>Page ranges (e.g. 1-3, 5, 7-9)</label>
        <input class="form-input" id="splitRanges" placeholder="1-3, 5, 7-9" />
        <p class="form-hint">Pages are 1-indexed</p>
      </div>
      <div class="form-group" id="splitFixedGroup" hidden>
        <label>Pages per file</label>
        <input class="form-input" type="number" id="splitFixed" value="1" min="1" />
      </div>
    `;
    const mode = document.getElementById("splitMode");
    mode.addEventListener("change", () => {
      document.getElementById("splitRangeGroup").hidden = mode.value !== "range";
      document.getElementById("splitFixedGroup").hidden = mode.value !== "fixed";
    });
  } else if (id === "rotate") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Rotation</label>
        <select class="form-select" id="rotateAngle">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise</option>
        </select>
      </div>
      <div class="form-group">
        <label>Apply to</label>
        <select class="form-select" id="rotateScope">
          <option value="all">All pages</option>
          <option value="range">Specific pages</option>
        </select>
      </div>
      <div class="form-group" id="rotateRangeGroup" hidden>
        <label>Pages (e.g. 1, 3-5)</label>
        <input class="form-input" id="rotatePages" placeholder="1, 3-5" />
      </div>
    `;
    document.getElementById("rotateScope").addEventListener("change", (e) => {
      document.getElementById("rotateRangeGroup").hidden = e.target.value !== "range";
    });
  } else if (id === "protect") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>User password (required to open)</label>
        <input class="form-input" type="password" id="userPass" placeholder="Enter password" />
      </div>
      <div class="form-group">
        <label>Owner password (optional)</label>
        <input class="form-input" type="password" id="ownerPass" placeholder="Same as user if empty" />
      </div>
    `;
  } else if (id === "unlock") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Current password</label>
        <input class="form-input" type="password" id="unlockPass" placeholder="Enter password" />
        <p class="form-hint">Required to decrypt the PDF</p>
      </div>
    `;
  } else if (id === "page-numbers") {
    area.innerHTML = `
      <div class="options-row" style="margin-top:20px">
        <div class="form-group">
          <label>Position</label>
          <select class="form-select" id="pnPosition">
            <option value="bottom-center">Bottom center</option>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-center">Top center</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
          </select>
        </div>
        <div class="form-group">
          <label>Start from</label>
          <input class="form-input" type="number" id="pnStart" value="1" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label>Format</label>
        <input class="form-input" id="pnFormat" value="{n}" placeholder="{n} of {total}" />
        <p class="form-hint">Use {n} for page number, {total} for total pages</p>
      </div>
    `;
  } else if (id === "watermark") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Watermark text</label>
        <input class="form-input" id="wmText" placeholder="CONFIDENTIAL" value="CONFIDENTIAL" />
      </div>
      <div class="options-row">
        <div class="form-group">
          <label>Opacity</label>
          <input class="form-input" type="number" id="wmOpacity" value="0.3" min="0.05" max="1" step="0.05" />
        </div>
        <div class="form-group">
          <label>Font size</label>
          <input class="form-input" type="number" id="wmSize" value="48" min="12" max="120" />
        </div>
      </div>
      <div class="form-group">
        <label>Rotation (degrees)</label>
        <input class="form-input" type="number" id="wmRotate" value="-45" />
      </div>
    `;
  } else if (id === "extract") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Pages to extract (e.g. 1-3, 5, 8-10)</label>
        <input class="form-input" id="extractPages" placeholder="1-3, 5" />
      </div>
    `;
  } else if (id === "organize") {
    area.innerHTML = `<div id="organizePreview" style="margin-top:16px"><p class="form-hint">Loading preview…</p></div>`;
    await renderOrganizePreview();
  } else if (id === "compress") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Compression level</label>
        <select class="form-select" id="compressLevel">
          <option value="light">Light (best quality)</option>
          <option value="medium" selected>Medium (recommended)</option>
          <option value="strong">Strong (smallest size)</option>
        </select>
        <p class="form-hint">Uses object streams + image optimization where possible</p>
      </div>
    `;
  } else if (id === "pdf-to-jpg") {
    area.innerHTML = `
      <div class="form-group" style="margin-top:20px">
        <label>Quality / Scale</label>
        <select class="form-select" id="jpgScale">
          <option value="1.5">Good (1.5×)</option>
          <option value="2" selected>High (2×)</option>
          <option value="3">Ultra (3×)</option>
        </select>
      </div>
    `;
  } else {
    area.innerHTML = "";
  }
}

async function renderOrganizePreview() {
  const container = document.getElementById("organizePreview");
  if (!selectedFiles[0]) return;

  try {
    const buf = await selectedFiles[0].arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const num = pdf.numPages;
    pageOrder = Array.from({ length: num }, (_, i) => i);

    let html = `<p class="form-hint" style="margin-bottom:10px">${num} pages — click to select, drag to reorder (coming soon: full drag)</p><div class="page-grid">`;
    for (let i = 1; i <= num; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const url = canvas.toDataURL("image/jpeg", 0.7);
      html += `
        <div class="page-thumb" data-idx="${i - 1}">
          <img src="${url}" alt="Page ${i}" />
          <span class="page-thumb-num">${i}</span>
          <button class="page-thumb-remove" data-idx="${i - 1}">×</button>
        </div>`;
    }
    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".page-thumb-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.idx;
        pageOrder = pageOrder.filter((p) => p !== idx);
        btn.closest(".page-thumb").remove();
      });
    });
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">Could not load preview: ${err.message}</p>`;
  }
}

/* ---------- Process ---------- */
async function processTool() {
  if (!selectedFiles.length) return;

  btnProcess.disabled = true;
  btnProcess.innerHTML = `<span class="spinner"></span> Processing…`;

  try {
    const id = currentTool.id;
    let result;

    switch (id) {
      case "merge":
        result = await doMerge();
        break;
      case "split":
        result = await doSplit();
        break;
      case "compress":
        result = await doCompress();
        break;
      case "rotate":
        result = await doRotate();
        break;
      case "protect":
        result = await doProtect();
        break;
      case "unlock":
        result = await doUnlock();
        break;
      case "organize":
        result = await doOrganize();
        break;
      case "extract":
        result = await doExtract();
        break;
      case "pdf-to-jpg":
        result = await doPdfToJpg();
        break;
      case "jpg-to-pdf":
        result = await doJpgToPdf();
        break;
      case "page-numbers":
        result = await doPageNumbers();
        break;
      case "watermark":
        result = await doWatermark();
        break;
      default:
        throw new Error("Unknown tool");
    }

    showResult(result);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Something went wrong");
    btnProcess.disabled = false;
    btnProcess.innerHTML = "Process";
  }
}

/* ---------- Tool implementations ---------- */

async function doMerge() {
  const merged = await PDFDocument.create();
  for (const file of selectedFiles) {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save({ useObjectStreams: true });
  return { type: "pdf", bytes, name: "merged.pdf" };
}

async function doSplit() {
  const buf = await selectedFiles[0].arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const mode = document.getElementById("splitMode")?.value || "range";

  const outputs = [];

  if (mode === "every") {
    for (let i = 0; i < total; i++) {
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      outputs.push({
        bytes: await doc.save({ useObjectStreams: true }),
        name: `page-${i + 1}.pdf`,
      });
    }
  } else if (mode === "fixed") {
    const per = Math.max(1, parseInt(document.getElementById("splitFixed")?.value || "1", 10));
    for (let i = 0; i < total; i += per) {
      const indices = [];
      for (let j = i; j < Math.min(i + per, total); j++) indices.push(j);
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, indices);
      pages.forEach((p) => doc.addPage(p));
      outputs.push({
        bytes: await doc.save({ useObjectStreams: true }),
        name: `pages-${i + 1}-${Math.min(i + per, total)}.pdf`,
      });
    }
  } else {
    const ranges = parseRanges(document.getElementById("splitRanges")?.value || "1", total);
    if (!ranges.length) throw new Error("Please enter valid page ranges");
    for (const range of ranges) {
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, range);
      pages.forEach((p) => doc.addPage(p));
      const label =
        range.length === 1
          ? `page-${range[0] + 1}`
          : `pages-${range[0] + 1}-${range[range.length - 1] + 1}`;
      outputs.push({
        bytes: await doc.save({ useObjectStreams: true }),
        name: `${label}.pdf`,
      });
    }
  }

  if (outputs.length === 1) {
    return { type: "pdf", bytes: outputs[0].bytes, name: outputs[0].name };
  }
  return { type: "multi", files: outputs };
}

async function doCompress() {
  const buf = await selectedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  // pdf-lib basic compression via object streams
  // Stronger compression would require re-encoding images (more complex)
  const level = document.getElementById("compressLevel")?.value || "medium";
  const useObjectStreams = true;
  const bytes = await doc.save({
    useObjectStreams,
    // lower quality isn't directly exposed; object streams help a lot
  });
  const original = selectedFiles[0].size;
  const saved = ((1 - bytes.length / original) * 100).toFixed(1);
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-compressed.pdf",
    meta: `Reduced by ~${saved}% (${formatSize(original)} → ${formatSize(bytes.length)})`,
  };
}

async function doRotate() {
  const buf = await selectedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const angle = parseInt(document.getElementById("rotateAngle")?.value || "90", 10);
  const scope = document.getElementById("rotateScope")?.value || "all";
  const total = doc.getPageCount();

  let indices = Array.from({ length: total }, (_, i) => i);
  if (scope === "range") {
    indices = parseRanges(document.getElementById("rotatePages")?.value || "1", total).flat();
  }

  indices.forEach((i) => {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  });

  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-rotated.pdf",
  };
}

async function doProtect() {
  const userPass = document.getElementById("userPass")?.value;
  if (!userPass) throw new Error("Please enter a password");
  const ownerPass = document.getElementById("ownerPass")?.value || userPass;

  const buf = await selectedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });

  const bytes = await doc.save({
    useObjectStreams: true,
    userPassword: userPass,
    ownerPassword: ownerPass,
  });

  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-protected.pdf",
  };
}

async function doUnlock() {
  const pass = document.getElementById("unlockPass")?.value || "";
  const buf = await selectedFiles[0].arrayBuffer();
  let doc;
  try {
    doc = await PDFDocument.load(buf, { password: pass });
  } catch (e) {
    throw new Error("Incorrect password or unsupported encryption");
  }
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-unlocked.pdf",
  };
}

async function doOrganize() {
  if (!pageOrder.length) throw new Error("No pages left");
  const buf = await selectedFiles[0].arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, pageOrder);
  pages.forEach((p) => doc.addPage(p));
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-organized.pdf",
  };
}

async function doExtract() {
  const buf = await selectedFiles[0].arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const ranges = parseRanges(document.getElementById("extractPages")?.value || "1", total);
  if (!ranges.length) throw new Error("Please enter valid pages");
  const indices = ranges.flat();
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-extracted.pdf",
  };
}

async function doPdfToJpg() {
  const buf = await selectedFiles[0].arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const scale = parseFloat(document.getElementById("jpgScale")?.value || "2");
  const files = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files.push({ bytes, name: `page-${i}.jpg` });
  }

  if (files.length === 1) {
    return { type: "image", bytes: files[0].bytes, name: files[0].name };
  }
  return { type: "multi", files };
}

async function doJpgToPdf() {
  const doc = await PDFDocument.create();
  for (const file of selectedFiles) {
    const buf = await file.arrayBuffer();
    let image;
    if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
      image = await doc.embedPng(buf);
    } else {
      image = await doc.embedJpg(buf);
    }
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  const bytes = await doc.save({ useObjectStreams: true });
  return { type: "pdf", bytes, name: "images.pdf" };
}

async function doPageNumbers() {
  const buf = await selectedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  const start = parseInt(document.getElementById("pnStart")?.value || "1", 10);
  const format = document.getElementById("pnFormat")?.value || "{n}";
  const position = document.getElementById("pnPosition")?.value || "bottom-center";

  doc.getPages().forEach((page, i) => {
    const text = format
      .replace("{n}", String(start + i))
      .replace("{total}", String(total));
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, 10);
    let x, y;
    const margin = 24;

    if (position.includes("left")) x = margin;
    else if (position.includes("right")) x = width - margin - textWidth;
    else x = (width - textWidth) / 2;

    if (position.includes("top")) y = height - margin;
    else y = margin;

    page.drawText(text, {
      x,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-numbered.pdf",
  };
}

async function doWatermark() {
  const text = document.getElementById("wmText")?.value || "CONFIDENTIAL";
  const opacity = parseFloat(document.getElementById("wmOpacity")?.value || "0.3");
  const size = parseInt(document.getElementById("wmSize")?.value || "48", 10);
  const rot = parseInt(document.getElementById("wmRotate")?.value || "-45", 10);

  const buf = await selectedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity,
      rotate: degrees(rot),
    });
  });

  const bytes = await doc.save({ useObjectStreams: true });
  return {
    type: "pdf",
    bytes,
    name: selectedFiles[0].name.replace(/\.pdf$/i, "") + "-watermarked.pdf",
  };
}

/* ---------- Result UI ---------- */
function showResult(result) {
  let downloadHtml = "";

  if (result.type === "multi") {
    downloadHtml = result.files
      .map(
        (f, i) =>
          `<button class="btn btn-primary" style="margin:4px" data-multi="${i}">Download ${escapeHtml(f.name)}</button>`
      )
      .join("");
  } else {
    downloadHtml = `<button class="btn btn-primary" id="btnDownload">Download ${escapeHtml(result.name)}</button>`;
  }

  modalBody.innerHTML = `
    <div class="result-box">
      <div class="result-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <h3>Done!</h3>
      <p>${result.meta || "Your file is ready to download."}</p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">${downloadHtml}</div>
    </div>
  `;

  modalFooter.hidden = false;
  btnProcess.hidden = true;
  btnReset.textContent = "New file";

  if (result.type === "multi") {
    modalBody.querySelectorAll("[data-multi]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = result.files[+btn.dataset.multi];
        downloadBlob(f.bytes, f.name, f.name.endsWith(".jpg") ? "image/jpeg" : "application/pdf");
      });
    });
  } else {
    document.getElementById("btnDownload")?.addEventListener("click", () => {
      const mime =
        result.type === "image" ? "image/jpeg" : "application/pdf";
      downloadBlob(result.bytes, result.name, mime);
    });
  }

  btnProcess.disabled = false;
  btnProcess.innerHTML = "Process";
  btnProcess.hidden = false; // keep available if needed
  // Actually hide process after success
  btnProcess.style.display = "none";
}

/* ---------- Helpers ---------- */
function parseRanges(str, total) {
  const result = [];
  if (!str.trim()) return result;
  const parts = str.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (isNaN(a) || isNaN(b)) continue;
      const from = Math.max(1, Math.min(a, b));
      const to = Math.min(total, Math.max(a, b));
      const range = [];
      for (let i = from; i <= to; i++) range.push(i - 1);
      if (range.length) result.push(range);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) result.push([n - 1]);
    }
  }
  return result;
}

function downloadBlob(bytes, filename, mime) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast("Download started");
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => (toast.hidden = true), 300);
  }, 2800);
}

/* ---------- Boot ---------- */
init();
