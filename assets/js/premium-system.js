(function (global) {
  function setupMenus() {
    document.querySelectorAll("[data-menu-toggle]").forEach(function (toggle) {
      if (toggle.getAttribute("data-menu-bound") === "true") {
        return;
      }

      var controls = toggle.getAttribute("aria-controls");
      var panel = controls ? document.getElementById(controls) : null;

      if (!panel) {
        return;
      }

      function closeMenu() {
        panel.classList.remove("is-open");
        toggle.classList.remove("is-active");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }

      toggle.addEventListener("click", function () {
        var isOpen = panel.classList.toggle("is-open");
        toggle.classList.toggle("is-active", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        document.body.classList.toggle("menu-open", isOpen);
      });

      panel.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("click", function (event) {
        if (!panel.contains(event.target) && !toggle.contains(event.target)) {
          closeMenu();
        }
      });

      toggle.setAttribute("data-menu-bound", "true");
    });
  }

  global.PremiumSystem = {
    setupMenus: setupMenus
  };

  document.addEventListener("DOMContentLoaded", function () {
    setupMenus();
  });
})(window);
