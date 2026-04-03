(function () {
  var PHONE = "5584996248241";
  var PROJECT_MARKER = "/advnoemiasite/";

  var AREAS = {
    geral: {
      label: "Atendimento geral",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Quero passar pela triagem inicial do meu caso."
    },
    previdenciario: {
      label: "Direito Previdenciário",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma demanda previdenciária e quero uma análise inicial."
    },
    "consumidor-bancario": {
      label: "Direito do Consumidor e Bancário",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma demanda de consumidor ou bancária e quero uma análise inicial."
    },
    consumidor: {
      label: "Direito do Consumidor",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma questão de consumo e quero uma análise inicial."
    },
    bancario: {
      label: "Direito Bancário",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma questão bancária e quero uma análise inicial."
    },
    familia: {
      label: "Direito de Família",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma demanda de família e quero uma análise inicial."
    },
    civil: {
      label: "Direito Civil",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma demanda cível e quero uma análise inicial."
    },
    outro: {
      label: "Outro assunto jurídico",
      intro: "Olá, equipe da Noêmia Paixão Advocacia. Tenho uma demanda jurídica e quero uma análise inicial."
    }
  };

  var PAGE_MAP = {
    "index.html": { mode: "triage", area: "geral", source: "home" },
    "blog.html": { mode: "triage", area: "geral", source: "blog" },
    "direito-previdenciario.html": {
      mode: "triage",
      area: "previdenciario",
      source: "area-previdenciario"
    },
    "direito-consumidor-bancario.html": {
      mode: "triage",
      area: "consumidor-bancario",
      source: "area-consumidor-bancario"
    },
    "direito-familia.html": {
      mode: "triage",
      area: "familia",
      source: "area-familia"
    },
    "direito-civil.html": {
      mode: "triage",
      area: "civil",
      source: "area-civil"
    },
    "triagem.html": {
      mode: "support",
      source: "triagem",
      message: "Olá, estou preenchendo a triagem inicial e preciso de ajuda."
    },
    "artigos/aposentadoria-negada-inss.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-aposentadoria-negada"
    },
    "artigos/contrato-descumprido.html": {
      mode: "triage",
      area: "civil",
      source: "artigo-contrato-descumprido"
    },
    "artigos/desconto-indevido-conta.html": {
      mode: "triage",
      area: "bancario",
      source: "artigo-desconto-conta"
    },
    "artigos/desconto-indevido-inss.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-desconto-inss"
    },
    "artigos/divorcio-primeiros-passos.html": {
      mode: "triage",
      area: "familia",
      source: "artigo-divorcio"
    },
    "artigos/emprestimo-consignado-indevido.html": {
      mode: "triage",
      area: "bancario",
      source: "artigo-consignado"
    },
    "artigos/nome-negativado-indevidamente.html": {
      mode: "triage",
      area: "consumidor",
      source: "artigo-negativacao"
    },
    "artigos/revisao-aposentadoria-2026.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-revisao-aposentadoria"
    },
    "artigos/revisao-pensao-alimenticia.html": {
      mode: "triage",
      area: "familia",
      source: "artigo-revisao-pensao"
    },
    "portal/login.html": {
      mode: "support",
      source: "portal-login",
      message: "Olá, estou na área reservada e preciso de apoio no acesso."
    },
    "portal/painel-advogada.html": {
      mode: "support",
      source: "portal-advogada",
      message: "Olá, estou na área interna e preciso de apoio da equipe."
    },
    "portal/painel-cliente.html": {
      mode: "support",
      source: "portal-cliente",
      message: "Olá, estou na área do cliente e preciso de orientação."
    },
    "portal/documentos.html": {
      mode: "support",
      source: "portal-documentos",
      message: "Olá, estou na área de documentos e preciso de orientação."
    },
    "portal/agenda.html": {
      mode: "support",
      source: "portal-agenda",
      message: "Olá, estou na área de agenda e preciso de orientação."
    }
  };

  function normalizePageKey(pathname) {
    var path = (pathname || window.location.pathname || "").replace(/\\/g, "/");
    var markerIndex = path.toLowerCase().indexOf(PROJECT_MARKER);

    if (markerIndex !== -1) {
      path = path.slice(markerIndex + PROJECT_MARKER.length);
    } else {
      path = path.replace(/^\/+/, "");
    }

    if (!path || path === "/") {
      return "index.html";
    }

    var match = path.match(
      /(index\.html|blog\.html|triagem\.html|artigos\/[^/]+\.html|portal\/[^/]+\.html)$/
    );

    return match ? match[1] : path;
  }

  function getPageKey() {
    return normalizePageKey(window.location.pathname);
  }

  function getPrefix() {
    var key = getPageKey();
    if (key.indexOf("artigos/") === 0 || key.indexOf("portal/") === 0) {
      return "../";
    }
    return "";
  }

  function getConfig() {
    var key = getPageKey();
    return PAGE_MAP[key] || { mode: "triage", area: "geral", source: key.replace(".html", "") };
  }

  function buildTriageHref(config) {
    var params = new URLSearchParams();
    params.set("area", config.area || "geral");
    params.set("origem", config.source || "site");
    params.set("pagina", getPageKey());
    return getPrefix() + "triagem.html?" + params.toString();
  }

  function buildSupportHref(config) {
    var message = config.message || "Olá, preciso de orientação da equipe.";
    return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(message);
  }

  function getUpdatedLabel(label) {
    if (/whatsapp$/i.test(label) && label.length <= 18) {
      return "Triagem no WhatsApp";
    }

    if (/falar no whatsapp|falar com a equipe/i.test(label)) {
      return "Enviar caso para triagem";
    }

    if (/solicitar análise inicial|agendar análise inicial/i.test(label)) {
      return "Iniciar triagem inicial";
    }

    if (/tirar uma dúvida inicial/i.test(label)) {
      return "Enviar informações do caso";
    }

    return label;
  }

  function updatePublicWhatsAppLinks(config) {
    if (config.mode !== "triage") {
      return;
    }

    var triageHref = buildTriageHref(config);

    document.querySelectorAll('a[href*="wa.me/"]').forEach(function (link) {
      link.href = triageHref;
      link.removeAttribute("target");
      link.removeAttribute("rel");

      if (link.textContent && link.textContent.trim()) {
        link.textContent = getUpdatedLabel(link.textContent.trim());
      }
    });
  }

  function ensureWidgets(config) {
    var href = config.mode === "triage" ? buildTriageHref(config) : buildSupportHref(config);
    var floatingLabel = "WhatsApp";
    var mobileLabel =
      config.mode === "triage" ? "Iniciar triagem no WhatsApp" : "Falar com a equipe no WhatsApp";

    var existingFloat = document.querySelector(".whatsapp-float, .floating-contact, .contact-floating-widget");
    if (existingFloat) {
      existingFloat.href = href;
      existingFloat.setAttribute("aria-label", mobileLabel);
      existingFloat.removeAttribute("target");
      existingFloat.removeAttribute("rel");

      if (existingFloat.classList.contains("floating-contact")) {
        existingFloat.innerHTML = "<span>" + floatingLabel + "</span>";
      }

      if (existingFloat.classList.contains("contact-floating-widget")) {
        existingFloat.textContent = floatingLabel;
      }
    } else {
      var floatLink = document.createElement("a");
      floatLink.className = "contact-floating-widget";
      floatLink.href = href;
      floatLink.setAttribute("aria-label", mobileLabel);
      floatLink.textContent = floatingLabel;
      document.body.appendChild(floatLink);
    }

    var existingMobileLink = document.querySelector(".mobile-cta-bar a, .contact-mobile-widget a");
    if (existingMobileLink) {
      existingMobileLink.href = href;
      existingMobileLink.textContent = mobileLabel;
      existingMobileLink.removeAttribute("target");
      existingMobileLink.removeAttribute("rel");
    } else {
      var mobileWrap = document.createElement("div");
      mobileWrap.className = "contact-mobile-widget";
      mobileWrap.innerHTML = '<a class="contact-mobile-link" href="' + href + '">' + mobileLabel + "</a>";
      document.body.appendChild(mobileWrap);
    }

    document.body.classList.add("has-mobile-contact");
  }

  function setupTriageForm() {
    var form = document.querySelector("[data-triage-form]");
    if (!form) {
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var area = params.get("area") || "geral";
    var source = params.get("origem") || "site";
    var page = normalizePageKey(params.get("pagina") || "triagem.html");
    var areaConfig = AREAS[area] || AREAS.geral;

    var areaInput = document.querySelector("[data-triage-area-input]");
    var sourceInput = document.querySelector("[data-triage-source-input]");
    var pageInput = document.querySelector("[data-triage-page-input]");
    var areaBadge = document.getElementById("triageAreaBadge");
    var originBadge = document.getElementById("triageOriginBadge");
    var problemType = document.getElementById("leadProblemType");

    if (areaInput) areaInput.value = area;
    if (sourceInput) sourceInput.value = source;
    if (pageInput) pageInput.value = page;
    if (areaBadge) areaBadge.textContent = areaConfig.label;
    if (originBadge) originBadge.textContent = "Origem: " + source;
    if (problemType && problemType.querySelector('option[value="' + area + '"]')) {
      problemType.value = area;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = new FormData(form);
      var selectedArea = data.get("problem_type") || area;
      var selectedAreaConfig = AREAS[selectedArea] || areaConfig;

      var message = [
        selectedAreaConfig.intro,
        "",
        "Triagem inicial preenchida pelo site:",
        "Nome: " + data.get("name"),
        "Telefone: " + data.get("phone"),
        "Cidade: " + data.get("city"),
        "Tipo de problema: " + selectedAreaConfig.label,
        "Urgência: " + data.get("urgency"),
        "Descrição: " + data.get("description"),
        "Origem do contato: " + (data.get("source") || source),
        "Página de origem: " + (data.get("page") || page)
      ].join("\n");

      window.location.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(message);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var config = getConfig();
    updatePublicWhatsAppLinks(config);
    ensureWidgets(config);
    setupTriageForm();
  });
})();
