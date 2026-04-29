/**
 * AXÔ Business - Aplicação Core
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

// ================= INICIALIZAÇÃO =================
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  garantirAdminPadrao();
  aplicarTemaAtual();

  // Verifica sessão
  verificarSessao();

  // Eventos globais
  configurarNavegacao();
  configurarFiltros();

  // Setar data máxima no formulário para hoje
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("obj-data").max = hoje;

  // Fechar dropdown de perfil se clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-profile")) {
      document.getElementById("user-dropdown").classList.add("hidden");
    }
  });
});

// ================= AUTENTICAÇÃO E SESSÃO =================
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
  const errorMsg = document.getElementById("login-error");

  const usuario = appData.usuarios.find(
    (u) => u.email === email && u.senha === senha,
  );

  if (usuario) {
    currentUser = usuario;
    sessionStorage.setItem("axo_session", JSON.stringify(currentUser));
    errorMsg.classList.add("hidden");
    iniciarApp();
  } else {
    errorMsg.classList.remove("hidden");
  }
}

function realizarLogout() {
  currentUser = null;
  sessionStorage.removeItem("axo_session");
  document.getElementById("login-form").reset();
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

function iniciarApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");

  // Atualizar UI com dados do usuário
  document.getElementById("display-user-name").innerText =
    currentUser.nome.split(" ")[0];
  document.getElementById("dropdown-name").innerText = currentUser.nome;

  const roleBadge = document.getElementById("dropdown-role");
  roleBadge.innerText =
    currentUser.role === "admin" ? "Administrador" : "Funcionário";
  roleBadge.className =
    "badge " + (currentUser.role === "admin" ? "aguardando" : "entregue");

  // Aplicar permissões
  aplicarPermissoes();

  // Renderizar views iniciais
  renderObjetos();
  renderHistorico();
  if (currentUser.role === "admin") renderUsuarios();
  atualizarTextoUltimoBackup();

  // Forçar aba inicial
  document.querySelector('.nav-item[data-target="view-objetos"]').click();
}

function aplicarPermissoes() {
  const adminElements = document.querySelectorAll(".admin-only");
  if (currentUser.role === "admin") {
    adminElements.forEach((el) => (el.style.display = ""));
  } else {
    adminElements.forEach((el) => (el.style.display = "none"));
  }
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

// ================= NAVEGAÇÃO E TEMA =================
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

      if (pageTitle && btn.getAttribute("data-title")) {
        pageTitle.innerText = btn.getAttribute("data-title");
      }

      if (targetId === "view-historico") renderHistorico();
      if (targetId === "view-usuarios") renderUsuarios();

      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("mobile-open");
      }
    });
  });

  const themeBtn = document.getElementById("theme-btn");
  themeBtn.addEventListener("click", () => {
    appData.theme = appData.theme === "light" ? "dark" : "light";
    aplicarTemaAtual();
    salvarDadosSilencioso();
  });

  const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("collapsed");
    });
  }

  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("mobile-open");
    });
  }
}

function aplicarTemaAtual() {
  document.documentElement.setAttribute("data-theme", appData.theme);
  const icon = document.querySelector("#theme-btn i");
  if (icon) {
    if (appData.theme === "dark") {
      icon.className = "fa-solid fa-sun";
    } else {
      icon.className = "fa-solid fa-moon";
    }
  }
}

// ================= MODAIS =================
function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
  if (id === "modal-form") {
    document.getElementById("objeto-form").reset();
    document.getElementById("obj-id").value = "";
  }
  if (id === "modal-user-form") {
    document.getElementById("usuario-form").reset();
    document.getElementById("usr-id").value = "";
  }
}

// ================= CRUD DE OBJETOS =================
function openFormModal(id = null) {
  const formTitle = document.getElementById("modal-form-title");
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

  if (!nome || !data || !local) return;

  const isEdit = idInput !== "";

  if (isEdit) {
    const index = appData.objetos.findIndex((o) => o.id === idInput);
    if (index !== -1) {
      appData.objetos[index] = { id: idInput, nome, local, data, status, desc };
      registrarHistorico("edicao", nome);
    }
  } else {
    const newId = "obj_" + new Date().getTime();
    appData.objetos.unshift({ id: newId, nome, local, data, status, desc });
    registrarHistorico("criacao", nome);
  }

  salvarDados();
  renderObjetos();
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
    closeModal("modal-confirm");
  });

  openModal("modal-confirm");
}

// ================= CRUD DE USUÁRIOS =================
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

  const isEdit = idInput !== "";

  if (isEdit) {
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

      // Atualiza a própria sessão se estiver editando a si mesmo
      if (currentUser.id === idInput) {
        currentUser = appData.usuarios[index];
        sessionStorage.setItem("axo_session", JSON.stringify(currentUser));
        iniciarApp(); // Refresh interface
      }
    }
  } else {
    // Valida email unico
    if (appData.usuarios.some((u) => u.email === email)) {
      alert("Este e-mail já está em uso.");
      return;
    }
    const newId = "usr_" + new Date().getTime();
    appData.usuarios.unshift({
      id: newId,
      nome,
      cpf,
      telefone,
      email,
      senha,
      role,
    });
    registrarHistorico("criacao", "Usuário: " + nome);
  }

  salvarDados();
  renderUsuarios();
  closeModal("modal-user-form");
}

function confirmarExclusaoUsuario(id) {
  if (id === currentUser.id) {
    alert("Você não pode excluir a si mesmo enquanto estiver logado.");
    return;
  }

  const usr = appData.usuarios.find((u) => u.id === id);
  if (!usr) return;

  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Excluir o acesso do usuário <strong>${usr.nome}</strong>?`;

  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    appData.usuarios = appData.usuarios.filter((u) => u.id !== id);
    registrarHistorico("exclusao", "Usuário: " + usr.nome);
    salvarDados();
    renderUsuarios();
    closeModal("modal-confirm");
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
                <div>
                    <h3 class="card-title"><i class="fa-solid fa-user-circle" style="color:var(--cor-roxo)"></i> ${usr.nome}</h3>
                    <span class="card-date">${usr.email}</span>
                </div>
                <span class="badge ${roleClass}">${roleName}</span>
            </div>
            
            <div class="card-body">
                <div class="card-info-item"><i class="fa-solid fa-id-card"></i> <span>CPF: ${usr.cpf || "Não inf."}</span></div>
                <div class="card-info-item"><i class="fa-solid fa-phone"></i> <span>Tel: ${usr.telefone || "Não inf."}</span></div>
            </div>

            <div class="card-actions">
                <button class="btn-action edit" onclick="openUserFormModal('${usr.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-action delete" onclick="confirmarExclusaoUsuario('${usr.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
            </div>
        `;
    container.appendChild(card);
  });
}

// ================= FILTROS E RENDERIZAÇÃO OBJETOS =================
function configurarFiltros() {
  const search = document.getElementById("filter-search");
  const status = document.getElementById("filter-status");
  const periodo = document.getElementById("filter-periodo");
  const dateStart = document.getElementById("filter-date-start");
  const dateEnd = document.getElementById("filter-date-end");
  const customGroup = document.getElementById("custom-date-container");

  const reRender = () => renderObjetos();

  if (search) search.addEventListener("input", reRender);
  if (status) status.addEventListener("change", reRender);
  if (dateStart) dateStart.addEventListener("change", reRender);
  if (dateEnd) dateEnd.addEventListener("change", reRender);

  if (periodo)
    periodo.addEventListener("change", (e) => {
      if (e.target.value === "custom") customGroup.classList.remove("hidden");
      else {
        customGroup.classList.add("hidden");
        dateStart.value = "";
        dateEnd.value = "";
      }
      reRender();
    });
}

function getFilteredObjetos() {
  const search =
    document.getElementById("filter-search")?.value.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "todos";
  const periodo = document.getElementById("filter-periodo")?.value || "todos";

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  return appData.objetos.filter((obj) => {
    const matchTexto =
      obj.nome.toLowerCase().includes(search) ||
      obj.desc.toLowerCase().includes(search);
    if (!matchTexto) return false;
    if (status !== "todos" && obj.status !== status) return false;

    const objData = new Date(obj.data + "T12:00:00");
    if (periodo === "7") {
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(hoje.getDate() - 7);
      if (objData < seteDiasAtras) return false;
    } else if (periodo === "30") {
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      if (objData < trintaDiasAtras) return false;
    } else if (periodo === "custom") {
      const start = document.getElementById("filter-date-start").value;
      const end = document.getElementById("filter-date-end").value;
      if (start && objData < new Date(start + "T00:00:00")) return false;
      if (end && objData > new Date(end + "T23:59:59")) return false;
    }
    return true;
  });
}

function formatarData(dataISO) {
  const partes = dataISO.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function renderObjetos() {
  const container = document.getElementById("objetos-container");
  if (!container) return;
  const filtrados = getFilteredObjetos();
  container.innerHTML = "";

  if (filtrados.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h2>Nenhum objeto encontrado</h2>
                <p style="color: var(--text-secondary); margin-top: 10px;">Ajuste os filtros ou adicione um novo registro.</p>
            </div>`;
    return;
  }

  filtrados.forEach((obj) => {
    const statusClass = obj.status.toLowerCase();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${obj.nome}</h3>
                    <span class="card-date"><i class="fa-regular fa-calendar"></i> ${formatarData(obj.data)}</span>
                </div>
                <span class="badge ${statusClass}">${obj.status}</span>
            </div>
            <div class="card-body">
                <div class="card-info-item"><i class="fa-solid fa-location-dot"></i> <span>${obj.local}</span></div>
                <p class="card-desc">${obj.desc || "<em>Sem descrição informada</em>"}</p>
            </div>
            <div class="card-actions">
                <button class="btn-action edit" onclick="openFormModal('${obj.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-action delete" onclick="confirmarExclusao('${obj.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
            </div>
        `;
    container.appendChild(card);
  });
}

// ================= HISTÓRICO =================
function registrarHistorico(tipo, detalhe) {
  const acao = {
    id: "hist_" + new Date().getTime(),
    timestamp: new Date().toISOString(),
    tipo: tipo,
    objeto: detalhe,
    usuario: currentUser ? currentUser.nome : "Sistema",
  };
  appData.historico.unshift(acao);
}

function renderHistorico() {
  const container = document.getElementById("historico-container");
  if (!container) return;
  container.innerHTML = "";

  if (appData.historico.length === 0) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Nenhuma ação registrada no histórico.</div>`;
    return;
  }

  const getIconInfo = (tipo) => {
    switch (tipo) {
      case "criacao":
        return {
          icone: "fa-plus",
          classe: "icon-criacao",
          texto: "criou o registro",
        };
      case "edicao":
        return {
          icone: "fa-pen",
          classe: "icon-edicao",
          texto: "editou o registro",
        };
      case "exclusao":
        return {
          icone: "fa-trash",
          classe: "icon-exclusao",
          texto: "excluiu o registro",
        };
      case "backup":
        return {
          icone: "fa-download",
          classe: "icon-backup",
          texto: "realizou backup",
        };
      case "importacao":
        return {
          icone: "fa-upload",
          classe: "icon-backup",
          texto: "importou dados",
        };
      case "restauracao":
        return {
          icone: "fa-rotate-left",
          classe: "icon-backup",
          texto: "restaurou o sistema",
        };
      default:
        return { icone: "fa-circle", classe: "", texto: "realizou uma ação" };
    }
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
            </div>
        `;
    container.appendChild(li);
  });
}

function confirmarLimparHistorico() {
  if (appData.historico.length === 0) return;
  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Tem certeza que deseja apagar <strong>todo o histórico</strong> de ações?`;

  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener("click", () => {
    appData.historico = [];
    registrarHistorico("exclusao", "Limpeza geral do histórico");
    salvarDados();
    renderHistorico();
    closeModal("modal-confirm");
  });
  openModal("modal-confirm");
}

// ================= BACKUP E RESTAURAÇÃO =================
function exportData() {
  registrarHistorico("backup", "Exportação de Arquivo JSON");
  salvarDados();
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(appData));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute(
    "download",
    `axo_backup_${new Date().toISOString().split("T")[0]}.json`,
  );
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function processarImportacao(event) {
  const file = event.target.files[0];
  if (!file) return;

  const confirmBtn = document.getElementById("confirm-btn");
  document.getElementById("confirm-message").innerHTML =
    `Atenção: A importação irá <strong>sobrescrever TODOS os dados atuais</strong> pelos dados do arquivo.<br><br>Deseja continuar?`;

  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (
          importedData.objetos !== undefined &&
          importedData.historico !== undefined
        ) {
          appData = importedData;
          registrarHistorico("importacao", `Arquivo: ${file.name}`);
          salvarDados();
          aplicarTemaAtual();
          renderObjetos();
          renderHistorico();
          if (currentUser.role === "admin") renderUsuarios();
          closeModal("modal-confirm");
          document.getElementById("import-file").value = "";
        } else {
          alert("Arquivo de backup inválido.");
          closeModal("modal-confirm");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo. Certifique-se que é um JSON válido.");
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
    `Restaurar o sistema substituirá as alterações recentes pelo último estado salvo automaticamente.<br><br>Confirmar restauração?`;

  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    const autoBackupStr = localStorage.getItem("axo_data_autobackup");
    if (autoBackupStr) {
      try {
        appData = JSON.parse(autoBackupStr);
        registrarHistorico("restauracao", "Ponto de restauração automático");
        salvarDados();
        aplicarTemaAtual();
        renderObjetos();
        renderHistorico();
        if (currentUser.role === "admin") renderUsuarios();
        closeModal("modal-confirm");
      } catch (e) {
        alert("Erro ao restaurar dados.");
      }
    } else {
      alert("Nenhum auto-backup encontrado no dispositivo.");
      closeModal("modal-confirm");
    }
  });
  openModal("modal-confirm");
}
