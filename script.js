/**
 * AXÔ Business - Completo c/ Mapas, QR Code, Assinatura e WhatsApp
 */

let appData = {
  objetos: [],
  historico: [],
  usuarios: [],
  ultimoBackup: null,
  theme: "light",
};
let currentUser = null;
let currentImageB64 = null;
let dashChart = null;
let leafletMap = null;
let marker = null;
let signaturePad = null;
let ctxSignature = null;
let isDrawing = false;
let qrCodeScanner = null;

document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  garantirAdminPadrao();
  aplicarTemaAtual();
  verificarSessao();
  configurarNavegacao();
  configurarFiltros();

  document.getElementById("obj-data").max = new Date()
    .toISOString()
    .split("T")[0];
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-profile")) {
      const drop = document.getElementById("user-dropdown");
      if (drop) drop.classList.add("hidden");
    }
  });

  setupSignaturePad();
});

// ================= UTILITÁRIOS E TOASTS =================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
        ? "fa-circle-xmark"
        : "fa-info-circle";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ================= AUTENTICAÇÃO E PERMISSÕES =================
function garantirAdminPadrao() {
  if (appData.usuarios.length === 0) {
    appData.usuarios.push({
      id: "usr_" + Date.now(),
      nome: "Administrador",
      cpf: "",
      telefone: "",
      email: "admin@axo.com",
      senha: "admin",
      role: "admin",
    });
    salvarDadosSilencioso();
  }
}

function verificarSessao() {
  const session = sessionStorage.getItem("axo_session");
  if (session) {
    currentUser = JSON.parse(session);
    iniciarApp();
  } else {
    mostrarLogin();
  }
}

function realizarLogin(e) {
  e.preventDefault();
  const emailStr = document.getElementById("login-email").value;
  const senhaStr = document.getElementById("login-senha").value;
  const u = appData.usuarios.find(
    (u) => u.email === emailStr && u.senha === senhaStr,
  );

  if (u) {
    currentUser = u;
    sessionStorage.setItem("axo_session", JSON.stringify(currentUser));
    showToast(`Bem-vindo, ${u.nome}!`, "success");
    iniciarApp();
  } else {
    showToast("E-mail ou senha incorretos.", "error");
  }
}

function realizarLogout() {
  currentUser = null;
  sessionStorage.removeItem("axo_session");
  document.getElementById("login-form").reset();
  showToast("Sessão encerrada.", "info");
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

function iniciarApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");

  document.getElementById("display-user-name").innerText =
    currentUser.nome.split(" ")[0];
  document.getElementById("dropdown-name").innerText = currentUser.nome;
  document.getElementById("dropdown-role").innerText =
    currentUser.role === "admin" ? "Administrador" : "Funcionário";

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = currentUser.role === "admin" ? "" : "none";
  });

  renderDashboard();
  renderObjetos();
  renderHistorico();

  if (currentUser.role === "admin") {
    renderUsuarios();
  }

  atualizarTextoUltimoBackup();
  document.querySelector('.nav-item[data-target="view-dashboard"]').click();
}

// ================= DADOS E PERSISTÊNCIA =================
function carregarDados() {
  const s = localStorage.getItem("axo_data");
  if (s) {
    try {
      appData = JSON.parse(s);
    } catch (e) {
      console.error("Falha ao carregar");
    }
  }
  if (!appData.objetos) appData.objetos = [];
  if (!appData.historico) appData.historico = [];
  if (!appData.usuarios) appData.usuarios = [];
}

function salvarDados() {
  appData.ultimoBackup = new Date().getTime();
  localStorage.setItem("axo_data", JSON.stringify(appData));
  atualizarTextoUltimoBackup();
  salvarAutoBackup();
}

function salvarDadosSilencioso() {
  localStorage.setItem("axo_data", JSON.stringify(appData));
  salvarAutoBackup();
}

function salvarAutoBackup() {
  localStorage.setItem("axo_data_autobackup", JSON.stringify(appData));
}

function atualizarTextoUltimoBackup() {
  const el = document.getElementById("last-backup-text");
  if (appData.ultimoBackup && el) {
    el.innerText = `Último salvamento: ${new Date(appData.ultimoBackup).toLocaleString("pt-BR")}`;
  }
}

