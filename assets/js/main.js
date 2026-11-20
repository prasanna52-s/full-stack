/* ==========================================================================
   ProjectHub — shared behaviour
   Navbar state, mobile menu, contact detail rendering and enquiry validation.
   ========================================================================== */

(function () {
  "use strict";

  var rawConfig = window.PROJECTHUB_CONFIG || {};
  var config = {
    email: String(rawConfig.email || "").trim(),
    phone: String(rawConfig.phone || "").trim(),
    whatsapp: String(rawConfig.whatsapp || "").trim(),
    location: String(rawConfig.location || "").trim(),
    apiBaseUrl: String(rawConfig.apiBaseUrl || "").trim(),
    formEndpoint: String(rawConfig.formEndpoint || "").trim(),
    social: rawConfig.social && typeof rawConfig.social === "object" ? rawConfig.social : {}
  };

  var SOCIAL_META = {
    linkedin: { icon: "bi-linkedin", label: "LinkedIn" },
    github: { icon: "bi-github", label: "GitHub" },
    instagram: { icon: "bi-instagram", label: "Instagram" },
    x: { icon: "bi-twitter-x", label: "X (Twitter)" },
    twitter: { icon: "bi-twitter-x", label: "X (Twitter)" },
    facebook: { icon: "bi-facebook", label: "Facebook" },
    youtube: { icon: "bi-youtube", label: "YouTube" },
    telegram: { icon: "bi-telegram", label: "Telegram" }
  };

  function isHttpUrl(value) {
    return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
  }

  /* --- Copyright year ---------------------------------------------------- */
  var year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = year;
  });

  /* --- Navbar scroll state ----------------------------------------------- */
  var nav = document.querySelector("[data-navbar]");

  function syncNav() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  syncNav();
  window.addEventListener("scroll", syncNav, { passive: true });

  /* --- Close the mobile menu after choosing a link ------------------------ */
  var collapseEl = document.getElementById("primaryNav");

  if (collapseEl && window.bootstrap && window.bootstrap.Collapse) {
    collapseEl.querySelectorAll(".nav-link, .btn").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!collapseEl.classList.contains("show")) return;
        window.bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false }).hide();
      });
    });
  }

  /* --- Contact details (only rendered when configured) -------------------- */
  function contactHref(key, value) {
    if (key === "email") return "mailto:" + value;
    if (key === "phone") return "tel:" + value.replace(/[^\d+]/g, "");
    if (key === "whatsapp") return "https://wa.me/" + value.replace(/\D/g, "");
    return "";
  }

  ["email", "phone", "whatsapp", "location"].forEach(function (key) {
    var value = config[key];
    var rows = document.querySelectorAll('[data-contact-row="' + key + '"]');

    rows.forEach(function (row) {
      if (!value) {
        row.hidden = true;
        return;
      }

      var target = row.querySelector("[data-contact-text]");
      if (target) {
        target.textContent = value;
        var href = contactHref(key, value);
        if (href && target.tagName === "A") {
          target.setAttribute("href", href);
          if (key === "whatsapp") {
            target.setAttribute("target", "_blank");
            target.setAttribute("rel", "noopener noreferrer");
          }
        }
      }

      row.hidden = false;
    });
  });

  var hasDirectContact = Boolean(config.email || config.phone || config.whatsapp || config.location);

  document.querySelectorAll("[data-contact-card]").forEach(function (card) {
    card.hidden = !hasDirectContact && !Object.keys(config.social).some(function (k) {
      return isHttpUrl(config.social[k]);
    });
  });

  document.querySelectorAll("[data-contact-fallback]").forEach(function (el) {
    el.hidden = hasDirectContact;
  });

  /* --- Social links (only real profiles) --------------------------------- */
  var socialEntries = Object.keys(config.social).filter(function (key) {
    return SOCIAL_META[key] && isHttpUrl(config.social[key]);
  });

  document.querySelectorAll("[data-socials]").forEach(function (container) {
    if (!socialEntries.length) {
      container.hidden = true;
      return;
    }

    container.innerHTML = "";

    socialEntries.forEach(function (key) {
      var meta = SOCIAL_META[key];
      var link = document.createElement("a");
      link.className = "social-link";
      link.href = config.social[key].trim();
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "ProjectHub on " + meta.label);

      var icon = document.createElement("i");
      icon.className = "bi " + meta.icon;
      icon.setAttribute("aria-hidden", "true");
      link.appendChild(icon);
      container.appendChild(link);
    });

    container.hidden = false;
  });

  /* --- Enquiry form ------------------------------------------------------- */
  var form = document.querySelector("[data-enquiry-form]");
  if (!form) return;

  var demoNotice = document.querySelector("[data-demo-notice]");
  var errorPanel = form.querySelector("[data-form-error]");
  var successPanel = form.querySelector("[data-form-success]");
  var successTitle = form.querySelector("[data-success-title]");
  var successText = form.querySelector("[data-success-text]");
  var mailtoLink = form.querySelector("[data-mailto]");

  /* Resolve the enquiry endpoint: explicit override first, then apiBaseUrl,
     then the local API when the page is served from this machine. */
  var LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

  function resolveEndpoint() {
    if (config.formEndpoint) return config.formEndpoint;

    var base = config.apiBaseUrl.replace(/\/+$/, "");
    if (base) return base + "/api/contact";

    var onLocalHost = LOCAL_HOSTNAMES.indexOf(window.location.hostname) !== -1;
    return onLocalHost ? "http://localhost:5000/api/contact" : "";
  }

  var endpoint = resolveEndpoint();

  if (endpoint && demoNotice) {
    demoNotice.hidden = true;
  }

  var phoneInput = form.querySelector('[name="phone"]');
  var serviceSelect = form.querySelector('[name="service"]');

  function selectedMethod() {
    var checked = form.querySelector('input[name="contactMethod"]:checked');
    return checked ? checked.value : "";
  }

  function syncPhoneField() {
    if (!phoneInput) return;
    var method = selectedMethod().toLowerCase();
    var needsNumber = method === "phone" || method === "whatsapp";
    phoneInput.required = needsNumber;
    if (!needsNumber && phoneInput.value) {
      setError("phone", "");
    }
  }

  /* Preselect the service when arriving from a services page link. */
  if (serviceSelect) {
    var requested = new URLSearchParams(window.location.search).get("service");
    if (requested) {
      var match = Array.prototype.find.call(serviceSelect.options, function (option) {
        return option.value === requested;
      });
      if (match) serviceSelect.value = match.value;
    }
  }

  form.querySelectorAll('input[name="contactMethod"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      syncPhoneField();
      showFieldError("contactMethod", "");
    });
  });
  syncPhoneField();

  /* --- Validation --------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    name: function (value) {
      return value.trim().length >= 2 ? "" : "Enter your name (at least 2 characters).";
    },
    email: function (value) {
      return EMAIL_RE.test(value.trim()) ? "" : "Enter a valid email address, such as name@college.edu.";
    },
    service: function (value) {
      return value ? "" : "Choose the kind of support you are looking for.";
    },
    message: function (value) {
      var length = value.trim().length;
      if (length < 20) return "Add at least 20 characters so the project can be understood.";
      if (length > 3000) return "Keep the project details under 3000 characters.";
      return "";
    },
    college: function (value) {
      return value.trim().length <= 120 ? "" : "Keep the college name under 120 characters.";
    },
    department: function (value) {
      return value.trim().length <= 100 ? "" : "Keep the department under 100 characters.";
    },
    phone: function (value) {
      var trimmed = value.trim();
      var method = selectedMethod().toLowerCase();

      if (!trimmed) {
        return method === "phone" || method === "whatsapp"
          ? "Add a number that can be reached on this channel."
          : "";
      }

      var digits = trimmed.replace(/\D/g, "");
      if (!/^[\d+()\-.\s]+$/.test(trimmed) || digits.length < 7 || digits.length > 15) {
        return "Enter a phone number with 7–15 digits, including the country code.";
      }

      return "";
    }
  };

  function showFieldError(name, message) {
    var fields = form.querySelectorAll('[name="' + name + '"]');
    var messageEl = form.querySelector('[data-error-for="' + name + '"]');

    fields.forEach(function (field) {
      field.classList.toggle("is-invalid", Boolean(message));
      field.setAttribute("aria-invalid", message ? "true" : "false");
    });

    if (messageEl) {
      messageEl.textContent = message;
      messageEl.classList.toggle("show", Boolean(message));
    }
  }

  function setError(name, message) {
    showFieldError(name, message);
  }

  function validateField(name) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) return "";
    var message = rules[name] ? rules[name](field.value) : "";
    showFieldError(name, message);
    return message;
  }

  function resetPanels() {
    if (errorPanel) errorPanel.hidden = true;
    if (successPanel) successPanel.hidden = true;
    if (mailtoLink) mailtoLink.hidden = true;
  }

  var submitting = false;

  function setSubmitting(button, busy) {
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (!button) return;
    button.disabled = busy;

    if (busy) {
      button.dataset.label = button.innerHTML;
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Sending…';
    } else if (button.dataset.label) {
      button.innerHTML = button.dataset.label;
    }
  }

  function applyServerErrors(body) {
    if (!body || !body.errors || typeof body.errors !== "object") return;

    Object.keys(body.errors).forEach(function (field) {
      if (form.querySelector('[name="' + field + '"]')) {
        showFieldError(field, String(body.errors[field] || ""));
      }
    });
  }

  function clearFieldState() {
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (field) {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
    });

    form.querySelectorAll(".field-error.show").forEach(function (element) {
      element.classList.remove("show");
      element.textContent = "";
    });
  }

  form.addEventListener("input", function (event) {
    var name = event.target.name;
    if (name && rules[name]) {
      showFieldError(name, "");
    }
  });

  function buildMailto(payload) {
    if (!config.email) return "";
    var subject = "Project enquiry — " + (payload.serviceLabel || "ProjectHub");
    var body = [
      "Name: " + payload.name,
      "Email: " + payload.email,
      "Service: " + payload.serviceLabel,
      "Preferred contact: " + payload.contactMethod,
      payload.phone ? "Phone / WhatsApp: " + payload.phone : "",
      payload.college ? "College: " + payload.college : "",
      payload.department ? "Department: " + payload.department : "",
      "",
      payload.message
    ].filter(Boolean).join("\n");

    return "mailto:" + config.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submitting) return;
    resetPanels();

    var invalid = [];

    ["name", "email", "service", "message", "college", "department"].forEach(function (name) {
      if (validateField(name)) invalid.push(name);
    });

    if (validateField("phone")) invalid.push("phone");

    if (!selectedMethod()) {
      showFieldError("contactMethod", "Choose how you would prefer to be contacted.");
      invalid.push("contactMethod");
    } else {
      showFieldError("contactMethod", "");
    }

    if (invalid.length) {
      if (errorPanel) {
        errorPanel.hidden = false;
        errorPanel.querySelector("[data-error-text]").textContent =
          "Please review the highlighted fields and try again.";
        errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      var firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      return;
    }

    var chosen = serviceSelect && serviceSelect.selectedOptions[0];
    var honeypot = form.querySelector('[name="company"]');
    var payload = {
      name: form.querySelector('[name="name"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      phone: phoneInput ? phoneInput.value.trim() : "",
      service: serviceSelect ? serviceSelect.value : "",
      serviceLabel: chosen ? chosen.textContent.trim() : "",
      college: form.querySelector('[name="college"]').value.trim(),
      department: form.querySelector('[name="department"]').value.trim(),
      message: form.querySelector('[name="message"]').value.trim(),
      contactMethod: selectedMethod(),
      company: honeypot ? honeypot.value : ""
    };

    function showSuccess(title, message) {
      if (!successPanel) return;
      successPanel.hidden = false;
      if (successTitle) successTitle.textContent = title;
      if (successText) successText.textContent = message;

      var mailto = buildMailto(payload);
      if (mailtoLink && mailto) {
        mailtoLink.href = mailto;
        mailtoLink.hidden = false;
      }

      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function showFailure(message) {
      if (!errorPanel) return;
      errorPanel.hidden = false;
      errorPanel.querySelector("[data-error-text]").textContent = message;
      errorPanel.focus({ preventScroll: true });
      errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (!endpoint) {
      showSuccess(
        "Demo form — nothing was sent",
        "This enquiry form is a front-end demo: your details were validated but not submitted anywhere. Once the site owner connects an email service or backend, enquiries will be delivered automatically."
      );
      return;
    }

    var submitButton = form.querySelector('[type="submit"]');
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = controller
      ? window.setTimeout(function () {
          controller.abort();
        }, 20000)
      : 0;

    submitting = true;
    setSubmitting(submitButton, true);

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            return { ok: response.ok, body: body };
          });
      })
      .then(function (result) {
        if (result.ok) {
          showSuccess(
            "Enquiry sent",
            (result.body && result.body.message) ||
              "Thanks — your enquiry was sent. A reply will follow using the contact method you chose."
          );
          form.reset();
          clearFieldState();
          syncPhoneField();
          return;
        }

        applyServerErrors(result.body);
        showFailure(
          (result.body && result.body.message) ||
            "The enquiry could not be sent. Please check your details and try again."
        );
      })
      .catch(function () {
        showFailure(
          "The enquiry could not reach the server. Check your connection and try again in a moment."
        );
      })
      .finally(function () {
        window.clearTimeout(timeoutId);
        submitting = false;
        setSubmitting(submitButton, false);
      });
  });
})();
