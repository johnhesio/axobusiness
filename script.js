/**
 * AXÔ Business - Aplicação Core Completa
 */

// ================= ESTADO DA APLICAÇÃO =================
let appData = {
  objetos: [],
  historico: [],
  usuarios: [],
  ultimoBackup: null,
  theme: "light",
};

let currentUser = null;
let currentImageB64 = null; // Armazena a foto atual em memória
let dashChart = null; // Instância do gráfico

// ================= INICIALIZAÇÃO =================
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  garantirAdminPadrao();
  aplicarTemaAtual();
  verificarSessao();
  configurarNavegacao();
  configurarFiltros();

  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("obj-data").max = hoje;

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-profile")) {
      document.getElementById("user-dropdown").classList.add("hidden");
    }
  });
});

// ================= TOAST NOTIFICATIONS =================
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

  // Fade In
  setTimeout(() => toast.classList.add("show"), 10);

  // Remove apos 3s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300); // Aguarda animação CSS
  }, 3000);
}

// ================= AUTENTICAÇÃO =================
function garantirAdminPadrao() {
  if (appData.usuarios.length === 0) {
    appData.usuarios.push({
      id: "usr_" + Date.now(),
      nome: "Administrador do Sistema",
      cpf: "000.000.000-00",
      telefone: "(00) 00000-0000",
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
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;

  const usuario = appData.usuarios.find(
    (u) => u.email === email && u.senha === senha,
  );

  if (usuario) {
    currentUser = usuario;
    sessionStorage.setItem("axo_session", JSON.stringify(currentUser));
    showToast(`Bem-vindo, ${usuario.nome}!`, "success");
    iniciarApp();
  } else {
    showToast("E-mail ou senha incorretos.", "error");
  }
}

function realizarLogout() {
  currentUser = null;
  sessionStorage.removeItem("axo_session");
  document.getElementById("login-form").reset();
  showToast("Sessão encerrada com sucesso.", "info");
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

  const roleBadge = document.getElementById("dropdown-role");
  roleBadge.innerText =
    currentUser.role === "admin" ? "Administrador" : "Funcionário";
  roleBadge.className =
    "badge " + (currentUser.role === "admin" ? "aguardando" : "entregue");

  aplicarPermissoes();

  // Render inicial
  renderDashboard();
  renderObjetos();
  renderHistorico();
  if (currentUser.role === "admin") renderUsuarios();
  atualizarTextoUltimoBackup();

  document.querySelector('.nav-item[data-target="view-dashboard"]').click();
}

function aplicarPermissoes() {
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(
    (el) => (el.style.display = currentUser.role === "admin" ? "" : "none"),
  );
}

// ================= PERSISTÊNCIA =================
function carregarDados() {
  const saved = localStorage.getItem("axo_data");
  if (saved) {
    try {
      appData = JSON.parse(saved);
      if (!appData.objetos) appData.objetos = [];
      if (!appData.historico) appData.historico = [];
      if (!appData.usuarios) appData.usuarios = [];
      if (!appData.theme) appData.theme = "light";
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    }
  }
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
    const data = new Date(appData.ultimoBackup);
    el.innerText = `Último salvamento: ${data.toLocaleString("pt-BR")}`;
  }
}

// ================= COMPRESSÃO E UPLOAD DE FOTOS (ZERO-UPLOAD) =================
function processarImagem(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Comprimir in-memory com Canvas
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 400; // Tamanho ideal para thumbnails sem gastar DB
      const scaleSize = MAX_WIDTH / img.width;

      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      currentImageB64 = canvas.toDataURL("image/jpeg", 0.7); // Compressão Jpeg 70%

      // Exibir preview
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

// ================= GERAÇÃO DE PDF =================
function gerarTermoPDF(id) {
  const obj = appData.objetos.find((o) => o.id === id);
  if (!obj) return;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cores Oficiais
    doc.setFillColor(100, 54, 152); // Roxo AXÔ
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("AXÔ Business", 105, 20, null, null, "center");
    doc.setFontSize(14);
    doc.text("Termo Probatório de Entrega", 105, 30, null, null, "center");

    // Corpo
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
    y += 10;

    // Tratar texto longo na descrição
    const descLines = doc.splitTextToSize(
      `Descrição: ${obj.desc || "Nenhuma"}`,
      170,
    );
    doc.text(descLines, 20, y);

    y += descLines.length * 10 + 20;

    doc.text(
      "Declaro para os devidos fins ter recebido o objeto acima descrito",
      20,
      y,
    );
    y += 10;
    doc.text("nas condições especificadas.", 20, y);

    // Assinaturas
    y += 40;
    doc.line(30, y, 90, y); // Linha Entregador
    doc.line(120, y, 180, y); // Linha Recebedor

    y += 5;
    doc.setFontSize(10);
    doc.text(`Entregue por: ${currentUser.nome}`, 60, y, null, null, "center");
    doc.text("Assinatura de quem retirou", 150, y, null, null, "center");

    // Footer com data gerada
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Documento gerado eletronicamente em: ${new Date().toLocaleString("pt-BR")}`,
      105,
      280,
      null,
      null,
      "center",
    );

    doc.save(`Termo_AXO_${obj.nome.replace(/\s+/g, "_")}.pdf`);
    showToast("Termo PDF gerado com sucesso!", "success");
    registrarHistorico("backup", `Gerou PDF do Objeto: ${obj.nome}`);
  } catch (err) {
    showToast("Erro ao gerar PDF. Verifique sua conexão.", "error");
    console.error(err);
  }
}

// ================= DASHBOARD ANALÍTICO =================
function renderDashboard() {
  const total = appData.objetos.length;
  const aguardando = appData.objetos.filter(
    (o) => o.status === "Aguardando",
  ).length;
  const entregues = appData.objetos.filter(
    (o) => o.status === "Entregue",
  ).length;

  document.getElementById("stat-total").innerText = total;
  document.getElementById("stat-aguardando").innerText = aguardando;
  document.getElementById("stat-entregues").innerText = entregues;

  // Agrupar itens por data para o Gráfico
  const datasMap = {};
  // Pegar ultimos 7 dias
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datasMap[d.toISOString().split("T")[0]] = 0;
  }

  appData.objetos.forEach((obj) => {
    if (datasMap[obj.data] !== undefined) {
      datasMap[obj.data]++;
    }
  });

  const labels = Object.keys(datasMap).map(formatarData);
  const dataVals = Object.values(datasMap);

  const ctx = document.getElementById("objetosChart").getContext("2d");

  // Destruir grafico anterior se existir para evitar bug de hover
  if (dashChart) dashChart.destroy();

  const isDark = appData.theme === "dark";

  dashChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Objetos Cadastrados",
          data: dataVals,
          borderColor: "#643698",
          backgroundColor: "rgba(100, 54, 152, 0.2)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: "#E07815",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: isDark ? "#e0e0e0" : "#333" } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: isDark ? "#b0b0b0" : "#666" },
          grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        },
        x: {
          ticks: { color: isDark ? "#b0b0b0" : "#666" },
          grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        },
      },
    },
  });
}

// ================= RESTANTE DO CÓDIGO (Navegação, CRUD) =================

function configurarNavegacao() {
  const tabs = document.querySelectorAll(".nav-item[data-target]");
  const pageTitle = document.getElementById("current-page-title");

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      tabs.forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".view-section")
        .forEach((sec) => sec.classList.add("hidden"));

      const targetId = btn.getAttribute("data-target");
      btn.classList.add("active");
      document.getElementById(targetId).classList.remove("hidden");

      if (pageTitle && btn.getAttribute("data-title"))
        pageTitle.innerText = btn.getAttribute("data-title");

      if (targetId === "view-historico") renderHistorico();
      if (targetId === "view-usuarios") renderUsuarios();
      if (targetId === "view-dashboard") renderDashboard();

      if (window.innerWidth <= 768)
        document.getElementById("sidebar").classList.remove("mobile-open");
    });
  });

  document.getElementById("theme-btn").addEventListener("click", () => {
    appData.theme = appData.theme === "light" ? "dark" : "light";
    aplicarTemaAtual();
    salvarDadosSilencioso();
    renderDashboard(); // Atualiza cores do gráfico
  });

  document.getElementById("toggle-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
    setTimeout(() => {
      if (dashChart) dashChart.resize();
    }, 300); // Resize chart delay
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
    document.getElementById("obj-id").value = "";
    removerFoto();
  }
  if (id === "modal-user-form") {
    document.getElementById("usuario-form").reset();
    document.getElementById("usr-id").value = "";
  }
}

function openFormModal(id = null) {
  const formTitle = document.getElementById("modal-form-title");
  removerFoto(); // Limpa foto anterior
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

      if (obj.foto) {
        currentImageB64 = obj.foto;
        document.getElementById("preview-img").src = currentImageB64;
        document.getElementById("photo-preview").classList.remove("hidden");
      }
    }
  } else {
    formTitle.innerText = "Novo Objeto";
    document.getElementById("obj-data").value = new Date()
      .toISOString()
      .split("T")[0];
  }
  openModal("modal-form");
}

function salvarObjeto(e) {
  e.preventDefault();
  const idInput = document.getElementById("obj-id").value;
  const nome = document.getElementById("obj-nome").value.trim();
  const local = document.getElementById("obj-local").value.trim();
  const data = document.getElementById("obj-data").value;
  const status = document.getElementById("obj-status").value;
  const desc = document.getElementById("obj-desc").value.trim();
  const foto = currentImageB64;

  if (!nome || !data || !local) return;
  const isEdit = idInput !== "";

  if (isEdit) {
    const index = appData.objetos.findIndex((o) => o.id === idInput);
    if (index !== -1) {
      appData.objetos[index] = {
        id: idInput,
        nome,
        local,
        data,
        status,
        desc,
        foto,
      };
      registrarHistorico("edicao", nome);
      showToast("Objeto atualizado!", "success");
    }
  } else {
    const newId = "obj_" + new Date().getTime();
    appData.objetos.unshift({
      id: newId,
      nome,
      local,
      data,
      status,
      desc,
      foto,
    });
    registrarHistorico("criacao", nome);
    showToast("Objeto cadastrado com sucesso!", "success");
  }

  salvarDados();
  renderObjetos();
  renderDashboard();
  closeModal("modal-form");
}

function confirmarExclusao(id) {
  const obj = appData.objetos.find((o) => o.id === id);
  if (!obj) return;

  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Excluir permanentemente o objeto <strong>${obj.nome}</strong>?`;

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

// ---- Funções de Usuário ----
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
      showToast("Usuário editado com sucesso.", "success");
    }
  } else {
    if (appData.usuarios.some((u) => u.email === email)) {
      showToast("Este e-mail já está em uso.", "error");
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
    showToast("Novo usuário criado.", "success");
  }

  salvarDados();
  renderUsuarios();
  closeModal("modal-user-form");
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

function renderUsuarios() {
  const container = document.getElementById("usuarios-container");
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

// ---- Renderização Objetos e Filtros ----
function configurarFiltros() {
  const reRender = () => renderObjetos();
  const bind = (id, evt) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, reRender);
  };

  bind("filter-search", "input");
  bind("filter-status", "change");
  bind("filter-date-start", "change");
  bind("filter-date-end", "change");

  const periodo = document.getElementById("filter-periodo");
  const custom = document.getElementById("custom-date-container");
  if (periodo) {
    periodo.addEventListener("change", (e) => {
      if (e.target.value === "custom") custom.classList.remove("hidden");
      else {
        custom.classList.add("hidden");
        document.getElementById("filter-date-start").value = "";
        document.getElementById("filter-date-end").value = "";
      }
      reRender();
    });
  }
}

function getFilteredObjetos() {
  const search =
    document.getElementById("filter-search")?.value.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "todos";
  const periodo = document.getElementById("filter-periodo")?.value || "todos";
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  return appData.objetos.filter((obj) => {
    if (
      !(
        obj.nome.toLowerCase().includes(search) ||
        obj.desc.toLowerCase().includes(search)
      )
    )
      return false;
    if (status !== "todos" && obj.status !== status) return false;

    const objData = new Date(obj.data + "T12:00:00");
    if (periodo === "7" && objData < new Date(hoje).setDate(hoje.getDate() - 7))
      return false;
    if (
      periodo === "30" &&
      objData < new Date(hoje).setDate(hoje.getDate() - 30)
    )
      return false;
    if (periodo === "custom") {
      const start = document.getElementById("filter-date-start").value;
      const end = document.getElementById("filter-date-end").value;
      if (start && objData < new Date(start + "T00:00:00")) return false;
      if (end && objData > new Date(end + "T23:59:59")) return false;
    }
    return true;
  });
}

function formatarData(dataISO) {
  const p = dataISO.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function renderObjetos() {
  const container = document.getElementById("objetos-container");
  if (!container) return;
  const filtrados = getFilteredObjetos();
  container.innerHTML = "";

  if (filtrados.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><h2>Nenhum objeto encontrado</h2></div>`;
    return;
  }

  filtrados.forEach((obj) => {
    const statusClass = obj.status.toLowerCase();

    // Html da imagem se existir
    const imgHtml = obj.foto
      ? `<div class="card-img"><img src="${obj.foto}" alt="Foto do Objeto"></div>`
      : "";
    // Botão de gerar termo
    const pdfBtn =
      obj.status === "Entregue"
        ? `<button class="btn-action" title="Gerar Termo" onclick="gerarTermoPDF('${obj.id}')"><i class="fa-solid fa-file-pdf"></i></button>`
        : "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            ${imgHtml}
            <div class="card-header" style="${obj.foto ? "padding-top:1rem;" : ""}">
                <div><h3 class="card-title">${obj.nome}</h3><span class="card-date"><i class="fa-regular fa-calendar"></i> ${formatarData(obj.data)}</span></div>
                <span class="badge ${statusClass}">${obj.status}</span>
            </div>
            <div class="card-body">
                <div class="card-info-item"><i class="fa-solid fa-location-dot"></i> <span>${obj.local}</span></div>
                <p class="card-desc">${obj.desc || "<em>Sem descrição</em>"}</p>
            </div>
            <div class="card-actions">
                ${pdfBtn}
                <button class="btn-action edit" onclick="openFormModal('${obj.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-action delete" onclick="confirmarExclusao('${obj.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    container.appendChild(card);
  });
}

// ---- Historico e Backup ----
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
    li.innerHTML = `
            <div class="history-icon ${info.classe}"><i class="fa-solid ${info.icone}"></i></div>
            <div class="history-details">
                <div class="history-title">${item.usuario} ${info.texto} <strong>${item.objeto}</strong></div>
                <div class="history-meta"><span><i class="fa-regular fa-clock"></i> ${dataFormatada}</span></div>
            </div>`;
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
        if (json.objetos && json.historico) {
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