// ================= NAVEGAÇÃO E TEMAS =================
function configurarNavegacao() {
  document.querySelectorAll(".nav-item[data-target]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Remove active classes
      document
        .querySelectorAll(".nav-item")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".view-section")
        .forEach((sec) => sec.classList.add("hidden"));

      // Add active class to clicked
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      document.getElementById(targetId).classList.remove("hidden");

      // Update Page Title
      const pt = document.getElementById("current-page-title");
      if (pt) pt.innerText = btn.getAttribute("data-title");

      // Trigger specific renders
      if (targetId === "view-dashboard") renderDashboard();
      if (targetId === "view-historico") renderHistorico();
      if (targetId === "view-usuarios" && currentUser.role === "admin")
        renderUsuarios();

      // Close mobile menu
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("mobile-open");
      }
    });
  });

  document.getElementById("theme-btn").addEventListener("click", () => {
    appData.theme = appData.theme === "light" ? "dark" : "light";
    aplicarTemaAtual();
    salvarDadosSilencioso();
    renderDashboard();
  });

  document.getElementById("toggle-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
    setTimeout(() => {
      if (dashChart) dashChart.resize();
    }, 300);
  });

  document.getElementById("mobile-menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-open");
  });
}

function aplicarTemaAtual() {
  document.documentElement.setAttribute("data-theme", appData.theme);
  const icon = document.querySelector("#theme-btn i");
  if (icon)
    icon.className =
      appData.theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
  if (id === "modal-form") {
    document.getElementById("objeto-form").reset();
    removerFoto();
  }
  if (id === "modal-user-form") {
    document.getElementById("usuario-form").reset();
  }
}

// ================= MAPAS (LEAFLET) =================
function initMap() {
  if (!leafletMap) {
    leafletMap = L.map("map-container").setView([-3.7319, -38.5267], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(leafletMap);
    marker = L.marker([-3.7319, -38.5267], { draggable: true }).addTo(
      leafletMap,
    );

    leafletMap.on("click", function (e) {
      updateMarker(e.latlng.lat, e.latlng.lng);
    });
    marker.on("dragend", function (e) {
      const pos = marker.getLatLng();
      updateMarker(pos.lat, pos.lng);
    });
  }
  setTimeout(() => leafletMap.invalidateSize(), 300);
}

function updateMarker(lat, lng) {
  if (marker) {
    marker.setLatLng([lat, lng]);
    leafletMap.panTo([lat, lng]);
  }
  document.getElementById("obj-lat").value = lat;
  document.getElementById("obj-lng").value = lng;
}

// ================= FOTOS E QR CODE =================
function processarImagem(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 400;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      currentImageB64 = canvas.toDataURL("image/jpeg", 0.7);
      document.getElementById("preview-img").src = currentImageB64;
      document.getElementById("photo-preview").classList.remove("hidden");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removerFoto() {
  currentImageB64 = null;
  document.getElementById("obj-foto").value = "";
  document.getElementById("photo-preview").classList.add("hidden");
}

function gerarEtiquetaQR(id, nome) {
  const container = document.getElementById("qrcode-display");
  container.innerHTML = "";
  new QRCode(container, {
    text: id,
    width: 200,
    height: 200,
    colorDark: "#643698",
    colorLight: "#ffffff",
  });
  document.getElementById("qrcode-obj-name").innerText = nome;
  openModal("modal-qrcode");
}

// ================= LEITOR DE QR CODE =================
function abrirLeitorQR() {
  openModal("modal-leitor");
  qrCodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false,
  );
  qrCodeScanner.render(onScanSuccess, onScanFailure);
}

function fecharLeitorQR() {
  if (qrCodeScanner) {
    qrCodeScanner.clear();
  }
  closeModal("modal-leitor");
}

function onScanSuccess(decodedText) {
  fecharLeitorQR();
  showToast("QR Code Lido!", "success");
  document.querySelector('.nav-item[data-target="view-objetos"]').click();
  document.getElementById("filter-search").value = decodedText;
  renderObjetos();
}

function onScanFailure(error) {
  /* Ignore */
}

// ================= ASSINATURA E PDF =================
function setupSignaturePad() {
  signaturePad = document.getElementById("signature-pad");
  ctxSignature = signaturePad.getContext("2d");

  const startDraw = (e) => {
    isDrawing = true;
    draw(e);
  };
  const stopDraw = () => {
    isDrawing = false;
    ctxSignature.beginPath();
  };
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = signaturePad.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctxSignature.lineWidth = 3;
    ctxSignature.lineCap = "round";
    ctxSignature.strokeStyle = "#000";
    ctxSignature.lineTo(clientX - rect.left, clientY - rect.top);
    ctxSignature.stroke();
    ctxSignature.beginPath();
    ctxSignature.moveTo(clientX - rect.left, clientY - rect.top);
  };

  signaturePad.addEventListener("mousedown", startDraw);
  signaturePad.addEventListener("mousemove", draw);
  signaturePad.addEventListener("mouseup", stopDraw);
  signaturePad.addEventListener("mouseout", stopDraw);
  signaturePad.addEventListener("touchstart", startDraw, { passive: false });
  signaturePad.addEventListener("touchmove", draw, { passive: false });
  signaturePad.addEventListener("touchend", stopDraw);
}

