(function (global) {
  var data = global.PortalData;

  if (!data) {
    return;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderStatusPill(status) {
    if (!status || !status.label) {
      return "";
    }

    var toneClass = status.tone ? " " + escapeHtml(status.tone) : "";
    return '<span class="status-pill' + toneClass + '">' + escapeHtml(status.label) + "</span>";
  }

  function renderButtons(actions) {
    if (!actions || !actions.length) {
      return "";
    }

    return (
      '<div class="dashboard-actions">' +
      actions
        .map(function (action) {
          var variant = action.variant === "primary" ? "btn-primary" : "btn-secondary";
          return (
            '<a class="btn ' +
            variant +
            '" href="' +
            escapeHtml(action.href) +
            '">' +
            escapeHtml(action.label) +
            "</a>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderTopbar(topbar) {
    return (
      '<div class="topbar"><div class="container topbar-inner"><span>' +
      escapeHtml(topbar.message) +
      '</span><div class="pill-row">' +
      topbar.pills
        .map(function (pill) {
          return "<span>" + escapeHtml(pill) + "</span>";
        })
        .join("") +
      "</div></div></div>"
    );
  }

  function renderBrand(href, smallLabel) {
    return (
      '<a class="brand" href="' +
      escapeHtml(href) +
      '" aria-label="Página inicial">' +
      '<div class="brand-mark"><img src="../logo.png" alt="Logo ' +
      escapeHtml(data.office.name) +
      '" /></div>' +
      '<div class="brand-copy"><strong>' +
      escapeHtml(data.office.name) +
      "</strong><small>" +
      escapeHtml(smallLabel) +
      "</small></div></a>"
    );
  }

  function renderHeaderNav(items) {
    return items
      .map(function (item) {
        return (
          '<a href="' +
          escapeHtml(item.href) +
          '"' +
          (item.active ? ' class="is-active"' : "") +
          ">" +
          escapeHtml(item.label) +
          "</a>"
        );
      })
      .join("");
  }

  function renderPortalHeader(header) {
    return (
      '<header class="header"><div class="container header-inner">' +
      renderBrand(header.brandHref, header.brandSmall) +
      '<button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menu" aria-expanded="false" aria-controls="portalMenu"><span></span></button>' +
      '<nav class="nav-menu" id="portalMenu">' +
      renderHeaderNav(header.nav) +
      "</nav>" +
      '<div class="nav-actions">' +
      header.actions
        .map(function (action) {
          var variant = action.variant === "primary" ? "btn-primary" : "btn-secondary";
          return '<a class="btn ' + variant + '" href="' + escapeHtml(action.href) + '">' + escapeHtml(action.label) + "</a>";
        })
        .join("") +
      "</div></div></header>"
    );
  }

  function renderSidebar(sidebar) {
    return (
      '<aside class="app-sidebar"><div class="sidebar-head">' +
      renderBrand(sidebar.brandHref, sidebar.brandSmall) +
      '<div class="sidebar-user"><strong>' +
      escapeHtml(sidebar.userName) +
      "</strong><span>" +
      escapeHtml(sidebar.userSummary) +
      '</span><div class="portal-sidebar-caption"><span class="portal-inline-status">Pronto para integração com sessão, dados e permissões.</span></div></div></div>' +
      '<nav class="sidebar-nav">' +
      sidebar.nav
        .map(function (item) {
          return (
            '<a href="' +
            escapeHtml(item.href) +
            '"' +
            (item.active ? ' class="is-active"' : "") +
            ">" +
            "<span>" +
            escapeHtml(item.label) +
            "</span><span>" +
            escapeHtml(item.badge) +
            "</span></a>"
          );
        })
        .join("") +
      '</nav><div class="sidebar-foot"><a class="btn ' +
      (sidebar.footerAction.variant === "primary" ? "btn-primary" : "btn-secondary") +
      ' btn-full" href="' +
      escapeHtml(sidebar.footerAction.href) +
      '">' +
      escapeHtml(sidebar.footerAction.label) +
      "</a></div>" +
      (sidebar.caption ? '<p class="portal-sidebar-caption">' + escapeHtml(sidebar.caption) + "</p>" : "") +
      "</aside>"
    );
  }

  function renderAppHeader(header) {
    return (
      '<section class="app-topbar"><div class="app-page-title"><span class="eyebrow">' +
      escapeHtml(header.eyebrow) +
      "</span><h1>" +
      escapeHtml(header.title) +
      "</h1><p>" +
      escapeHtml(header.description) +
      '</p></div><div class="app-stack"><div class="subnav">' +
      header.subnav
        .map(function (item) {
          return (
            '<a href="' +
            escapeHtml(item.href) +
            '"' +
            (item.active ? ' class="is-active"' : "") +
            ">" +
            escapeHtml(item.label) +
            "</a>"
          );
        })
        .join("") +
      "</div>" +
      renderButtons(header.actions) +
      "</div></section>"
    );
  }

  function renderMetrics(metrics) {
    return (
      '<section class="metric-grid">' +
      metrics
        .map(function (metric) {
          return (
            '<article class="metric-card"><strong>' +
            escapeHtml(metric.title) +
            "</strong><p>" +
            escapeHtml(metric.description) +
            "</p></article>"
          );
        })
        .join("") +
      "</section>"
    );
  }

  function renderRows(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum registro disponível neste momento.</div>';
    }

    return (
      '<div class="' +
      escapeHtml(body.listClass || "timeline-list") +
      '">' +
      body.items
        .map(function (item) {
          return (
            '<div class="' +
            escapeHtml(body.rowClass || "timeline-row") +
            '"><div><strong>' +
            escapeHtml(item.title) +
            "</strong><span>" +
            escapeHtml(item.description) +
            "</span></div>" +
            renderStatusPill(item.status) +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderTimeline(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum item disponível neste momento.</div>';
    }

    return (
      '<div class="timeline">' +
      body.items
        .map(function (item) {
          return (
            '<article class="timeline-item"><strong>' +
            escapeHtml(item.title) +
            "</strong><p>" +
            escapeHtml(item.description) +
            "</p></article>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderStackGrid(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum bloco disponível neste momento.</div>';
    }

    return (
      '<div class="' +
      escapeHtml(body.gridClass || "mini-grid") +
      '">' +
      body.items
        .map(function (item) {
          return (
            '<div class="stack-card"><strong>' +
            escapeHtml(item.title) +
            "</strong><p>" +
            escapeHtml(item.description) +
            "</p>" +
            (item.tags && item.tags.length
              ? '<div class="portal-tag-list">' +
                item.tags
                  .map(function (tag) {
                    return '<span class="portal-tag">' + escapeHtml(tag) + "</span>";
                  })
                  .join("") +
                "</div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderChecklist(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum checklist disponível neste momento.</div>';
    }

    return (
      '<div class="check-list">' +
      body.items
        .map(function (item) {
          return (
            '<div class="check-row"><div><strong>' +
            escapeHtml(item.title) +
            "</strong><span>" +
            escapeHtml(item.description) +
            "</span></div>" +
            renderStatusPill(item.status) +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderWeekGrid(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum compromisso disponível nesta semana.</div>';
    }

    return (
      '<div class="week-grid">' +
      body.items
        .map(function (item) {
          return (
            '<div class="day-card"><strong>' +
            escapeHtml(item.day) +
            "</strong>" +
            item.slots
              .map(function (slot) {
                return '<span class="slot-chip">' + escapeHtml(slot) + "</span>";
              })
              .join("") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderKeyList(body) {
    if (!body.items || !body.items.length) {
      return '<div class="portal-empty-note">Nenhum item técnico disponível neste momento.</div>';
    }

    return (
      '<div class="portal-key-list">' +
      body.items
        .map(function (item) {
          return (
            '<div class="portal-key-row"><div class="portal-key-copy"><strong>' +
            escapeHtml(item.key) +
            '</strong></div><span class="portal-key-value">' +
            escapeHtml(item.value) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderBody(body) {
    if (!body) {
      return "";
    }

    if (body.kind === "rows") {
      return renderRows(body);
    }

    if (body.kind === "timeline") {
      return renderTimeline(body);
    }

    if (body.kind === "stack-grid") {
      return renderStackGrid(body);
    }

    if (body.kind === "checklist") {
      return renderChecklist(body);
    }

    if (body.kind === "week-grid") {
      return renderWeekGrid(body);
    }

    if (body.kind === "key-list") {
      return renderKeyList(body);
    }

    return '<div class="portal-empty-note">Componente ainda não mapeado.</div>';
  }

  function renderCard(card) {
    var headingTag = card.variant === "document-card" || card.variant === "status-card" ? "h3" : "h2";
    var eyebrow = card.eyebrow ? '<span class="eyebrow">' + escapeHtml(card.eyebrow) + "</span>" : "";
    var title = card.title ? "<" + headingTag + ">" + escapeHtml(card.title) + "</" + headingTag + ">" : "";
    var action = card.action
      ? '<a class="btn ' +
        (card.action.variant === "primary" ? "btn-primary" : "btn-secondary") +
        '" href="' +
        escapeHtml(card.action.href) +
        '">' +
        escapeHtml(card.action.label) +
        "</a>"
      : "";

    return (
      '<article class="' +
      escapeHtml(card.variant || "app-card") +
      '">' +
      (eyebrow || title || action
        ? '<div class="app-card-header"><div>' + eyebrow + title + "</div>" + action + "</div>"
        : "") +
      renderBody(card.body) +
      (card.footerActions && card.footerActions.length ? renderButtons(card.footerActions) : "") +
      "</article>"
    );
  }

  function renderLogin(page) {
    return (
      renderTopbar(page.topbar) +
      renderPortalHeader(page.header) +
      '<main class="login-main"><div class="container login-layout">' +
      '<section class="login-side"><span class="eyebrow">' +
      escapeHtml(page.intro.eyebrow) +
      "</span><h1>" +
      escapeHtml(page.intro.title) +
      '</h1><p class="body-copy">' +
      escapeHtml(page.intro.description) +
      "</p>" +
      renderTimeline({ kind: "timeline", items: page.intro.timeline }) +
      '<div class="quick-access">' +
      page.intro.quickAccess
        .map(function (action) {
          return '<a class="btn btn-secondary" href="' + escapeHtml(action.href) + '">' + escapeHtml(action.label) + "</a>";
        })
        .join("") +
      "</div></section>" +
      '<section class="login-panel"><span class="eyebrow">' +
      escapeHtml(page.form.eyebrow) +
      "</span><h1>" +
      escapeHtml(page.form.title) +
      '</h1><p class="body-copy">' +
      escapeHtml(page.form.description) +
      '</p><form class="login-form" data-portal-login-form>' +
      '<div class="portal-field-row">' +
      '<div class="field-group"><label for="portalEmail">E-mail</label><input id="portalEmail" name="email" type="email" placeholder="seuemail@dominio.com" autocomplete="username" /></div>' +
      '<div class="field-group"><label for="portalPassword">Senha</label><input id="portalPassword" name="password" type="password" placeholder="Sua senha" autocomplete="current-password" /></div>' +
      "</div>" +
      '<input type="hidden" name="role" value="' +
      escapeHtml(page.form.selectedRole) +
      '" data-portal-role-input />' +
      '<div class="field-group"><label>Escolha o perfil</label><div class="role-switch">' +
      page.form.roles
        .map(function (role) {
          var isSelected = role.id === page.form.selectedRole;
          return (
            '<button class="role-card' +
            (isSelected ? " is-selected" : "") +
            '" type="button" data-portal-role-option="' +
            escapeHtml(role.id) +
            '" aria-pressed="' +
            (isSelected ? "true" : "false") +
            '"><strong>' +
            escapeHtml(role.title) +
            "</strong><p>" +
            escapeHtml(role.description) +
            "</p></button>"
          );
        })
        .join("") +
      '</div></div><button class="btn btn-primary btn-full" type="submit" data-portal-submit>' +
      escapeHtml(page.form.submitLabel) +
      '</button></form><p class="mini-note" data-portal-form-status>' +
      escapeHtml(page.form.note) +
      '</p><div class="portal-form-note"><strong>' +
      escapeHtml(page.form.readiness.title) +
      "</strong><p>" +
      escapeHtml(page.form.readiness.description) +
      '</p><div class="portal-key-list">' +
      page.form.readiness.items
        .map(function (item) {
          return (
            '<div class="portal-key-row"><div class="portal-key-copy"><strong>' +
            escapeHtml(item.key) +
            '</strong></div><span class="portal-key-value">' +
            escapeHtml(item.value) +
            "</span></div>"
          );
        })
        .join("") +
      "</div></div></section></div></main>"
    );
  }

  function renderApp(page) {
    return (
      renderTopbar(page.topbar) +
      '<div class="app-shell">' +
      renderSidebar(page.sidebar) +
      '<main class="app-main">' +
      renderAppHeader(page.header) +
      renderMetrics(page.metrics) +
      '<section class="app-grid"><div class="app-stack">' +
      page.columns.primary.map(renderCard).join("") +
      '</div><div class="app-stack">' +
      page.columns.secondary.map(renderCard).join("") +
      "</div></section></main></div>"
    );
  }

  global.PortalRenderer = {
    renderPage: function (page) {
      if (page.type === "login") {
        return renderLogin(page);
      }

      return renderApp(page);
    }
  };
})(window);
