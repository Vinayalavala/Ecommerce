import { useState, useEffect, useMemo, useRef } from "react";
import assets, { categories } from "../../assets/assets";
import { useAppContext } from "../../context/appContext";
import { toast } from "react-hot-toast";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const mainCategories = [
  "Grocery & Kitchen",
  "Snacks & Drinks",
  "Beauty & Personal Care",
  "Household Essentials",
];

const quantityUnits = ["pc", "pcs", "ML", "L", "g", "Kg"];

const CURRENCY = "₹";
const MAX_IMAGES = 5;
const MAX_FILE_MB = 5;
const LOW_STOCK = 10;
const DRAFT_KEY = "seller:add-product-draft";
const DRAFT_DELAY_MS = 700;
const LIST_ROUTE = "/seller/product-list";

const EMPTY_FORM = {
  name: "",
  description: "",
  mainCategory: "",
  category: "",
  quantityValue: "",
  quantityUnit: "",
  price: "",
  offerPrice: "",
  stock: "",
};

// Visual order of fields, used to focus the first invalid one
const FIELD_ORDER = [
  "images",
  "name",
  "mainCategory",
  "category",
  "quantityValue",
  "quantityUnit",
  "price",
  "offerPrice",
  "stock",
];

const formatMoney = (n) => `${CURRENCY}${Number(n).toLocaleString("en-IN")}`;
const blurOnWheel = (e) => e.currentTarget.blur(); // stop scroll from changing numbers

/* -------------------------------------------------------------------------- */
/*                     Small presentational pieces (outside)                  */
/*   Defined outside the component so inputs keep focus between renders.      */
/* -------------------------------------------------------------------------- */

const inputCls = (hasError) =>
  `w-full bg-white outline-none py-2.5 px-3 rounded-lg border text-sm transition-colors focus:ring-2 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-primary focus:ring-primary/20"
  }`;

const Field = ({ id, label, error, hint, className = "", children }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label htmlFor={id} className="text-sm font-medium text-gray-800">
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-gray-500">{hint}</p>
    ) : null}
  </div>
);

