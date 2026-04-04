(function () {
  var PHONE = "5584996248241";
  var PROJECT_MARKER = "/advnoemiasite/";
  var TRIAGE_API_PATH = "/api/public/triage";
  var EVENTS_API_PATH = "/api/public/events";
  var SESSION_STORAGE_KEY = "site_product_session_id";
  var SESSION_FLAG_PREFIX = "site_product_flag:";

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
    "portal/login.html": {
      mode: "support",
      source: "portal-login",
      message: "Ola, estou na area reservada e preciso de apoio no acesso."
    },
    "portal/painel-advogada.html": {
      mode: "support",
      source: "portal-advogada",
      message: "Ola, estou na area interna e preciso de apoio da equipe."
    },
    "portal/painel-cliente.html": {
      mode: "support",
      source: "portal-cliente",
      message: "Ola, estou na area do cliente e preciso de orientacao."
    },
    "portal/documentos.html": {
      mode: "support",
      source: "portal-documentos",
      message: "Ola, estou na area de documentos e preciso de orientacao."
    },
    "portal/agenda.html": {
      mode: "support",
      source: "portal-agenda",
      message: "Ola, estou na area de agenda e preciso de orientacao."
    }
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
    return new URL(path, window.location.origin).toString();
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

  function buildTriageHref(config) {
    var params = new URLSearchParams();
    var theme = config.theme || "";

    params.set("area", config.area || getThemeArea(theme) || "geral");
    params.set("origem", config.source || "site");
    params.set("page", getPageKey());

    if (theme) {
      params.set("tema", theme);
    }

    return getPrefix() + "triagem.html?" + params.toString();
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

  function ensureWidgets(config) {
    if (getPageKey() === "entrada/index.html") {
      return;
    }

    var href = config.mode === "triage" ? buildTriageHref(config) : buildSupportHref(config);
    var floatingLabel = "WhatsApp";
    var mobileLabel =
      config.mode === "triage" ? "Iniciar triagem no WhatsApp" : "Falar com a equipe no WhatsApp";

    var existingFloat = document.querySelector(
      ".whatsapp-float, .floating-contact, .contact-floating-widget"
    );

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
    var theme = (params.get("tema") || params.get("theme") || "").toLowerCase().trim();
    var area =
      (params.get("area") || getThemeArea(theme) || config.area || "geral").toLowerCase().trim();
    var source =
      (params.get("origem") || params.get("source") || config.source || "site")
        .toLowerCase()
        .trim();
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
      sourcePath: window.location.pathname || "/triagem.html"
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
      page: (form.elements["page"] && form.elements["page"].value || "triagem.html").trim()
    };
  }

  function validateTriageValues(values) {
    if (!values.name || values.name.length < 3) {
      return "Informe seu nome completo para enviar a triagem.";
    }

    if (values.phone.replace(/\D/g, "").length < 10) {
      return "Informe um telefone com DDD para contato.";
    }

    if (!values.city || values.city.length < 2) {
      return "Informe sua cidade para contextualizar melhor o atendimento.";
    }

    if (!values.problemTypeValue) {
      return "Selecione o tipo de problema antes de continuar.";
    }

    if (!values.urgencyValue) {
      return "Selecione a urgencia do caso antes de continuar.";
    }

    if (!values.description || values.description.length < 20) {
      return "Descreva em poucas linhas o que aconteceu para a equipe receber contexto suficiente.";
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
            page: context.page
          }
        });
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Salvando triagem...";
      }

      setStatus(
        statusElement,
        "loading",
        "Salvando sua triagem com seguranca antes de abrir o WhatsApp."
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
          if (!payload.ok || !payload.result || !payload.result.ok) {
            var errorMessage =
              typeof payload.result.error === "string" && payload.result.error
                ? payload.result.error
                : "Nao foi possivel salvar sua triagem agora. Tente novamente em instantes.";

            setStatus(statusElement, "error", errorMessage);

            if (submitButton) {
              submitButton.disabled = false;
              submitButton.removeAttribute("aria-busy");
              submitButton.textContent = defaultButtonLabel;
            }

            trackEvent({
              eventKey: "triage_submit_failed",
              eventGroup: "error",
              pagePath: context.sourcePath,
              payload: {
                reason: errorMessage,
                source: context.source,
                page: context.page,
                theme: context.theme || ""
              }
            });

            return;
          }

          setStatus(statusElement, "success", "Triagem salva com sucesso. Abrindo o WhatsApp...");

          if (submitButton) {
            submitButton.textContent = "Abrindo WhatsApp...";
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
              problemType: values.problemTypeValue,
              urgency: values.urgencyValue
            }
          });

          window.setTimeout(function () {
            window.location.assign(whatsappUrl);
          }, 120);
        })
        .catch(function () {
          setStatus(
            statusElement,
            "error",
            "Nao foi possivel salvar sua triagem agora. Verifique sua conexao e tente novamente."
          );

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.textContent = defaultButtonLabel;
          }

          trackEvent({
            eventKey: "triage_submit_failed",
            eventGroup: "error",
            pagePath: context.sourcePath,
            payload: {
              reason: "network",
              source: context.source,
              page: context.page,
              theme: context.theme || ""
            }
          });
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var config = getConfig();

    updatePublicWhatsAppLinks(config);
    ensureWidgets(config);
    setupTriageForm();
  });
})();