function limparAssinatura() {
  ctxSignature.clearRect(0, 0, signaturePad.width, signaturePad.height);
}

function abrirAssinatura(id) {
  document.getElementById("signature-obj-id").value = id;
  limparAssinatura();
  openModal("modal-assinatura");
}

function confirmarAssinaturaEPDF() {
  const id = document.getElementById("signature-obj-id").value;
  const signatureBase64 = signaturePad.toDataURL("image/png");

  const blank = document.createElement("canvas");
  blank.width = signaturePad.width;
  blank.height = signaturePad.height;
  if (signatureBase64 === blank.toDataURL()) {
    showToast("Por favor, assine o quadro.", "error");
    return;
  }

  closeModal("modal-assinatura");
  gerarTermoPDF(id, signatureBase64);
}

function gerarTermoPDF(id, signatureB64) {
  const obj = appData.objetos.find((o) => o.id === id);
  if (!obj) return;
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(100, 54, 152);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("AXÔ Business", 105, 20, null, null, "center");
    doc.setFontSize(14);
    doc.text("Termo Probatório de Entrega", 105, 30, null, null, "center");

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    let y = 60;
    doc.text(
      `O presente termo documenta a entrega formal do objeto abaixo descrito,`,
      20,
      y,
    );
    y += 10;
    doc.text(`previamente cadastrado no sistema AXÔ Business.`, 20, y);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Objeto:", 20, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.text(`ID do Registro: ${obj.id}`, 20, y);
    y += 10;
    doc.text(`Objeto: ${obj.nome}`, 20, y);
    y += 10;
    doc.text(`Local de Origem: ${obj.local}`, 20, y);
    y += 10;
    doc.text(`Data do Registro: ${formatarData(obj.data)}`, 20, y);

    if (obj.dono) {
      y += 10;
      doc.text(`Reivindicado por: ${obj.dono}`, 20, y);
    }

    y += 10;
    const descLines = doc.splitTextToSize(
      `Descrição: ${obj.desc || "Nenhuma"}`,
      170,
    );
    doc.text(descLines, 20, y);
    y += descLines.length * 10 + 15;

    doc.text(
      "Declaro para os devidos fins ter recebido o objeto acima descrito.",
      20,
      y,
    );

    y += 20;
    doc.addImage(signatureB64, "PNG", 120, y, 60, 30);
    y += 30;
    doc.line(30, y, 90, y);
    doc.line(120, y, 180, y);
    y += 5;
    doc.setFontSize(10);
    doc.text(`Entregue por: ${currentUser.nome}`, 60, y, null, null, "center");
    doc.text("Assinatura do Recebedor", 150, y, null, null, "center");

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Gerado eletronicamente: ${new Date().toLocaleString("pt-BR")}`,
      105,
      280,
      null,
      null,
      "center",
    );
    doc.save(`Termo_AXO_${obj.nome.replace(/\s+/g, "_")}.pdf`);
    showToast("PDF e Assinatura salvos com sucesso!", "success");
    registrarHistorico("backup", `Gerou PDF Assinado do Objeto: ${obj.nome}`);
  } catch (err) {
    showToast("Erro ao gerar PDF.", "error");
  }
}

// ================= DASHBOARD & OBJETOS =================
function renderDashboard() {
  document.getElementById("stat-total").innerText = appData.objetos.length;
  document.getElementById("stat-aguardando").innerText = appData.objetos.filter(
    (o) => o.status === "Aguardando",
  ).length;
  document.getElementById("stat-entregues").innerText = appData.objetos.filter(
    (o) => o.status === "Entregue",
  ).length;

  const datasMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datasMap[d.toISOString().split("T")[0]] = 0;
  }
  appData.objetos.forEach((obj) => {
    if (datasMap[obj.data] !== undefined) datasMap[obj.data]++;
  });

  if (dashChart) dashChart.destroy();
  const isDark = appData.theme === "dark";
  dashChart = new Chart(
    document.getElementById("objetosChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: Object.keys(datasMap).map(formatarData),
        datasets: [
          {
            label: "Cadastros",
            data: Object.values(datasMap),
            borderColor: "#643698",
            backgroundColor: "rgba(100, 54, 152, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: isDark ? "#fff" : "#333" } } },
        scales: {
          y: { ticks: { color: isDark ? "#fff" : "#333", stepSize: 1 } },
          x: { ticks: { color: isDark ? "#fff" : "#333" } },
        },
      },
    },
  );
}

function openFormModal(id = null) {
  const formTitle = document.getElementById("modal-form-title");
  removerFoto();
  if (id) {
    formTitle.innerText = "Editar Objeto";
    const obj = appData.objetos.find((o) => o.id === id);
    if (obj) {
      document.getElementById("obj-id").value = obj.id;
      document.getElementById("obj-nome").value = obj.nome;
      document.getElementById("obj-local").value = obj.local;
      document.getElementById("obj-data").value = obj.data;
      document.getElementById("obj-status").value = obj.status;
      document.getElementById("obj-desc").value = obj.desc;
      document.getElementById("obj-dono").value = obj.dono || "";
      document.getElementById("obj-telefone").value = obj.donoTel || "";
      if (obj.foto) {
        currentImageB64 = obj.foto;
        document.getElementById("preview-img").src = currentImageB64;
        document.getElementById("photo-preview").classList.remove("hidden");
      }
      openModal("modal-form");
      initMap();
      if (obj.lat && obj.lng) updateMarker(obj.lat, obj.lng);
    }
  } else {
    formTitle.innerText = "Novo Objeto";
    document.getElementById("obj-data").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("obj-id").value = "";
    document.getElementById("obj-lat").value = "";
    document.getElementById("obj-lng").value = "";
    openModal("modal-form");
    initMap();
    updateMarker(-3.7319, -38.5267);
  }
}

function salvarObjeto(e) {
  e.preventDefault();
  const idInput = document.getElementById("obj-id").value;
  const nome = document.getElementById("obj-nome").value.trim();
  const local = document.getElementById("obj-local").value.trim();
  const data = document.getElementById("obj-data").value;
  const status = document.getElementById("obj-status").value;
  const desc = document.getElementById("obj-desc").value.trim();
  const dono = document.getElementById("obj-dono").value.trim();
  const donoTel = document.getElementById("obj-telefone").value.trim();
  const lat = document.getElementById("obj-lat").value;
  const lng = document.getElementById("obj-lng").value;

  if (!nome || !data || !local) return;

  if (idInput !== "") {
    const index = appData.objetos.findIndex((o) => o.id === idInput);
    if (index !== -1) {
      appData.objetos[index] = {
        id: idInput,
        nome,
        local,
        data,
        status,
        desc,
        dono,
        donoTel,
        lat,
        lng,
        foto: currentImageB64,
      };
      registrarHistorico("edicao", nome);
      showToast("Objeto atualizado!");
    }
  } else {
    appData.objetos.unshift({
      id: "obj_" + new Date().getTime(),
      nome,
      local,
      data,
      status,
      desc,
      dono,
      donoTel,
      lat,
      lng,
      foto: currentImageB64,
    });
    registrarHistorico("criacao", nome);
    showToast("Objeto cadastrado!");
  }
  salvarDados();
  renderObjetos();
  renderDashboard();
  closeModal("modal-form");
}

function renderObjetos() {
  const container = document.getElementById("objetos-container");
  if (!container) return;
  const search =
    document.getElementById("filter-search")?.value.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "todos";
  const filtrados = appData.objetos.filter((obj) => {
    if (
      !(
        obj.nome.toLowerCase().includes(search) ||
        obj.desc.toLowerCase().includes(search) ||
        obj.id.toLowerCase().includes(search)
      )
    )
      return false;
    if (status !== "todos" && obj.status !== status) return false;
    return true;
  });

  container.innerHTML = "";
  if (filtrados.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><h2>Nenhum objeto encontrado</h2></div>`;
    return;
  }

  filtrados.forEach((obj) => {
    let badgeVencido = "";
    if (obj.status === "Aguardando") {
      const dias = Math.floor(
        (new Date() - new Date(obj.data)) / (1000 * 60 * 60 * 24),
      );
      if (dias > 30)
        badgeVencido = `<div style="background:#dc3545;color:white;font-size:0.75rem;padding:2px 8px;border-radius:10px;display:inline-block;margin-bottom:5px;">Vencido (${dias}d) - Descarte/Doação</div>`;
    }

    let waBtn = "";
    if (obj.donoTel) {
      const tel = obj.donoTel.replace(/\D/g, "");
      const msg = encodeURIComponent(
        `Olá ${obj.dono ? obj.dono : ""}, seu objeto "${obj.nome}" foi encontrado e encontra-se na recepção!`,
      );
      waBtn = `<button class="btn-action" title="Avisar WhatsApp" style="color:#25D366;" onclick="window.open('https://wa.me/55${tel}?text=${msg}', '_blank')"><i class="fa-brands fa-whatsapp"></i></button>`;
    }

    const pdfBtn =
      obj.status === "Entregue"
        ? `<button class="btn-action" title="Assinar e Gerar PDF" onclick="abrirAssinatura('${obj.id}')"><i class="fa-solid fa-file-signature"></i></button>`
        : "";
    const qrBtn = `<button class="btn-action" title="Gerar Etiqueta QR" onclick="gerarEtiquetaQR('${obj.id}', '${obj.nome}')"><i class="fa-solid fa-qrcode"></i></button>`;
    const imgHtml = obj.foto
      ? `<div class="card-img"><img src="${obj.foto}"></div>`
      : "";
    const mapLink =
      obj.lat && obj.lng
        ? ` <a href="https://maps.google.com/?q=${obj.lat},${obj.lng}" target="_blank" style="color:var(--cor-roxo); font-size:0.8rem;"><i class="fa-solid fa-map"></i> Ver Mapa</a>`
        : "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            ${imgHtml}
            <div class="card-header" style="${obj.foto ? "padding-top:1rem;" : ""}">
                <div><h3 class="card-title">${obj.nome}</h3>${badgeVencido} <span class="card-date"><i class="fa-regular fa-calendar"></i> ${formatarData(obj.data)}</span></div>
                <span class="badge ${obj.status.toLowerCase()}">${obj.status}</span>
            </div>
            <div class="card-body">
                <div class="card-info-item"><i class="fa-solid fa-location-dot"></i> <span>${obj.local}</span> ${mapLink}</div>
                ${obj.dono ? `<div class="card-info-item"><i class="fa-solid fa-user"></i> <span>Dono: ${obj.dono}</span></div>` : ""}
                <p class="card-desc">${obj.desc || "<em>Sem descrição</em>"}</p>
            </div>
            <div class="card-actions">
                ${waBtn} ${qrBtn} ${pdfBtn}
                <button class="btn-action edit" onclick="openFormModal('${obj.id}')"><i class="fa-solid fa-pen"></i></button>
            </div>`;
    container.appendChild(card);
  });
}

// ================= CRUD USUÁRIOS =================
function openUserFormModal(id = null) {
  const formTitle = document.getElementById("modal-user-title");
  if (id) {
    formTitle.innerText = "Editar Usuário";
    const usr = appData.usuarios.find((u) => u.id === id);
    if (usr) {
      document.getElementById("usr-id").value = usr.id;
      document.getElementById("usr-nome").value = usr.nome;
      document.getElementById("usr-cpf").value = usr.cpf;
      document.getElementById("usr-telefone").value = usr.telefone;
      document.getElementById("usr-email").value = usr.email;
      document.getElementById("usr-senha").value = usr.senha;
      document.getElementById("usr-role").value = usr.role;
    }
  } else {
    formTitle.innerText = "Novo Usuário";
    document.getElementById("usr-id").value = "";
  }
  openModal("modal-user-form");
}

function salvarUsuario(e) {
  e.preventDefault();
  const idInput = document.getElementById("usr-id").value;
  const nome = document.getElementById("usr-nome").value.trim();
  const cpf = document.getElementById("usr-cpf").value.trim();
  const telefone = document.getElementById("usr-telefone").value.trim();
  const email = document.getElementById("usr-email").value.trim();
  const senha = document.getElementById("usr-senha").value.trim();
  const role = document.getElementById("usr-role").value;

  if (!nome || !email || !senha) return;

  if (idInput !== "") {
    const index = appData.usuarios.findIndex((u) => u.id === idInput);
    if (index !== -1) {
      appData.usuarios[index] = {
        id: idInput,
        nome,
        cpf,
        telefone,
        email,
        senha,
        role,
      };
      registrarHistorico("edicao", "Usuário: " + nome);
      if (currentUser.id === idInput) {
        currentUser = appData.usuarios[index];
        sessionStorage.setItem("axo_session", JSON.stringify(currentUser));
        iniciarApp();
      }
      showToast("Usuário editado.", "success");
    }
  } else {
    if (appData.usuarios.some((u) => u.email === email)) {
      showToast("E-mail já em uso.", "error");
      return;
    }
    appData.usuarios.unshift({
      id: "usr_" + new Date().getTime(),
      nome,
      cpf,
      telefone,
      email,
      senha,
      role,
    });
    registrarHistorico("criacao", "Usuário: " + nome);
    showToast("Usuário criado.", "success");
  }
  salvarDados();
  renderUsuarios();
  closeModal("modal-user-form");
}

function renderUsuarios() {
  const container = document.getElementById("usuarios-container");
  if (!container) return;
  container.innerHTML = "";
  appData.usuarios.forEach((usr) => {
    const roleClass = usr.role === "admin" ? "aguardando" : "entregue";
    const roleName = usr.role === "admin" ? "Admin" : "Funcionário";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-header">
                <div><h3 class="card-title"><i class="fa-solid fa-user-circle" style="color:var(--cor-roxo)"></i> ${usr.nome}</h3><span class="card-date">${usr.email}</span></div>
                <span class="badge ${roleClass}">${roleName}</span>
            </div>
            <div class="card-body">
                <div class="card-info-item"><i class="fa-solid fa-id-card"></i> <span>CPF: ${usr.cpf || "Não inf."}</span></div>
                <div class="card-info-item"><i class="fa-solid fa-phone"></i> <span>Tel: ${usr.telefone || "Não inf."}</span></div>
            </div>
            <div class="card-actions">
                <button class="btn-action edit" onclick="openUserFormModal('${usr.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-action delete" onclick="confirmarExclusaoUsuario('${usr.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    container.appendChild(card);
  });
}

function confirmarExclusaoUsuario(id) {
  if (id === currentUser.id) {
    showToast("Não é possível excluir a si mesmo.", "error");
    return;
  }
  const usr = appData.usuarios.find((u) => u.id === id);
  if (!usr) return;
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Excluir o acesso de <strong>${usr.nome}</strong>?`;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    appData.usuarios = appData.usuarios.filter((u) => u.id !== id);
    registrarHistorico("exclusao", "Usuário: " + usr.nome);
    salvarDados();
    renderUsuarios();
    closeModal("modal-confirm");
    showToast("Usuário removido.", "info");
  });
  openModal("modal-confirm");
}