const Section = ({ title, description, children }) => (
  <section className="pt-6 mt-6 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Spinner = () => (
  <span
    aria-hidden="true"
    className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
  />
);

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const AddProduct = () => {
  const { axios } = useAppContext();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const editId = searchParams.get("edit");
  const productFromState = location.state?.product || null;

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState([]); // URLs already saved
  const [newImages, setNewImages] = useState([]); // { id, file, url }
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Page state
  const [loading, setLoading] = useState(Boolean(editId));
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  // Draft (add mode only)
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const formRef = useRef(null);
  const urlsRef = useRef(new Set()); // object URLs we must revoke
  const idCounter = useRef(0);
  const baselineRef = useRef({ form: JSON.stringify(EMPTY_FORM), images: "[]" });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /* ------------------------------ Image helpers ----------------------------- */

  const revokeAllUrls = () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  };

  // Revoke object URLs only on unmount (safe under React StrictMode)
  useEffect(() => revokeAllUrls, []);

  const totalImages = existingImages.length + newImages.length;
  const imageRoom = MAX_IMAGES - totalImages;

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    let overLimit = false;

    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_FILE_MB} MB`);
        continue;
      }
      if (accepted.length >= imageRoom) {
        overLimit = true;
        continue;
      }
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      accepted.push({ id: `new-${idCounter.current++}`, file, url });
    }

    if (overLimit) toast.error(`You can add up to ${MAX_IMAGES} images`);
    if (accepted.length) setNewImages((prev) => [...prev, ...accepted]);
  };

  const removeNewImage = (id) => {
    setNewImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urlsRef.current.delete(target.url);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const removeExistingImage = (index) =>
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

  /* ---------------------------- Load / hydrate form ---------------------------- */

  const fillFromProduct = (product) => {
    const next = {
      name: product.name || "",
      description: Array.isArray(product.description)
        ? product.description.join("\n")
        : product.description || "",
      mainCategory: product.mainCategory || "",
      category: product.category || "",
      quantityValue: String(product.quantity?.value ?? ""),
      quantityUnit: product.quantity?.unit || "",
      price: String(product.price ?? ""),
      offerPrice: String(product.offerPrice ?? ""),
      stock: String(product.stock ?? ""),
    };
    const images = product.image || [];
    setForm(next);
    setExistingImages(images);
    baselineRef.current = { form: JSON.stringify(next), images: JSON.stringify(images) };
  };

  useEffect(() => {
    setTouched({});
    setSubmitAttempted(false);
    setNewImages([]);
    revokeAllUrls();
    setLoadError("");

    // Add mode: start empty, or restore the saved draft
    if (!editId) {
      let draft = null;
      try {
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      } catch {
        draft = null;
      }
      const hasDraft = draft && typeof draft === "object";
      setForm(hasDraft ? { ...EMPTY_FORM, ...draft } : EMPTY_FORM);
      setDraftRestored(Boolean(hasDraft));
      setExistingImages([]);
      baselineRef.current = { form: JSON.stringify(EMPTY_FORM), images: "[]" };
      setLoading(false);
      setHydrated(true);
      return;
    }

    // Edit mode: use navigation state if it matches, otherwise fetch
    setHydrated(false);
    setDraftRestored(false);

    if (productFromState && productFromState._id === editId) {
      fillFromProduct(productFromState);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    axios
      .get(`/api/product/add-ad/${editId}`)
      .then(({ data }) => {
        if (cancelled) return;
        if (data.success) fillFromProduct(data.product);
        else setLoadError(data.message || "Couldn't load this product");
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error.response?.data?.message || error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, productFromState, retryKey]);

  /* ------------------------------ Realtime bits ------------------------------ */

  // Autosave draft (add mode only, debounced)
  useEffect(() => {
    if (editId || !hydrated) return;
    const isEmpty = JSON.stringify(form) === JSON.stringify(EMPTY_FORM);
    setDraftPending(!isEmpty);

    const timer = setTimeout(() => {
      try {
        if (isEmpty) {
          localStorage.removeItem(DRAFT_KEY);
          setDraftSavedAt(null);
        } else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
          setDraftSavedAt(new Date());
        }
      } catch {
        /* storage unavailable: ignore */
      }
      setDraftPending(false);
    }, DRAFT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [form, editId, hydrated]);

  // Online / offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Ctrl/Cmd + S submits the form
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Unsaved-changes guard
  const isDirty =
    JSON.stringify(form) !== baselineRef.current.form ||
    JSON.stringify(existingImages) !== baselineRef.current.images ||
    newImages.length > 0;
  // In add mode, text is safe in the draft; only unsent images would be lost
  const shouldWarn = editId ? isDirty : newImages.length > 0;

  useEffect(() => {
    if (!shouldWarn) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [shouldWarn]);

  /* -------------------------------- Validation ------------------------------- */

  const errors = useMemo(() => {
    const e = {};
    const price = Number(form.price);
    const offer = Number(form.offerPrice);
    const stock = Number(form.stock);
    const qty = Number(form.quantityValue);

    if (existingImages.length + newImages.length === 0) e.images = "Add at least one image";

    const trimmed = form.name.trim();
    if (!trimmed) e.name = "Enter a product name";
    else if (trimmed.length < 3) e.name = "Use at least 3 characters";

    if (!form.mainCategory) e.mainCategory = "Choose a main category";
    if (!form.category) e.category = "Choose a category";

    if (form.quantityValue === "" || !(qty > 0)) e.quantityValue = "Enter an amount above 0";
    if (!form.quantityUnit) e.quantityUnit = "Choose a unit";

    if (form.price === "" || !(price > 0)) e.price = "Enter a price above 0";

    if (form.offerPrice === "" || !(offer > 0)) e.offerPrice = "Enter an offer price above 0";
    else if (price > 0 && offer > price) e.offerPrice = "Offer price can't be higher than the price";

    if (form.stock === "" || !Number.isInteger(stock) || stock < 0) {
      e.stock = "Enter a whole number, 0 or more";
    }
    return e;
  }, [form, existingImages.length, newImages.length]);

  const shown = (key) => ((touched[key] || submitAttempted) && errors[key]) || "";

  const bind = (key) => ({
    id: `field-${key}`,
    value: form[key],
    onChange: (e) => setField(key, e.target.value),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    "aria-invalid": Boolean(shown(key)),
    "aria-describedby": shown(key) ? `field-${key}-error` : undefined,
    className: inputCls(Boolean(shown(key))),
  });

  /* ------------------------------ Derived preview ----------------------------- */

  const previewImages = [...existingImages, ...newImages.map((i) => i.url)];
  const activeIndex = Math.min(activeImg, Math.max(previewImages.length - 1, 0));
  const priceNum = Number(form.price);
  const offerNum = Number(form.offerPrice);
  const hasOffer = priceNum > 0 && offerNum > 0 && offerNum < priceNum;
  const discount = hasOffer ? Math.round(((priceNum - offerNum) / priceNum) * 100) : 0;
  const displayPrice = offerNum > 0 ? offerNum : priceNum;
  const stockNum = form.stock === "" ? null : Number(form.stock);
  const bullets = form.description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const quantityLabel =
    Number(form.quantityValue) > 0 && form.quantityUnit
      ? `${form.quantityValue} ${form.quantityUnit}`
      : "";

  let stockBadge = null;
  if (stockNum !== null && Number.isFinite(stockNum)) {
    if (stockNum <= 0) stockBadge = { text: "Out of stock", cls: "bg-red-100 text-red-700" };
    else if (stockNum <= LOW_STOCK)
      stockBadge = { text: `Only ${stockNum} left`, cls: "bg-amber-100 text-amber-800" };
    else stockBadge = { text: "In stock", cls: "bg-green-100 text-green-700" };
  }

  /* --------------------------------- Actions --------------------------------- */

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setForm(EMPTY_FORM);
    setTouched({});
    setDraftRestored(false);
    setDraftSavedAt(null);
  };

  const handleCancel = () => {
    if (shouldWarn && !window.confirm("Discard your changes?")) return;
    navigate(LIST_ROUTE);
  };

  const focusFirstInvalid = () => {
    const key = FIELD_ORDER.find((k) => errors[k]);
    if (!key) return;
    const el = document.getElementById(key === "images" ? "field-images" : `field-${key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (submitting || loading) return;

    setSubmitAttempted(true);

    if (Object.keys(errors).length > 0) {
      toast.error("Fix the highlighted fields");
      focusFirstInvalid();
      return;
    }
    if (!isOnline) {
      toast.error("You're offline. Reconnect and try again");
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      const productData = {
        name: form.name.trim(),
        description: bullets,
        category: form.category,
        mainCategory: form.mainCategory,
        price: Number(form.price),
        offerPrice: Number(form.offerPrice),
        stock: Number(form.stock),
        quantity: {
          value: Number(form.quantityValue),
          unit: form.quantityUnit,
        },
        image: existingImages,
      };

      const formData = new FormData();
      formData.append("productData", JSON.stringify(productData));
      newImages.forEach(({ file }) => formData.append("images", file));

      const url = editId ? `/api/product/update/${editId}` : "/api/product/add";
      const method = editId ? "put" : "post";

      // Axios sets the multipart Content-Type (with boundary) automatically
      const { data } = await axios[method](url, formData, {
        onUploadProgress: (p) => {
          if (p.total) setProgress(Math.round((p.loaded * 100) / p.total));
        },
      });

      if (data.success) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        toast.success(data.message || (editId ? "Product updated" : "Product added"));
        navigate(LIST_ROUTE);
      } else {
        toast.error(data.message || (editId ? "Couldn't update the product" : "Couldn't add the product"));
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.message || error.message);
      setSubmitting(false);
    }
  };

  /* ---------------------------------- Render --------------------------------- */

  if (loading) {
    return (
      <div className="flex-1 h-[95vh] overflow-y-auto p-4 md:p-10 max-w-5xl" aria-busy="true">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 h-[95vh] p-4 md:p-10">
        <div className="max-w-md border border-red-200 bg-red-50 rounded-xl p-5">
          <p className="font-medium text-red-800">Couldn't load this product</p>
          <p className="text-sm text-red-700 mt-1">{loadError}</p>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate(LIST_ROUTE)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
            >
              Back to products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const imagesError = shown("images");

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-auto">
      {!isOnline && (
        <div role="status" className="sticky top-0 z-20 bg-amber-100 text-amber-900 text-sm px-4 py-2 text-center">
          You're offline. Your changes stay on this page until you reconnect.
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={onSubmitHandler}
        noValidate
        className="p-4 md:p-10 max-w-5xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editId ? "Edit product" : "Add product"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {editId
                ? "Changes show on the storefront as soon as you save."
                : "Fill in the details. The preview updates as you type."}
            </p>
          </div>
          {!editId && (
            <p className="text-xs text-gray-500" aria-live="polite">
              {draftPending
                ? "Saving draft…"
                : draftSavedAt
                ? `Draft saved at ${draftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Drafts save automatically"}
            </p>
          )}
        </div>

        {draftRestored && !editId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
            <span className="text-gray-800">We restored your last draft. Images need to be added again.</span>
            <button type="button" onClick={discardDraft} className="font-medium text-primary hover:underline">
              Discard draft
            </button>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ------------------------------ Fields ------------------------------ */}
          <div className="min-w-0">
            <Section
              title="Images"
              description={`Up to ${MAX_IMAGES} images, ${MAX_FILE_MB} MB each. The first image is the cover.`}
            >
              <div>
                <label
                  htmlFor="field-images"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-7 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary/30 ${
                    imageRoom <= 0 ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    dragging
                      ? "border-primary bg-primary/5"
                      : imagesError
                      ? "border-red-400"
                      : "border-gray-300 hover:border-primary/60"
                  }`}
                >
                  <img src={assets.upload_area} alt="" className="w-12 opacity-80" />
                  <span className="text-sm text-gray-800">
                    {imageRoom <= 0
                      ? "Image limit reached"
                      : dragging
                      ? "Drop to add"
                      : "Drag images here or click to browse"}
                  </span>
                  <input
                    id="field-images"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={imageRoom <= 0}
                    className="sr-only"
                    aria-invalid={Boolean(imagesError)}
                    aria-describedby={imagesError ? "field-images-error" : undefined}
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = ""; // allow picking the same file again
                    }}
                  />
                </label>
                {imagesError && (
                  <p id="field-images-error" role="alert" className="text-xs text-red-600 mt-1.5">
                    {imagesError}
                  </p>
                )}
              </div>

              {totalImages > 0 && (
                <ul className="flex flex-wrap gap-3">
                  {existingImages.map((img, idx) => (
                    <li key={`${img}-${idx}`} className="relative">
                      <img
                        src={img}
                        alt={`Saved product image ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 text-[11px] bg-gray-900/80 text-white px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        aria-label={`Remove saved image ${idx + 1}`}
                        className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center rounded-full bg-gray-900 text-white hover:bg-red-600"
                      >
                        <CloseIcon />
                      </button>
                    </li>
                  ))}
                  {newImages.map((img, idx) => (
                    <li key={img.id} className="relative">
                      <img
                        src={img.url}
                        alt={`New product image ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-primary/50"
                      />
                      {existingImages.length === 0 && idx === 0 && (
                        <span className="absolute bottom-1 left-1 text-[11px] bg-gray-900/80 text-white px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewImage(img.id)}
                        aria-label={`Remove new image ${idx + 1}`}
                        className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center rounded-full bg-gray-900 text-white hover:bg-red-600"
                      >
                        <CloseIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Details">
              <Field id="field-name" label="Product name" error={shown("name")}>
                <input {...bind("name")} type="text" maxLength={80} placeholder="e.g. Aashirvaad Atta" />
              </Field>

              <Field
                id="field-description"
                label="Description"
                hint={`One point per line. ${bullets.length} ${bullets.length === 1 ? "point" : "points"}.`}
              >
                <textarea
                  id="field-description"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Made from whole wheat&#10;Stays soft for hours"
                  className={`${inputCls(false)} resize-none`}
                />
                <span className="text-xs text-gray-400 self-end">{form.description.length}/1000</span>
              </Field>
            </Section>

            <Section title="Category">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="field-mainCategory" label="Main category" error={shown("mainCategory")}>
                  <select {...bind("mainCategory")}>
                    <option value="">Select main category</option>
                    {mainCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="field-category" label="Category" error={shown("category")}>
                  <select {...bind("category")}>
                    <option value="">Select category</option>
                    {categories.map((item, index) => (
                      <option key={index} value={item.path}>
                        {item.path}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Pack size">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="field-quantityValue" label="Amount" error={shown("quantityValue")}>
                  <input
                    {...bind("quantityValue")}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="500"
                    onWheel={blurOnWheel}
                  />
                </Field>
                <Field id="field-quantityUnit" label="Unit" error={shown("quantityUnit")}>
                  <select {...bind("quantityUnit")}>
                    <option value="">Select unit</option>
                    {quantityUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Pricing and stock">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="field-price" label={`Price (${CURRENCY})`} error={shown("price")}>
                  <input
                    {...bind("price")}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    onWheel={blurOnWheel}
                  />
                </Field>
                <Field
                  id="field-offerPrice"
                  label={`Offer price (${CURRENCY})`}
                  error={shown("offerPrice")}
                  hint={hasOffer ? `${discount}% off, saves ${formatMoney(priceNum - offerNum)}` : "Same as price if no discount"}
                >
                  <input
                    {...bind("offerPrice")}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    onWheel={blurOnWheel}
                  />
                </Field>
                <Field id="field-stock" label="Stock" error={shown("stock")} hint="Units available">
                  <input
                    {...bind("stock")}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    onWheel={blurOnWheel}
                  />
                </Field>
              </div>
            </Section>
          </div>

          {/* ------------------------- Live preview ------------------------- */}
          <aside className="lg:sticky lg:top-4 self-start" aria-label="Live preview">
            <p className="text-sm font-medium text-gray-800 mb-2">How customers will see it</p>
            <div className="rounded-2xl border border-gray-300/70 bg-white overflow-hidden shadow-sm">
              <div className="relative aspect-square bg-gray-50 grid place-items-center">
                {previewImages.length > 0 ? (
                  <img
                    src={previewImages[activeIndex]}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={assets.upload_area} alt="" className="w-20 opacity-40" />
                )}
                {discount > 0 && (
                  <span className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-2 py-1 rounded-md">
                    {discount}% off
                  </span>
                )}
                {stockBadge && (
                  <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-md ${stockBadge.cls}`}>
                    {stockBadge.text}
                  </span>
                )}
              </div>

              {previewImages.length > 1 && (
                <div className="flex gap-2 p-3 pb-0 overflow-x-auto no-scrollbar">
                  {previewImages.map((src, i) => (
                    <button
                      type="button"
                      key={`${src}-${i}`}
                      onClick={() => setActiveImg(i)}
                      aria-label={`Show image ${i + 1}`}
                      className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 ${
                        i === activeIndex ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4">
                <p className="font-medium text-gray-900 break-words">
                  {form.name.trim() || <span className="text-gray-400">Product name</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 min-h-4">{quantityLabel}</p>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-lg font-semibold text-primary">
                    {displayPrice > 0 ? formatMoney(displayPrice) : `${CURRENCY}0`}
                  </span>
                  {hasOffer && (
                    <span className="text-sm text-gray-400 line-through">{formatMoney(priceNum)}</span>
                  )}
                </div>

                {bullets.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-gray-600 list-disc pl-4">
                    {bullets.slice(0, 3).map((b, i) => (
                      <li key={i} className="break-words">
                        {b}
                      </li>
                    ))}
                    {bullets.length > 3 && <li className="list-none -ml-4 text-gray-400">+{bullets.length - 3} more</li>}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Action bar */}
        <div className="sticky bottom-0 -mx-4 md:-mx-10 mt-10 px-4 md:px-10 py-3 bg-white/90 backdrop-blur border-t border-gray-200 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !isOnline}
            className="relative overflow-hidden min-w-40 px-8 py-2.5 rounded-lg bg-primary text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary-dull transition-colors"
          >
            {submitting && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-black/15 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-2">
              {submitting && <Spinner />}
              {submitting
                ? progress < 100
                  ? `Uploading ${progress}%`
                  : "Saving…"
                : editId
                ? "Save changes"
                : "Add product"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <span className="hidden md:inline text-xs text-gray-400 ml-auto">Ctrl/⌘ + S to save</span>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
