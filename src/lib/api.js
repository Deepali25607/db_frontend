async function request(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    // per-field validation messages ride along for forms that can use them
    if (data.details?.fieldErrors) err.fieldErrors = data.details.fieldErrors;
    throw err;
  }
  return data;
}

export const api = {
  config: () => request("/api/config"),
  content: () => request("/api/content"),
  rates: () => request("/api/rates"),
  categories: () => request("/api/categories"),
  products: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`);
  },
  product: (slug) => request(`/api/products/${slug}`),
  // live server-side variant pricing (karat / diamond quality / size)
  productQuote: (slug, sel = {}) => {
    const qs = new URLSearchParams(
      Object.entries(sel).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return request(`/api/products/${slug}/quote${qs ? `?${qs}` : ""}`);
  },
  pincode: (pin) => request(`/api/pincode/${pin}`),
  placeOrder: (payload) =>
    request("/api/orders", {
      method: "POST",
      // token included so signed-in buyers can redeem loyalty points
      headers: { "Content-Type": "application/json", "x-auth-token": localStorage.getItem("dpj_token") || "" },
      body: JSON.stringify(payload),
    }),
  subscribe: (email) =>
    request("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  createIntent: (payload) =>
    request("/api/payments/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": localStorage.getItem("dpj_token") || "" },
      body: JSON.stringify(payload),
    }),
  loyaltyMeta: () => request("/api/loyalty/meta"),
  // payload: "success"/"failure" for the simulated gateway, or
  // {razorpayPaymentId, razorpaySignature} when Razorpay Checkout is live.
  confirmPayment: (intentId, payload) =>
    request(`/api/payments/${intentId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typeof payload === "string" ? { outcome: payload } : payload),
    }),
  packingSlip: (orderId, phone) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/packing-slip?phone=${encodeURIComponent(phone || "")}`, {
      headers: { "x-admin-key": localStorage.getItem("dpj_admin_key") || "" },
    }),
  track: (orderId, phone) =>
    request(`/api/track?orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`),
  trackMy: (phone) => request(`/api/track/my?phone=${encodeURIComponent(phone)}`),
  menu: () => request("/api/menu"),
  invoice: (orderId, phone) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/invoice?phone=${encodeURIComponent(phone || "")}`, {
      headers: { "x-admin-key": localStorage.getItem("dpj_admin_key") || "" },
    }),
  schemes: () => request("/api/schemes"),
  enrollScheme: (payload) =>
    request("/api/schemes/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  mySchemes: (phone) => request(`/api/schemes/my?phone=${encodeURIComponent(phone)}`),
  paySchemeInstalment: (id, outcome, method) =>
    request(`/api/schemes/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, method }),
    }),
  redeemScheme: (id) =>
    request(`/api/schemes/${id}/redeem`, { method: "POST" }),
  submitReturn: (payload) =>
    request("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  cancelOrder: (orderId, phone) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }),
  requestCallback: (payload) =>
    request("/api/callbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  reviews: (slug) => request(`/api/products/${slug}/reviews`),
  submitReview: (slug, payload) =>
    request(`/api/products/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  stores: () => request("/api/stores"),
  bookAppointment: (payload) =>
    request("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  myAppointments: (phone) => request(`/api/appointments/my?phone=${encodeURIComponent(phone)}`),
  validateCoupon: (code, items) =>
    request("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, items }),
    }),
  submitBuyback: (payload) =>
    request("/api/buyback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  myBuybacks: (phone) => request(`/api/buyback/my?phone=${encodeURIComponent(phone)}`),
  enquiryMeta: () => request("/api/enquiries/meta"),
  submitEnquiry: (payload) =>
    request("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  myEnquiries: (phone) => request(`/api/enquiries/my?phone=${encodeURIComponent(phone)}`),
  acceptQuote: (id, phone) =>
    request(`/api/enquiries/${id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }),
  payAdvance: (id, outcome) =>
    request(`/api/enquiries/${id}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    }),
  abandonCart: (payload) =>
    request("/api/carts/abandon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

// ---------------------------------------------------------------- account
const authHeaders = () => ({
  "Content-Type": "application/json",
  "x-auth-token": localStorage.getItem("dpj_token") || "",
});

export const accountApi = {
  hasToken: () => Boolean(localStorage.getItem("dpj_token")),
  requestOtp: (phone) =>
    request("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: async (phone, otp) => {
    const res = await request("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    localStorage.setItem("dpj_token", res.token);
    return res;
  },
  logout: async () => {
    await request("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    localStorage.removeItem("dpj_token");
  },
  me: () => request("/api/me", { headers: authHeaders() }),
  updateProfile: (body) =>
    request("/api/me", { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }),
  addAddress: (body) =>
    request("/api/me/addresses", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }),
  removeAddress: (id) =>
    request(`/api/me/addresses/${id}`, { method: "DELETE", headers: authHeaders() }),
  exportUrl: () => "/api/me/export",
  exportData: () => request("/api/me/export", { headers: authHeaders() }),
  loyalty: () => request("/api/loyalty/me", { headers: authHeaders() }),
  deleteAccount: async () => {
    const res = await request("/api/me", { method: "DELETE", headers: authHeaders() });
    localStorage.removeItem("dpj_token");
    return res;
  },
};

// ---------------------------------------------------------------- admin
// Auth carries either the master key or a personal session token.
const adminHeaders = () => {
  const h = { "Content-Type": "application/json" };
  const key = localStorage.getItem("dpj_admin_key");
  const token = localStorage.getItem("dpj_admin_token");
  if (key) h["x-admin-key"] = key;
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
};

export const adminApi = {
  login: async (cred) => {
    if (typeof cred === "string") {
      await request("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: cred }),
      });
      localStorage.setItem("dpj_admin_key", cred);
      localStorage.removeItem("dpj_admin_token");
      return;
    }
    const res = await request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cred.email, password: cred.password }),
    });
    localStorage.setItem("dpj_admin_token", res.token);
    localStorage.removeItem("dpj_admin_key");
    return res;
  },
  logout: () => {
    fetch("/api/admin/logout", { method: "POST", headers: adminHeaders() }).catch(() => {});
    localStorage.removeItem("dpj_admin_key");
    localStorage.removeItem("dpj_admin_token");
  },
  hasKey: () => Boolean(localStorage.getItem("dpj_admin_key") || localStorage.getItem("dpj_admin_token")),
  me: () => request("/api/admin/me", { headers: adminHeaders() }),
  adminUsers: (params) => {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString()
      : "";
    return request(`/api/admin/users${qs}`, { headers: adminHeaders() });
  },
  createAdminUser: (body) =>
    request("/api/admin/users", { method: "POST", headers: adminHeaders(), body: JSON.stringify(body) }),
  patchAdminUser: (id, body) =>
    request(`/api/admin/users/${id}`, { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(body) }),
  resetAdminPassword: (id, password) =>
    request(`/api/admin/users/${id}/password`, { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ password }) }),
  disableAdminUser: (id) =>
    request(`/api/admin/users/${id}`, { method: "DELETE", headers: adminHeaders() }),
  summary: () => request("/api/admin/summary", { headers: adminHeaders() }),
  orders: (params) => {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString()
      : "";
    return request(`/api/admin/orders${qs}`, { headers: adminHeaders() });
  },
  setOrderStatus: (orderId, statusOrBody) =>
    request(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(typeof statusOrBody === "string" ? { status: statusOrBody } : statusOrBody),
    }),
  rates: () => request("/api/admin/rates", { headers: adminHeaders() }),
  proposeRate: (payload) =>
    request("/api/admin/rates/proposals", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    }),
  resolveProposal: (id, action, checker) =>
    request(`/api/admin/rates/proposals/${id}/${action}`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ checker }),
    }),
  products: () => request("/api/admin/products", { headers: adminHeaders() }),
  createProduct: (body) =>
    request("/api/admin/products", { method: "POST", headers: adminHeaders(), body: JSON.stringify(body) }),
  patchProduct: (slug, body) =>
    request(`/api/admin/products/${slug}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    }),
  uploadCsv: (csv) =>
    request("/api/admin/products/csv", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ csv }),
    }),
  schemes: () => request("/api/admin/schemes", { headers: adminHeaders() }),
  returns: () => request("/api/admin/returns", { headers: adminHeaders() }),
  patchReturn: (id, status, note) =>
    request(`/api/admin/returns/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status, note }),
    }),
  appointments: () => request("/api/admin/appointments", { headers: adminHeaders() }),
  callbacks: () => request("/api/admin/callbacks", { headers: adminHeaders() }),
  customers: () => request("/api/admin/customers", { headers: adminHeaders() }),
  footfall: () => request("/api/admin/footfall", { headers: adminHeaders() }),
  customer: (phone) =>
    request(`/api/admin/customers/${encodeURIComponent(phone)}`, { headers: adminHeaders() }),
  markCallbackCalled: (id) =>
    request(`/api/admin/callbacks/${id}`, { method: "PATCH", headers: adminHeaders() }),
  patchAppointment: (id, status) =>
    request(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    }),
  coupons: () => request("/api/admin/coupons", { headers: adminHeaders() }),
  createCoupon: (payload) =>
    request("/api/admin/coupons", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    }),
  patchCoupon: (code, active) =>
    request(`/api/admin/coupons/${code}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ active }),
    }),
  buybacks: () => request("/api/admin/buyback", { headers: adminHeaders() }),
  patchBuyback: (id, body) =>
    request(`/api/admin/buyback/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    }),
  enquiries: () => request("/api/admin/enquiries", { headers: adminHeaders() }),
  patchEnquiry: (id, body) =>
    request(`/api/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    }),
  exportUrl: (report) => {
    const key = localStorage.getItem("dpj_admin_key");
    const auth = key
      ? `key=${encodeURIComponent(key)}`
      : `token=${encodeURIComponent(localStorage.getItem("dpj_admin_token") || "")}`;
    return `/api/admin/export/${report}.csv?${auth}`;
  },
  abandoned: () => request("/api/admin/abandoned", { headers: adminHeaders() }),
  analytics: () => request("/api/admin/analytics", { headers: adminHeaders() }),
  config: () => request("/api/admin/config", { headers: adminHeaders() }),
  patchContent: (body) =>
    request("/api/admin/content", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(body) }),
  patchCategoryImage: (key, image) =>
    request("/api/admin/categories", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ key, image }) }),
  discountRules: () => request("/api/admin/discount-rules", { headers: adminHeaders() }),
  patchDiscountRules: (rules) =>
    request("/api/admin/discount-rules", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ rules }) }),
  patchSchemeVariants: (variants) =>
    request("/api/admin/scheme-variants", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ variants }) }),
  patchEmiPlans: (plans) =>
    request("/api/admin/emi-plans", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ plans }) }),
  patchStores: (stores) =>
    request("/api/admin/stores", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ stores }) }),
  uploadFile: async (file) => {
    const res = await fetch(`/api/admin/uploads?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: {
        "x-admin-key": localStorage.getItem("dpj_admin_key") || "",
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data; // { url, bytes }
  },
  patchConfig: (body) =>
    request("/api/admin/config", { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(body) }),
  auditLog: () => request("/api/admin/audit", { headers: adminHeaders() }),
  backupUrl: () =>
    `/api/admin/export/backup.json?key=${encodeURIComponent(localStorage.getItem("dpj_admin_key") || "")}`,
  notifications: (filters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return request(`/api/admin/notifications${qs ? `?${qs}` : ""}`, { headers: adminHeaders() });
  },
};