// ================= HISTÓRICO E EXCLUSÃO OBJETOS =================
function formatarData(dataISO) {
  const p = dataISO.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function confirmarExclusao(id) {
  const obj = appData.objetos.find((o) => o.id === id);
  if (!obj) return;
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Excluir permanentemente <strong>${obj.nome}</strong>?`;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    appData.objetos = appData.objetos.filter((o) => o.id !== id);
    registrarHistorico("exclusao", obj.nome);
    salvarDados();
    renderObjetos();
    renderDashboard();
    closeModal("modal-confirm");
    showToast("Objeto excluído.", "info");
  });
  openModal("modal-confirm");
}

function registrarHistorico(tipo, detalhe) {
  appData.historico.unshift({
    id: "hist_" + new Date().getTime(),
    timestamp: new Date().toISOString(),
    tipo,
    objeto: detalhe,
    usuario: currentUser ? currentUser.nome : "Sistema",
  });
}

function renderHistorico() {
  const container = document.getElementById("historico-container");
  if (!container) return;
  container.innerHTML = "";
  if (appData.historico.length === 0) {
    container.innerHTML = `<div style="padding:2rem;text-align:center;">Nenhuma ação registrada.</div>`;
    return;
  }

  const getIconInfo = (tipo) => {
    const map = {
      criacao: { icone: "fa-plus", classe: "icon-criacao", texto: "criou" },
      edicao: { icone: "fa-pen", classe: "icon-edicao", texto: "editou" },
      exclusao: {
        icone: "fa-trash",
        classe: "icon-exclusao",
        texto: "excluiu",
      },
      backup: { icone: "fa-download", classe: "icon-backup", texto: "ação:" },
      importacao: {
        icone: "fa-upload",
        classe: "icon-backup",
        texto: "importou",
      },
      restauracao: {
        icone: "fa-rotate-left",
        classe: "icon-backup",
        texto: "restaurou",
      },
    };
    return map[tipo] || { icone: "fa-circle", classe: "", texto: "realizou" };
  };

  appData.historico.forEach((item) => {
    const info = getIconInfo(item.tipo);
    const dataFormatada = new Date(item.timestamp).toLocaleString("pt-BR");
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `<div class="history-icon ${info.classe}"><i class="fa-solid ${info.icone}"></i></div><div class="history-details"><div class="history-title">${item.usuario} ${info.texto} <strong>${item.objeto}</strong></div><div class="history-meta"><span><i class="fa-regular fa-clock"></i> ${dataFormatada}</span></div></div>`;
    container.appendChild(li);
  });
}

function confirmarLimparHistorico() {
  if (appData.historico.length === 0) return;
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Apagar <strong>todo o histórico</strong>?`;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    appData.historico = [];
    registrarHistorico("exclusao", "Limpeza geral");
    salvarDados();
    renderHistorico();
    closeModal("modal-confirm");
    showToast("Histórico limpo.", "success");
  });
  openModal("modal-confirm");
}

