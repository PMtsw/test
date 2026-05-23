const STORAGE_KEY = "supplier-list-items";

const addSupplierBtn = document.getElementById("add-supplier-btn");
const statusFilterEl = document.getElementById("status-filter");
const keywordFilterEl = document.getElementById("keyword-filter");
const supplierTbody = document.getElementById("supplier-tbody");
const tableStatsEl = document.getElementById("table-stats");

const supplierDialog = document.getElementById("supplier-dialog");
const supplierDialogTitle = document.getElementById("supplier-dialog-title");
const supplierForm = document.getElementById("supplier-form");
const supplierIdEl = document.getElementById("supplier-id");
const supplierNameEl = document.getElementById("supplier-name");
const contactNameEl = document.getElementById("contact-name");
const contactPhoneEl = document.getElementById("contact-phone");
const contactEmailEl = document.getElementById("contact-email");
const categoryEl = document.getElementById("category");
const noteEl = document.getElementById("note");

const reviewDialog = document.getElementById("review-dialog");
const reviewForm = document.getElementById("review-form");
const reviewIdEl = document.getElementById("review-id");
const reviewSummaryEl = document.getElementById("review-summary");
const reviewResultEl = document.getElementById("review-result");
const reviewReasonEl = document.getElementById("review-reason");

let suppliers = loadSuppliers();
if (suppliers.length === 0) {
  suppliers = createInitialSuppliers();
  saveSuppliers();
}

renderTable();

addSupplierBtn.addEventListener("click", () => {
  openSupplierDialog("create");
});

statusFilterEl.addEventListener("change", renderTable);
keywordFilterEl.addEventListener("input", renderTable);

supplierForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = readSupplierForm();

  if (!payload.name || !payload.contactName || !payload.contactPhone || !payload.category) {
    alert("请完整填写必填项。");
    return;
  }

  const editingId = supplierIdEl.value;
  if (editingId) {
    suppliers = suppliers.map((item) =>
      item.id === editingId
        ? {
            ...item,
            ...payload,
            updatedAt: Date.now(),
          }
        : item
    );
  } else {
    suppliers.unshift({
      id: crypto.randomUUID(),
      ...payload,
      status: "pending",
      reviewReason: "",
      reviewedBy: "",
      reviewedAt: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  saveSuppliers();
  renderTable();
  closeDialog(supplierDialog);
});

reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const reviewId = reviewIdEl.value;
  const result = reviewResultEl.value;
  const reason = reviewReasonEl.value.trim();

  if (result === "rejected" && !reason) {
    alert("驳回时必须填写驳回原因。");
    return;
  }

  suppliers = suppliers.map((item) =>
    item.id === reviewId
      ? {
          ...item,
          status: result,
          reviewReason: result === "rejected" ? reason : "",
          reviewedBy: "审核员A",
          reviewedAt: new Date().toISOString(),
          updatedAt: Date.now(),
        }
      : item
  );

  saveSuppliers();
  renderTable();
  closeDialog(reviewDialog);
});

reviewResultEl.addEventListener("change", () => {
  reviewReasonEl.required = reviewResultEl.value === "rejected";
});

document.querySelectorAll("[data-close='supplier']").forEach((btn) => {
  btn.addEventListener("click", () => closeDialog(supplierDialog));
});

document.querySelectorAll("[data-close='review']").forEach((btn) => {
  btn.addEventListener("click", () => closeDialog(reviewDialog));
});

