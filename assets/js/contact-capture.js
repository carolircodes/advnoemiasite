(function () {
  var PHONE = "5584996248241";
  var PROJECT_MARKER = "/advnoemiasite/";
  var TRIAGE_API_PATH = "/api/public/triage";
  var EVENTS_API_PATH = "/api/public/events";
  /** Produção: triagem/eventos no portal; local: mesma origem quando host é localhost. */
  var PORTAL_API_ORIGIN_DEFAULT = "";

  function getPortalApiOrigin() {
    if (typeof window !== "undefined" && window.__ADV_PORTAL_ORIGIN__) {
      return String(window.__ADV_PORTAL_ORIGIN__).replace(/\/$/, "");
    }
    if (typeof window !== "undefined") {
      var host = window.location.hostname || "";
      if (host === "localhost" || host === "127.0.0.1") {
        return window.location.origin.replace(/\/$/, "");
      }
    }
    return PORTAL_API_ORIGIN_DEFAULT;
  }
  var SESSION_STORAGE_KEY = "site_product_session_id";
  var SESSION_FLAG_PREFIX = "site_product_flag:";
  var entryContext = window.EntryContext || {
    readFromSearch: function () {
      return {
        origem: "",
        tema: "",
        campanha: "",
        video: ""
      };
    },
    appendToHref: function (href) {
      return href;
    },
    toPayload: function () {
      return {};
    },
    hasAny: function () {
      return false;
    }
  };

  var AREAS = {
    geral: {
      label: "Atendimento geral",
      intro: "Ola, equipe da Noemia Paixao Advocacia. Quero iniciar a triagem do meu caso."
    },
    previdenciario: {
      label: "Direito Previdenciario",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma demanda previdenciaria e quero uma analise inicial."
    },
    "consumidor-bancario": {
      label: "Direito do Consumidor e Bancario",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma demanda de consumidor ou bancaria e quero uma analise inicial."
    },
    consumidor: {
      label: "Direito do Consumidor",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma questao de consumo e quero uma analise inicial."
    },
    bancario: {
      label: "Direito Bancario",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma questao bancaria e quero uma analise inicial."
    },
    familia: {
      label: "Direito de Familia",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma demanda de familia e quero uma analise inicial."
    },
    civil: {
      label: "Direito Civil",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma demanda civel e quero uma analise inicial."
    },
    outro: {
      label: "Outro assunto juridico",
      intro:
        "Ola, equipe da Noemia Paixao Advocacia. Tenho uma demanda juridica e quero uma analise inicial."
    }
  };

  var THEME_TO_AREA = {
    aposentadoria: "previdenciario",
    previdenciario: "previdenciario",
    banco: "bancario",
    bancario: "bancario",
    consumidor: "consumidor",
    "consumidor-bancario": "consumidor-bancario",
    familia: "familia",
    civil: "civil"
  };

  var PAGE_MAP = {
    "index.html": { mode: "triage", area: "geral", source: "home" },
    "blog.html": { mode: "triage", area: "geral", source: "blog" },
    "direito-previdenciario.html": {
      mode: "triage",
      area: "previdenciario",
      source: "area-previdenciario",
      theme: "previdenciario"
    },
    "direito-consumidor-bancario.html": {
      mode: "triage",
      area: "consumidor-bancario",
      source: "area-consumidor-bancario",
      theme: "consumidor-bancario"
    },
    "direito-familia.html": {
      mode: "triage",
      area: "familia",
      source: "area-familia",
      theme: "familia"
    },
    "direito-civil.html": {
      mode: "triage",
      area: "civil",
      source: "area-civil",
      theme: "civil"
    },
    "triagem.html": {
      mode: "support",
      source: "triagem",
      message: "Ola, estou preenchendo a triagem inicial e preciso de ajuda."
    },
    "artigos/aposentadoria-negada-inss.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-aposentadoria-negada",
      theme: "aposentadoria"
    },
    "artigos/contrato-descumprido.html": {
      mode: "triage",
      area: "civil",
      source: "artigo-contrato-descumprido",
      theme: "civil"
    },
    "artigos/desconto-indevido-conta.html": {
      mode: "triage",
      area: "bancario",
      source: "artigo-desconto-conta",
      theme: "banco"
    },
    "artigos/desconto-indevido-inss.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-desconto-inss",
      theme: "previdenciario"
    },
    "artigos/divorcio-primeiros-passos.html": {
      mode: "triage",
      area: "familia",
      source: "artigo-divorcio",
      theme: "familia"
    },
    "artigos/emprestimo-consignado-indevido.html": {
      mode: "triage",
      area: "bancario",
      source: "artigo-consignado",
      theme: "banco"
    },
    "artigos/nome-negativado-indevidamente.html": {
      mode: "triage",
      area: "consumidor",
      source: "artigo-negativacao",
      theme: "consumidor"
    },
    "artigos/revisao-aposentadoria-2026.html": {
      mode: "triage",
      area: "previdenciario",
      source: "artigo-revisao-aposentadoria",
      theme: "aposentadoria"
    },
    "artigos/revisao-pensao-alimenticia.html": {
      mode: "triage",
      area: "familia",
      source: "artigo-revisao-pensao",
      theme: "familia"
    },
  };

  function createSessionId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return "session-" + Date.now();
  }

  function getProductSessionId() {
    try {
      var storedId = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (storedId) {
        return storedId;
      }

      var nextId = createSessionId();
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
      return nextId;
    } catch (error) {
      return createSessionId();
    }
  }

  function buildApiUrl(path) {
    return new URL(path, getPortalApiOrigin()).toString();
  }

  function trackEvent(input) {
    if (!input || !input.eventKey) {
      return;
    }

    var body = JSON.stringify({
      eventKey: input.eventKey,
      eventGroup: input.eventGroup || "conversion",
      pagePath: input.pagePath || window.location.pathname || "/",
      sessionId: input.sessionId || getProductSessionId(),
      intakeRequestId: input.intakeRequestId || undefined,
      payload: input.payload || {}
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        buildApiUrl(EVENTS_API_PATH),
        new Blob([body], { type: "application/json" })
      );
      return;
    }

    void fetch(buildApiUrl(EVENTS_API_PATH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: body
    }).catch(function () {
      return undefined;
    });
  }

  function trackEventOncePerSession(input) {
    var flagKey = SESSION_FLAG_PREFIX + input.eventKey;

    try {
      if (window.sessionStorage.getItem(flagKey)) {
        return;
      }

      window.sessionStorage.setItem(flagKey, "1");
    } catch (error) {
      // Continue and track even if sessionStorage is unavailable.
    }

    trackEvent(input);
  }

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

    if (path === "entrada" || path === "entrada/") {
      return "entrada/index.html";
    }

    if (path.indexOf(".") === -1 && path.charAt(path.length - 1) !== "/") {
      path += "/";
    }

    if (path.charAt(path.length - 1) === "/") {
      path += "index.html";
    }

    var match = path.match(
      /(index\.html|blog\.html|triagem\.html|entrada\/index\.html|artigos\/[^/]+\.html|portal\/[^/]+\.html)$/
    );

    return match ? match[1] : path;
  }

  function getPageKey() {
    return normalizePageKey(window.location.pathname);
  }

  function getPrefix() {
    var key = getPageKey();

    if (key.indexOf("artigos/") === 0 || key.indexOf("portal/") === 0 || key.indexOf("entrada/") === 0) {
      return "../";
    }

    return "";
  }

  function getConfig() {
    var key = getPageKey();
    return PAGE_MAP[key] || { mode: "triage", area: "geral", source: key.replace(".html", "") };
  }

  function normalizeExternalReferrer(referrer) {
    try {
      var parsed = new URL(referrer, window.location.origin);

      if (parsed.origin !== window.location.origin) {
        return "";
      }

      return normalizePageKey(parsed.pathname);
    } catch (error) {
      return "";
    }
  }

  function getThemeArea(theme) {
    return THEME_TO_AREA[(theme || "").toLowerCase().trim()] || "";
  }

  function getCurrentEntryContext(defaults, aliases) {
    return entryContext.readFromSearch(window.location.search, {
      defaults: defaults || {},
      aliases: aliases || {}
    });
  }

  function buildTriageHref(config) {
    var params = new URLSearchParams();
    var theme = config.theme || "";
    var context = getCurrentEntryContext(
      {
        origem: config.source || "site",
        tema: theme
      },
      {
        tema: ["tema", "theme", "area"]
      }
    );
    var themeArea = getThemeArea(context.tema || theme);

    params.set("area", themeArea || config.area || getThemeArea(theme) || "geral");
    params.set("origem", context.origem || config.source || "site");
    params.set("page", getPageKey());

    if (context.tema || theme) {
      params.set("tema", context.tema || theme);
    }

    return entryContext.appendToHref(getPrefix() + "triagem.html?" + params.toString(), context, {
      overwrite: true
    });
  }

  function buildSupportHref(config) {
    var message = config.message || "Ola, preciso de orientacao da equipe.";
    return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(message);
  }

  function getUpdatedLabel(label) {
    if (/whatsapp$/i.test(label) && label.length <= 18) {
      return "Triagem no WhatsApp";
    }

    if (/falar no whatsapp|falar com a equipe/i.test(label)) {
      return "Enviar caso para triagem";
    }

    if (/solicitar analise inicial|agendar analise inicial/i.test(label)) {
      return "Iniciar triagem inicial";
    }

    if (/tirar uma duvida inicial/i.test(label)) {
      return "Enviar informacoes do caso";
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

  function decorateEntryLinks(config) {
    var context = getCurrentEntryContext(
      {
        origem: config.source || "site",
        tema: config.theme || ""
      },
      {
        tema: ["tema", "theme", "area"]
      }
    );

    if (!entryContext.hasAny(context)) {
      return;
    }

    document
      .querySelectorAll(
        'a[href*="triagem.html"], a[href^="/triagem"], a[href*="entrada/index.html"], a[href*="portal/login"], a[href*="portal/painel-cliente"], a[href*="portal/documentos"], a[href*="portal/agenda"], a[href^="/cliente"], a[href^="/documentos"], a[href^="/agenda"]'
      )
      .forEach(function (link) {
        var href = link.getAttribute("href");
        var themedArea = getThemeArea(context.tema);

        if (!href || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) {
          return;
        }

        var nextHref = entryContext.appendToHref(href, context, {
          overwrite: true
        });

        if (themedArea) {
          try {
            var url = new URL(nextHref, window.location.origin);

            if (url.pathname.indexOf("triagem") !== -1) {
              url.searchParams.set("area", themedArea);
              nextHref = url.pathname + url.search + url.hash;
            }
          } catch (error) {
            // Se a URL nao puder ser reinterpretada, mantemos o href ja montado.
          }
        }

        link.setAttribute("href", nextHref);
      });
  }

  function ensureWidgets(config) {
    if (getPageKey() === "entrada/index.html") {
      return;
    }

    var href = config.mode === "triage" ? buildTriageHref(config) : buildSupportHref(config);
    var floatingLabel = "WhatsApp";
    var mobileLabel =
      config.mode === "triage" ? "Iniciar triagem no WhatsApp" : "Falar com a equipe no WhatsApp";
    var floatingContactAria =
      "Falar com a especialista — abrir triagem para contato pelo WhatsApp";

    var existingFloat = document.querySelector(
      ".whatsapp-float, .floating-contact, .contact-floating-widget"
    );

    if (existingFloat) {
      existingFloat.href = href;
      existingFloat.removeAttribute("target");
      existingFloat.removeAttribute("rel");

      if (existingFloat.classList.contains("floating-contact")) {
        existingFloat.setAttribute("aria-label", floatingContactAria);
      } else {
        existingFloat.setAttribute("aria-label", mobileLabel);
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

    var existingMobileLink = document.querySelector(
      ".mobile-cta-bar a, .contact-mobile-widget a"
    );

    if (existingMobileLink) {
      existingMobileLink.href = href;
      existingMobileLink.textContent = mobileLabel;
      existingMobileLink.removeAttribute("target");
      existingMobileLink.removeAttribute("rel");
    } else {
      var mobileWrap = document.createElement("div");
      mobileWrap.className = "contact-mobile-widget";
      mobileWrap.innerHTML =
        '<a class="contact-mobile-link" href="' + href + '">' + mobileLabel + "</a>";
      document.body.appendChild(mobileWrap);
    }

    document.body.classList.add("has-mobile-contact");
  }

  function getTriageContext(config) {
    var params = new URLSearchParams(window.location.search);
    var queryContext = getCurrentEntryContext(
      {
        origem: config.source || "site"
      },
      {
        tema: ["tema", "theme", "area"]
      }
    );
    var theme = queryContext.tema || "";
    var area =
      (params.get("area") || getThemeArea(theme) || config.area || "geral").toLowerCase().trim();
    var source = queryContext.origem || (config.source || "site").toLowerCase().trim();
    var page = (params.get("page") || params.get("pagina") || "").trim();
    var referrerPage = normalizeExternalReferrer(document.referrer || "");

    if (!page) {
      page = referrerPage || getPageKey();
    }

    return {
      area: area || "geral",
      source: source || "site",
      page: page || "triagem.html",
      theme: theme,
      campaign: queryContext.campanha || "",
      video: queryContext.video || "",
      sourcePath: (window.location.pathname || "/triagem.html") + (window.location.search || "")
    };
  }

  function setStatus(statusElement, tone, message) {
    if (!statusElement) {
      return;
    }

    statusElement.className = "form-status" + (tone ? " is-" + tone : "");
    statusElement.textContent = message || "";
  }

  function collectTriageValues(form) {
    var problemTypeSelect = form.elements["problem_type"];
    var urgencySelect = form.elements["urgency"];
    var problemTypeOption =
      problemTypeSelect && problemTypeSelect.options
        ? problemTypeSelect.options[problemTypeSelect.selectedIndex]
        : null;
    var urgencyOption =
      urgencySelect && urgencySelect.options
        ? urgencySelect.options[urgencySelect.selectedIndex]
        : null;

    return {
      name: (form.elements["name"] && form.elements["name"].value || "").trim(),
      phone: (form.elements["phone"] && form.elements["phone"].value || "").trim(),
      city: (form.elements["city"] && form.elements["city"].value || "").trim(),
      problemTypeValue: (problemTypeSelect && problemTypeSelect.value || "").trim(),
      problemTypeLabel: problemTypeOption ? problemTypeOption.textContent.trim() : "",
      description: (form.elements["description"] && form.elements["description"].value || "").trim(),
      urgencyValue: (urgencySelect && urgencySelect.value || "").trim(),
      urgencyLabel: urgencyOption ? urgencyOption.textContent.trim() : "",
      area: (form.elements["area"] && form.elements["area"].value || "geral").trim(),
      source: (form.elements["source"] && form.elements["source"].value || "site").trim(),
      page: (form.elements["page"] && form.elements["page"].value || "triagem.html").trim(),
      campaign: (form.elements["campaign"] && form.elements["campaign"].value || "").trim(),
      video: (form.elements["video"] && form.elements["video"].value || "").trim()
    };
  }

  function validateTriageValues(values) {
    if (!values.name || values.name.length < 3) {
      return "Informe seu nome completo para solicitar a análise jurídica.";
    }

    // Validação de telefone brasileiro mais precisa
    const phoneClean = values.phone.replace(/\D/g, "");
    if (phoneClean.length < 10 || phoneClean.length > 11) {
      return "Informe um telefone válido com DDD (ex: (84) 99999-9999).";
    }

    if (phoneClean.length === 10) {
      // Celular com 9 dígitos é obrigatório
      const firstDigit = phoneClean[2];
      if (firstDigit !== '9' && firstDigit !== '8' && firstDigit !== '7') {
        return "Para celular, informe o número completo com o 9º dígito.";
      }
    }

    if (!values.city || values.city.length < 2) {
      return "Informe sua cidade para contextualizar melhor o atendimento jurídico.";
    }

    if (!values.problemTypeValue) {
      return "Selecione o tipo de caso jurídico antes de continuar.";
    }

    if (!values.urgencyValue) {
      return "Selecione o nível de urgência do seu caso.";
    }

    if (!values.description || values.description.length < 20) {
      return "Descreva seu caso em pelo menos 20 caracteres para análise adequada.";
    }

    if (values.description.length > 2000) {
      return "A descrição deve ter no máximo 2000 caracteres. Seja mais conciso.";
    }

    return "";
  }

  function buildWhatsAppMessage(values, context) {
    var areaConfig = AREAS[values.problemTypeValue] || AREAS[values.area] || AREAS.geral;
    var contextLines = [
      "*Contexto do caso*",
      "- Area sugerida: " + (values.problemTypeLabel || areaConfig.label),
      "- Urgencia: " + values.urgencyLabel,
      "- Origem: " + values.source,
      "- Pagina: " + values.page
    ];

    if (context.theme) {
      contextLines.splice(3, 0, "- Tema: " + context.theme);
    }

    if (context.campaign) {
      contextLines.push("- Campanha: " + context.campaign);
    }

    if (context.video) {
      contextLines.push("- Video: " + context.video);
    }

    return [
      areaConfig.intro,
      "",
      "*Dados iniciais*",
      "- Nome: " + values.name,
      "- Telefone: " + values.phone,
      "- Cidade: " + values.city,
      "",
      contextLines.join("\n"),
      "",
      "*Resumo do problema*",
      values.description,
      "",
      "Fico no aguardo das orientacoes sobre os proximos passos."
    ].join("\n");
  }

  function setupTriageForm() {
    var form = document.querySelector("[data-triage-form]");

    if (!form) {
      return;
    }

    var config = getConfig();
    var context = getTriageContext(config);
    var submitButton = document.getElementById("submitButton");
    var statusElement = document.querySelector("[data-triage-status]");
    var areaInput = document.querySelector("[data-triage-area-input]");
    var sourceInput = document.querySelector("[data-triage-source-input]");
    var pageInput = document.querySelector("[data-triage-page-input]");
    var campaignInput = document.querySelector("[data-triage-campaign-input]");
    var videoInput = document.querySelector("[data-triage-video-input]");
    var problemTypeSelect = document.getElementById("leadProblemType");
    var defaultButtonLabel = submitButton ? submitButton.textContent : "Enviar triagem para o WhatsApp";
    var hasTrackedStart = false;

    if (areaInput) {
      areaInput.value = context.area;
    }

    if (sourceInput) {
      sourceInput.value = context.source;
    }

    if (pageInput) {
      pageInput.value = context.page;
    }

    if (campaignInput) {
      campaignInput.value = context.campaign;
    }

    if (videoInput) {
      videoInput.value = context.video;
    }

    if (
      problemTypeSelect &&
      context.area &&
      problemTypeSelect.querySelector('option[value="' + context.area + '"]')
    ) {
      problemTypeSelect.value = context.area;
    }

    function markStarted() {
      if (hasTrackedStart) {
        return;
      }

      hasTrackedStart = true;
      trackEventOncePerSession({
        eventKey: "triage_started",
        eventGroup: "conversion",
        pagePath: context.sourcePath,
        payload: {
          source: context.source,
          page: context.page,
          theme: context.theme || "",
          campaign: context.campaign || "",
          video: context.video || "",
          mode: "static_site_triage"
        }
      });
    }

    form.addEventListener(
      "focusin",
      function () {
        markStarted();
      },
      { once: true }
    );

    form.addEventListener(
      "input",
      function () {
        markStarted();
      },
      { once: true }
    );

    // Validação em tempo real
    form.addEventListener("input", function(event) {
      const field = event.target;
      const fieldName = field.name;
      const fieldValue = field.value.trim();
      
      // Remove mensagens de erro anteriores
      field.classList.remove("is-invalid");
      
      // Validação específica por campo
      if (fieldName === "name" && fieldValue.length > 0) {
        if (fieldValue.length < 3) {
          field.classList.add("is-invalid");
          showFieldError(field, "Nome deve ter pelo menos 3 caracteres");
        } else {
          clearFieldError(field);
        }
      }
      
      if (fieldName === "phone" && fieldValue.length > 0) {
        const phoneClean = fieldValue.replace(/\D/g, "");
        if (phoneClean.length < 10 || phoneClean.length > 11) {
          field.classList.add("is-invalid");
          showFieldError(field, "Telefone inválido");
        } else {
          clearFieldError(field);
        }
      }
      
      if (fieldName === "city" && fieldValue.length > 0) {
        if (fieldValue.length < 2) {
          field.classList.add("is-invalid");
          showFieldError(field, "Cidade muito curta");
        } else {
          clearFieldError(field);
        }
      }
      
      if (fieldName === "description" && fieldValue.length > 0) {
        if (fieldValue.length < 20) {
          field.classList.add("is-invalid");
          showFieldError(field, "Descreva com mais detalhes (mínimo 20 caracteres)");
        } else if (fieldValue.length > 2000) {
          field.classList.add("is-invalid");
          showFieldError(field, "Muito longo (máximo 2000 caracteres)");
        } else {
          clearFieldError(field);
        }
      }
    });

    function showFieldError(field, message) {
      clearFieldError(field);
      field.style.borderColor = "#dc3545";
      field.style.boxShadow = "0 0 0 0.2rem rgba(220, 53, 69, 0.25)";
      
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        font-weight: 500;
      `;
      errorDiv.textContent = message;
      
      field.parentNode.appendChild(errorDiv);
    }
    
    function clearFieldError(field) {
      field.style.borderColor = "";
      field.style.boxShadow = "";
      const existingError = field.parentNode.querySelector(".field-error");
      if (existingError) {
        existingError.remove();
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var values = collectTriageValues(form);
      var validationError = validateTriageValues(values);

      if (validationError) {
        setStatus(statusElement, "error", validationError);
        trackEvent({
          eventKey: "triage_submit_failed",
          eventGroup: "error",
          pagePath: context.sourcePath,
          payload: {
            reason: "validation",
            source: context.source,
            page: context.page,
            campaign: context.campaign || "",
            video: context.video || ""
          }
        });
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Analisando seu caso...";
        submitButton.style.background = "linear-gradient(90deg, #b58d49 0%, #8b6f3a 100%)";
        submitButton.style.transform = "scale(0.98)";
      }

      setStatus(
        statusElement,
        "loading",
        "🔍 Analisando as informações do seu caso..."
      );

      fetch(buildApiUrl(TRIAGE_API_PATH), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-product-session-id": getProductSessionId()
        },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          city: values.city,
          problem_type: values.problemTypeValue,
          description: values.description,
          urgency: values.urgencyValue,
          area: values.area,
          source: values.source,
          page: values.page,
          theme: context.theme,
          campaign: values.campaign || context.campaign,
          video: values.video || context.video,
          sourcePath: context.sourcePath
        })
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (result) {
              return {
                ok: response.ok,
                result: result
              };
            });
        })
        .then(function (payload) {
          // Se a API falhar, mas os dados estiverem válidos, prosseguir para WhatsApp
          if (!payload.ok || !payload.result || !payload.result.ok) {
            console.warn("API falhou, mas prosseguindo para WhatsApp:", payload);
            
            setStatus(statusElement, "success", "✅ Análise concluída! Redirecionando para o WhatsApp...");

            if (submitButton) {
              submitButton.textContent = "Abrindo WhatsApp...";
              submitButton.style.background = "linear-gradient(90deg, #28a745 0%, #20c997 100%)";
            }

            var whatsappUrl =
              "https://wa.me/" +
              PHONE +
              "?text=" +
              encodeURIComponent(buildWhatsAppMessage(values, context));

            trackEvent({
              eventKey: "whatsapp_opened",
              eventGroup: "conversion",
              pagePath: context.sourcePath,
              intakeRequestId: "fallback-" + Date.now(),
              payload: {
                source: context.source,
                page: context.page,
                theme: context.theme || "",
                campaign: context.campaign || "",
                video: context.video || "",
                problemType: values.problemTypeValue,
                urgency: values.urgencyValue,
                fallback: true
              }
            });

            window.setTimeout(function () {
              try {
                window.location.href = whatsappUrl;
              } catch (e) {
                window.open(whatsappUrl, '_blank');
              }
            }, 800);

            return;
          }

          setStatus(statusElement, "success", "✅ Análise concluída! Redirecionando para o WhatsApp...");

          if (submitButton) {
            submitButton.textContent = "Abrindo WhatsApp...";
            submitButton.style.background = "linear-gradient(90deg, #28a745 0%, #20c997 100%)";
          }

          var whatsappUrl =
            "https://wa.me/" +
            PHONE +
            "?text=" +
            encodeURIComponent(buildWhatsAppMessage(values, context));

          trackEvent({
            eventKey: "whatsapp_opened",
            eventGroup: "conversion",
            pagePath: context.sourcePath,
            intakeRequestId: payload.result.intakeRequestId,
            payload: {
              source: context.source,
              page: context.page,
              theme: context.theme || "",
              campaign: context.campaign || "",
              video: context.video || "",
              problemType: values.problemTypeValue,
              urgency: values.urgencyValue
            }
          });

          window.setTimeout(function () {
            // Garante redirecionamento mesmo se falhar o método assign
            try {
              window.location.href = whatsappUrl;
            } catch (e) {
              window.open(whatsappUrl, '_blank');
            }
          }, 800); // Aumentado para 800ms para melhor UX
        })
        .catch(function () {
          setStatus(
            statusElement,
            "error",
            "❌ Não foi possível analisar seu caso agora. Verifique sua conexão e tente novamente."
          );

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.textContent = defaultButtonLabel;
            submitButton.style.background = "";
            submitButton.style.transform = "";
          }

          trackEvent({
            eventKey: "triage_submit_failed",
            eventGroup: "error",
            pagePath: context.sourcePath,
            payload: {
              reason: "network",
              source: context.source,
              page: context.page,
              theme: context.theme || "",
              campaign: context.campaign || "",
              video: context.video || ""
            }
          });
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var config = getConfig();

    decorateEntryLinks(config);
    updatePublicWhatsAppLinks(config);
    ensureWidgets(config);
    setupTriageForm();
  });
})();