// ================= BACKUP E RESTAURAÇÃO =================
function exportData() {
  registrarHistorico("backup", "Exportação JSON");
  salvarDados();
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(appData));
  const a = document.createElement("a");
  a.href = dataStr;
  a.download = `axo_backup_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("Backup baixado.", "success");
}

function processarImportacao(event) {
  const file = event.target.files[0];
  if (!file) return;
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Isso irá <strong>sobrescrever TODOS os dados</strong>. Continuar?`;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json = JSON.parse(e.target.result);
        if (json.objetos && json.historico && json.usuarios) {
          appData = json;
          registrarHistorico("importacao", file.name);
          salvarDados();
          aplicarTemaAtual();
          iniciarApp();
          closeModal("modal-confirm");
          document.getElementById("import-file").value = "";
          showToast("Dados importados com sucesso!", "success");
        } else throw new Error();
      } catch (err) {
        showToast("Arquivo inválido.", "error");
        closeModal("modal-confirm");
      }
    };
    reader.readAsText(file);
  });
  openModal("modal-confirm");
}

function restaurarAutoBackup() {
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Restaurar para o último estado salvo automaticamente?`;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    const auto = localStorage.getItem("axo_data_autobackup");
    if (auto) {
      try {
        appData = JSON.parse(auto);
        registrarHistorico("restauracao", "Auto-backup");
        salvarDados();
        aplicarTemaAtual();
        iniciarApp();
        closeModal("modal-confirm");
        showToast("Sistema restaurado.", "success");
      } catch (e) {
        showToast("Erro ao restaurar.", "error");
      }
    } else {
      showToast("Nenhum backup encontrado.", "error");
      closeModal("modal-confirm");
    }
  });
  openModal("modal-confirm");
}

// ================= FILTROS =================
function configurarFiltros() {
  const bind = (id, evt) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, renderObjetos);
  };
  bind("filter-search", "input");
  bind("filter-status", "change");
}
