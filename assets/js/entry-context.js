(function (global) {
  var DEFAULT_KEYS = ["origem", "tema", "campanha", "video"];
  var DEFAULT_ALIASES = {
    origem: ["origem", "source"],
    tema: ["tema", "theme"],
    campanha: ["campanha", "campaign"],
    video: ["video"]
  };

  function normalizeValue(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/_/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120);
  }

  function getFirstValue(value) {
    if (Array.isArray(value)) {
      return value[0] || "";
    }

    return value || "";
  }

  function readValue(params, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      var value = params.get(keys[index]);

      if (value) {
        return value;
      }
    }

    return "";
  }

  function readFromSearch(search, options) {
    var settings = options || {};
    var aliases = Object.assign({}, DEFAULT_ALIASES, settings.aliases || {});
    var defaults = settings.defaults || {};
    var params = search instanceof URLSearchParams ? search : new URLSearchParams(search || "");

    return {
      origem: normalizeValue(readValue(params, aliases.origem || DEFAULT_ALIASES.origem) || defaults.origem),
      tema: normalizeValue(readValue(params, aliases.tema || DEFAULT_ALIASES.tema) || defaults.tema),
      campanha: normalizeValue(
        readValue(params, aliases.campanha || DEFAULT_ALIASES.campanha) || defaults.campanha
      ),
      video: normalizeValue(readValue(params, aliases.video || DEFAULT_ALIASES.video) || defaults.video)
    };
  }

  function hasAny(context) {
    if (!context) {
      return false;
    }

    for (var index = 0; index < DEFAULT_KEYS.length; index += 1) {
      if (normalizeValue(context[DEFAULT_KEYS[index]])) {
        return true;
      }
    }

    return false;
  }

  function toPayload(context) {
    var payload = {};

    if (!context) {
      return payload;
    }

    for (var index = 0; index < DEFAULT_KEYS.length; index += 1) {
      var key = DEFAULT_KEYS[index];
      var value = normalizeValue(context[key]);

      if (value) {
        payload[key] = value;
      }
    }

    return payload;
  }

  function appendToHref(href, context, options) {
    if (!href || !hasAny(context)) {
      return href;
    }

    try {
      var settings = options || {};
      var isAbsolute = /^https?:\/\//i.test(href);
      var url = new URL(href, isAbsolute ? undefined : global.location.href);

      for (var index = 0; index < DEFAULT_KEYS.length; index += 1) {
        var key = DEFAULT_KEYS[index];
        var value = normalizeValue(context[key]);

        if (value && (settings.overwrite || !url.searchParams.get(key))) {
          url.searchParams.set(key, value);
        }
      }

      if (isAbsolute) {
        return url.toString();
      }

      return url.pathname + url.search + url.hash;
    } catch (error) {
      return href;
    }
  }

  global.EntryContext = {
    keys: DEFAULT_KEYS.slice(),
    normalizeValue: normalizeValue,
    readFromSearch: readFromSearch,
    hasAny: hasAny,
    toPayload: toPayload,
    appendToHref: appendToHref
  };
})(window);
