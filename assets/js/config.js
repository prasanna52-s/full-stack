/* ==========================================================================
   ProjectHub — site configuration
   --------------------------------------------------------------------------
   This is the only file the site owner needs to edit.

   Fill in the values you want to publish. Anything left as an empty string
   ("") is hidden automatically on every page — no placeholder or example
   details are ever shown to visitors.

     email         Business email address, e.g. "hello@yourdomain.com"
     phone         Phone number in international format, e.g. "+91 90000 00000"
     whatsapp      WhatsApp number in international format, e.g. "+91 90000 00000"
     location      City / area you serve, e.g. "Bengaluru, India (remote)"
     apiBaseUrl    Base URL of the ProjectHub API, e.g.
                   "https://projecthub-api.onrender.com" (no trailing slash).
                   The contact form posts to <apiBaseUrl>/api/contact.
                   Leave empty while developing locally: when the site is
                   opened from localhost or 127.0.0.1 the form automatically
                   uses http://localhost:5000/api/contact.
     formEndpoint  Optional full endpoint override. Use this only if you post
                   somewhere other than <apiBaseUrl>/api/contact. When both
                   apiBaseUrl and formEndpoint are empty on a deployed site,
                   the form stays in demo mode and sends nothing.
     social        Add only real profile URLs. Remove the lines you do not use.
   ========================================================================== */

window.PROJECTHUB_CONFIG = {
  email: "",
  phone: "",
  whatsapp: "",
  location: "",

  apiBaseUrl: "",
  formEndpoint: "",

  social: {
    linkedin: "",
    github: "",
    instagram: ""
  }
};
