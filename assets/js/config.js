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
     apiBaseUrl    Optional. Leave empty to send enquiries to /api/contact on
                   the same domain (the API function deployed with this site
                   on Vercel). Set it only when the API runs on another host,
                   e.g. "https://projecthub-api.onrender.com" — no trailing
                   slash. Local development always uses
                   http://localhost:5000/api/contact.
     formEndpoint  Optional full URL override for the enquiry endpoint. Use
                   only when it is neither <apiBaseUrl>/api/contact nor the
                   same-domain default.
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
