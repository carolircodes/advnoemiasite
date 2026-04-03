(function (global) {
  var service = global.PortalService;
  var renderer = global.PortalRenderer;

  if (!service || !renderer) {
    return;
  }

  function setRole(role, roleInput, roleButtons) {
    var nextRole = role === "advogada" ? "advogada" : "cliente";

    if (roleInput) {
      roleInput.value = nextRole;
    }

    roleButtons.forEach(function (button) {
      var isSelected = button.getAttribute("data-portal-role-option") === nextRole;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
  }

  function bindLoginForm() {
    var form = document.querySelector("[data-portal-login-form]");

    if (!form) {
      return;
    }

    var roleInput = form.querySelector("[data-portal-role-input]");
    var roleButtons = Array.prototype.slice.call(form.querySelectorAll("[data-portal-role-option]"));
    var submit = form.querySelector("[data-portal-submit]");
    var status = document.querySelector("[data-portal-form-status]");
    var defaultSubmitLabel = submit ? submit.getAttribute("data-default-label") || submit.textContent : "";

    roleButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setRole(button.getAttribute("data-portal-role-option"), roleInput, roleButtons);
      });
    });

    setRole(roleInput ? roleInput.value : "cliente", roleInput, roleButtons);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Validando acesso...";
      }

      if (status) {
        status.textContent =
          roleInput && roleInput.value === "advogada"
            ? "Simulando autenticação do painel interno..."
            : "Simulando autenticação do cliente com login por e-mail...";
      }

      service
        .login({
          email: form.email ? form.email.value : "",
          password: form.password ? form.password.value : "",
          role: roleInput ? roleInput.value : "cliente"
        })
        .then(function (response) {
          if (status) {
            status.textContent =
              response.redirectTo === service.routes.painelAdvogada
                ? "Acesso interno validado. Redirecionando para o painel da advogada..."
                : "Acesso validado. Redirecionando para a área do cliente...";
          }

          window.location.href = response.redirectTo;
        })
        .catch(function () {
          if (status) {
            status.textContent = "Não foi possível processar o acesso agora. Tente novamente.";
          }

          if (submit) {
            submit.disabled = false;
            submit.textContent = defaultSubmitLabel || "Entrar na área do cliente";
          }
        });
    });
  }

  function bindPageInteractions() {
    bindLoginForm();

    if (global.PremiumSystem && typeof global.PremiumSystem.setupMenus === "function") {
      global.PremiumSystem.setupMenus();
    }
  }

  function boot() {
    var root = document.querySelector("[data-portal-root]");
    var pageId = document.body.getAttribute("data-portal-page");

    if (!root || !pageId) {
      return;
    }

    root.innerHTML = '<div class="portal-loading">Carregando estrutura do portal...</div>';

    service
      .getPageModel(pageId)
      .then(function (pageModel) {
        root.innerHTML = renderer.renderPage(pageModel);
        bindPageInteractions();
      })
      .catch(function () {
        root.innerHTML =
          '<div class="portal-loading">Não foi possível carregar esta página do portal agora. Verifique a configuração e tente novamente.</div>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