function renderTable() {
  const visible = getVisibleSuppliers();
  supplierTbody.innerHTML = "";

  if (visible.length === 0) {
    supplierTbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">暂无匹配的供应商记录</td></tr>';
  } else {
    visible.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.contactName)}</td>
        <td>${escapeHtml(item.contactPhone)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${renderStatusTag(item.status)}</td>
        <td>${formatDateTime(item.updatedAt)}</td>
        <td>
          <div class="row-actions">
            <button class="action-btn" data-action="edit" data-id="${item.id}" type="button">编辑</button>
            <button class="action-btn" data-action="review" data-id="${item.id}" type="button">审核</button>
            <button class="action-btn danger" data-action="delete" data-id="${item.id}" type="button">删除</button>
          </div>
        </td>
      `;
      supplierTbody.appendChild(tr);
    });
  }

  supplierTbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === "edit") {
        openSupplierDialog("edit", id);
      } else if (action === "review") {
        openReviewDialog(id);
      } else if (action === "delete") {
        deleteSupplier(id);
      }
    });
  });

  const counts = {
    total: suppliers.length,
    pending: suppliers.filter((item) => item.status === "pending").length,
    approved: suppliers.filter((item) => item.status === "approved").length,
    rejected: suppliers.filter((item) => item.status === "rejected").length,
  };
  tableStatsEl.textContent = `总数 ${counts.total} 条；待审核 ${counts.pending} 条；已通过 ${counts.approved} 条；已驳回 ${counts.rejected} 条`;
}

function getVisibleSuppliers() {
  const status = statusFilterEl.value;
  const keyword = keywordFilterEl.value.trim().toLowerCase();

  return suppliers.filter((item) => {
    const statusMatched = status === "all" || item.status === status;
    const keywordMatched =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.contactName.toLowerCase().includes(keyword);
    return statusMatched && keywordMatched;
  });
}

function openSupplierDialog(mode, id = "") {
  supplierForm.reset();
  supplierIdEl.value = "";
  supplierDialogTitle.textContent = mode === "create" ? "新增供应商" : "编辑供应商";

  if (mode === "edit" && id) {
    const item = suppliers.find((supplier) => supplier.id === id);
    if (!item) return;
    supplierIdEl.value = item.id;
    supplierNameEl.value = item.name;
    contactNameEl.value = item.contactName;
    contactPhoneEl.value = item.contactPhone;
    contactEmailEl.value = item.contactEmail || "";
    categoryEl.value = item.category;
    noteEl.value = item.note || "";
  }

  openDialog(supplierDialog);
}

function openReviewDialog(id) {
  const item = suppliers.find((supplier) => supplier.id === id);
  if (!item) return;

  reviewForm.reset();
  reviewIdEl.value = id;
  reviewResultEl.value = item.status === "rejected" ? "rejected" : "approved";
  reviewReasonEl.required = reviewResultEl.value === "rejected";
  reviewReasonEl.value = item.reviewReason || "";
  reviewSummaryEl.textContent = `${item.name} ｜ 联系人：${item.contactName} ｜ 当前状态：${statusText(
    item.status
  )}`;

  openDialog(reviewDialog);
}

function deleteSupplier(id) {
  const item = suppliers.find((supplier) => supplier.id === id);
  if (!item) return;
  const ok = confirm(`确定删除供应商“${item.name}”吗？`);
  if (!ok) return;

  suppliers = suppliers.filter((supplier) => supplier.id !== id);
  saveSuppliers();
  renderTable();
}

function readSupplierForm() {
  return {
    name: supplierNameEl.value.trim(),
    contactName: contactNameEl.value.trim(),
    contactPhone: contactPhoneEl.value.trim(),
    contactEmail: contactEmailEl.value.trim(),
    category: categoryEl.value.trim(),
    note: noteEl.value.trim(),
  };
}

function renderStatusTag(status) {
  return `<span class="status-tag status-${status}">${statusText(status)}</span>`;
}

function statusText(status) {
  if (status === "pending") return "待审核";
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  return "未知";
}

function formatDateTime(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function saveSuppliers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

function loadSuppliers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        name: String(item.name || ""),
        contactName: String(item.contactName || ""),
        contactPhone: String(item.contactPhone || ""),
        contactEmail: String(item.contactEmail || ""),
        category: String(item.category || ""),
        note: String(item.note || ""),
        status: normalizeStatus(item.status),
        reviewReason: String(item.reviewReason || ""),
        reviewedBy: String(item.reviewedBy || ""),
        reviewedAt: item.reviewedAt ? String(item.reviewedAt) : "",
        createdAt: Number(item.createdAt || Date.now()),
        updatedAt: Number(item.updatedAt || Date.now()),
      }));
  } catch {
    return [];
  }
}

function normalizeStatus(status) {
  if (status === "approved" || status === "rejected" || status === "pending") {
    return status;
  }
  return "pending";
}

function createInitialSuppliers() {
  return [
    {
      id: crypto.randomUUID(),
      name: "华星电子供应链",
      contactName: "王丽",
      contactPhone: "13800000001",
      contactEmail: "wangli@huaxing.com",
      category: "电子元器件",
      note: "支持月结，交期稳定",
      status: "pending",
      reviewReason: "",
      reviewedBy: "",
      reviewedAt: "",
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: crypto.randomUUID(),
      name: "远航包装材料",
      contactName: "李强",
      contactPhone: "13900000002",
      contactEmail: "liqiang@yuanhang.com",
      category: "包装耗材",
      note: "可定制印刷",
      status: "approved",
      reviewReason: "",
      reviewedBy: "审核员A",
      reviewedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now() - 3600000 * 10,
    },
    {
      id: crypto.randomUUID(),
      name: "北辰物流服务",
      contactName: "赵敏",
      contactPhone: "13700000003",
      contactEmail: "zhaomin@beichen.com",
      category: "仓配物流",
      note: "",
      status: "rejected",
      reviewReason: "资质文件不完整",
      reviewedBy: "审核员A",
      reviewedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdAt: Date.now() - 86400000 * 12,
      updatedAt: Date.now() - 3600000 * 24,
    },
  ];
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "true");
  }
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}
