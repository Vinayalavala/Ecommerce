// src/components/Navbar.jsx
import React, { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiX,
  FiClock,
  FiShoppingCart,
  FiHome,
  FiGrid,
  FiUser,
  FiHeart,
  FiPackage,
  FiMapPin,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";
import assets from "../assets/assets";
import { useAppContext } from "../context/appContext.jsx";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const PLACEHOLDERS = [
  "milk and fruits",
  "snacks and chips",
  "fresh vegetables",
  "bakery and cakes",
  "juices and drinks",
];
const RECENT_KEY = "nav:recent-searches";
const MAX_RECENT = 5;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 300;

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products" },
  { to: "/contact", label: "Contact" },
];

const MENU_ITEMS = [
  { to: "/profile", label: "My profile", icon: FiUser },
  { to: "/my-orders", label: "My orders", icon: FiPackage },
  { to: "/wishlist", label: "Wishlist", icon: FiHeart },
  { to: "/add-address", label: "Delivery addresses", icon: FiMapPin },
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const readRecent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const writeRecent = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
};

/** Resolve a stored profile picture into a usable URL (no third-party lookups). */
const resolveProfileUrl = (raw, baseURL) => {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  if (/^(data:|https?:\/\/)/i.test(v)) return v;
  const base = (baseURL || window.location.origin).replace(/\/$/, "");
  const path = v
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${base}/${path}`;
};

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

const isProductPath = (path) =>
  /^\/product\/[^/]+\/?$/.test(path) || /^\/products\/[^/]+\/[^/]+\/?$/.test(path);

/** Debounced, abortable product suggestions. */
const useSuggestions = (axios, query) => {
  const [state, setState] = useState({ items: [], loading: false });

  useEffect(() => {
    const q = query.trim();
    if (q.length < SUGGEST_MIN_CHARS) {
      setState({ items: [], loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get("/api/product/search", {
          params: { query: q, limit: 8 },
          signal: controller.signal,
        });
        setState({
          items: data?.success && Array.isArray(data.products) ? data.products : [],
          loading: false,
        });
      } catch (err) {
        if (controller.signal.aborted) return; // superseded by a newer query
        console.error("Search suggestions error:", err);
        setState({ items: [], loading: false });
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [axios, query]);

  return state;
};

/* -------------------------------------------------------------------------- */
/*                     Presentational pieces (outside Navbar)                 */
/* -------------------------------------------------------------------------- */

const Highlight = ({ text = "", query }) => {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-gray-900">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
};

const Avatar = ({ name, src, size = 36 }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const style = { width: size, height: size };
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        className="rounded-full object-cover bg-gray-100"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: size * 0.38 }}
      className="grid place-items-center rounded-full bg-primary/10 text-primary font-semibold"
    >
      {initialsOf(name)}
    </span>
  );
};

const CartBadge = ({ count }) =>
  count > 0 ? (
    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[11px] font-semibold grid place-items-center">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

/**
 * Search box with live suggestions, recent searches and full combobox keyboard support.
 * Defined outside Navbar so the input never remounts (and loses focus) on re-render.
 */
const SearchBox = ({ axios, query, setQuery, navigate, currency, onFocusChange, className = "" }) => {
  const listId = useId();
  const inputRef = useRef(null);

  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(readRecent);
  const [phIndex, setPhIndex] = useState(0);

  const { items, loading } = useSuggestions(axios, query);
  const q = query.trim();

  // Rows shown in the dropdown
  const rows = [];
  if (!q) {
    recent.forEach((t) => rows.push({ type: "recent", key: `r-${t}`, text: t }));
  } else if (q.length >= SUGGEST_MIN_CHARS) {
    items.forEach((p, i) =>
      rows.push({ type: "product", key: p._id || `${p.name}-${i}`, product: p })
    );
    rows.push({ type: "all", key: "all", text: q });
  }
  const open = focused && rows.length > 0;
  const activeIdx = active < rows.length ? active : -1;

  // Rotating placeholder: only while idle, and not for reduced-motion users
  useEffect(() => {
    if (query || focused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 2500);
    return () => clearInterval(t);
  }, [query, focused]);

  // Press "/" anywhere to jump to search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const typing =
        t instanceof HTMLElement &&
        (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveRecent = (text) => {
    const t = text.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    writeRecent(next);
  };

  const clearRecent = () => {
    setRecent([]);
    writeRecent([]);
  };

  const close = () => {
    setFocused(false);
    setActive(-1);
    onFocusChange?.(false);
    inputRef.current?.blur();
  };

  const runSearch = (text) => {
    const t = text.trim();
    setQuery(t);
    saveRecent(t);
    close();
    navigate(t ? `/products?search=${encodeURIComponent(t)}` : "/products");
  };

  const activate = (row) => {
    if (row.type === "product") {
      saveRecent(q);
      close();
      const p = row.product;
      navigate(p._id ? `/product/${p._id}` : `/products?search=${encodeURIComponent(p.name || q)}`);
    } else {
      runSearch(row.text);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (activeIdx >= 0 && rows[activeIdx]) activate(rows[activeIdx]);
    else runSearch(query);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && rows.length) {
      e.preventDefault();
      setFocused(true);
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp" && rows.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setFocused(false);
      setActive(-1);
    }
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      onBlur={(e) => {
        // close only when focus leaves the whole search box
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setFocused(false);
          setActive(-1);
          onFocusChange?.(false);
        }
      }}
      className={`relative ${className}`}
    >
      <div className="relative flex items-center gap-2 h-10 px-4 rounded-full bg-gray-100 border border-transparent transition focus-within:bg-white focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
        <FiSearch className="shrink-0 text-gray-500" size={16} aria-hidden="true" />

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setFocused(true);
          }}
          onFocus={() => {
            setFocused(true);
            onFocusChange?.(true);
          }}
          onKeyDown={onKeyDown}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label="Search products"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
        />

        {/* Rotating placeholder (decorative) */}
        {!query && !focused && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute left-10 right-10 flex items-center text-sm text-gray-500"
          >
            <span className="shrink-0">Search for&nbsp;</span>
            <span className="relative h-5 overflow-hidden">
              <span
                className="flex flex-col transition-transform duration-500 ease-in-out motion-reduce:transition-none"
                style={{ transform: `translateY(-${phIndex * 1.25}rem)` }}
              >
                {PLACEHOLDERS.map((t) => (
                  <span key={t} className="h-5 leading-5 whitespace-nowrap">
                    {t}
                  </span>
                ))}
              </span>
            </span>
          </div>
        )}

        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 grid place-items-center w-6 h-6 rounded-full text-gray-500 hover:bg-gray-200"
          >
            <FiX size={14} />
          </button>
        ) : (
          !focused && (
            <kbd className="hidden lg:inline-block shrink-0 text-[11px] text-gray-400 border border-gray-300 rounded px-1.5 py-0.5">
              /
            </kbd>
          )
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          {!q && (
            <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-gray-500">
              <span>Recent searches</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearRecent}
                className="hover:text-primary"
              >
                Clear
              </button>
            </div>
          )}

          {q.length >= SUGGEST_MIN_CHARS && loading && items.length === 0 && (
            <p role="status" className="px-4 pt-3 pb-1 text-sm text-gray-500">
              Searching…
            </p>
          )}
          {q.length >= SUGGEST_MIN_CHARS && !loading && items.length === 0 && (
            <p role="status" className="px-4 pt-3 pb-1 text-sm text-gray-500">
              No quick matches. Search all products instead.
            </p>
          )}

          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-72 overflow-y-auto py-1">
            {rows.map((row, i) => {
              const isActive = i === activeIdx;
              const p = row.product;
              const thumb = p?.image?.[0] ?? p?.images?.[0];
              const price = p ? p.offerPrice ?? p.price : null;
              return (
                <li
                  key={row.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                  onMouseEnter={() => setActive(i)}
                  onClick={() => activate(row)}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
                >
                  {row.type === "product" ? (
                    <>
                      {thumb ? (
                        <img src={thumb} alt="" className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                      ) : (
                        <span className="w-10 h-10 rounded-md bg-gray-100 grid place-items-center text-gray-400">
                          <FiPackage size={16} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-700 truncate">
                          <Highlight text={p.name} query={q} />
                        </span>
                        {price != null && (
                          <span className="block text-xs text-gray-500">
                            {currency}
                            {price}
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-10 h-10 grid place-items-center text-gray-400">
                        {row.type === "recent" ? <FiClock size={16} /> : <FiSearch size={16} />}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        {row.type === "recent" ? row.text : <>Search for “{row.text}”</>}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Navbar                                   */
/* -------------------------------------------------------------------------- */

const Navbar = () => {
  const {
    axios,
    user,
    setUser,
    setShowUserLogin,
    setSearchQuery,
    searchQuery,
    currency = "₹",
    getCartCount,
    logout,
  } = useAppContext();

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hidden, setHidden] = useState(false); // slid away on scroll-down (mobile/tablet)
  const [scrolled, setScrolled] = useState(false);

  const accountRef = useRef(null);
  const lastY = useRef(0);
  const triedMeFor = useRef(null);

  const userId = user?._id;
  const cartCount = typeof getCartCount === "function" ? Number(getCartCount()) || 0 : 0;
  const profileUrl = resolveProfileUrl(user?.profilePic, axios?.defaults?.baseURL);
  const hideBottomBar = isProductPath(pathname); // product pages have their own buy bar

  /* ------------------------------- Data effects ------------------------------ */

  // Fill in missing profile details once per user
  useEffect(() => {
    if (!userId || (user.profilePic && user.email)) return;
    if (triedMeFor.current === userId) return;
    triedMeFor.current = userId;
    axios
      .get("/api/user/me")
      .then(({ data }) => {
        if (data?.success && data.user) setUser(data.user);
      })
      .catch((err) => console.error("Failed to fetch /api/user/me:", err));
  }, [userId, user, axios, setUser]);

  // Delivery address (cleared on logout)
  useEffect(() => {
    if (!userId) {
      setSelectedAddress(null);
      return;
    }
    let cancelled = false;
    axios
      .get("/api/address/get", { params: { userId } })
      .then(({ data }) => {
        if (cancelled) return;
        setSelectedAddress(data?.success && data.addresses?.length ? data.addresses[0] : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, axios]);

  /* ------------------------------- UI effects -------------------------------- */

  // Hide on scroll-down / show on scroll-up (ref-based: no re-subscribing, passive)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const delta = y - lastY.current;
      if (Math.abs(delta) < 8) return;
      setHidden(delta > 0 && y > 80);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close account menu on route change
  useEffect(() => setAccountOpen(false), [pathname]);

  // Close account menu on outside click / Escape
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setAccountOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const keepVisible = searchFocused || accountOpen;
  const slideAway = hidden && !keepVisible;

  const addressLabel = selectedAddress
    ? [selectedAddress.street, selectedAddress.city].filter(Boolean).join(", ")
    : "";

  /* --------------------------------- Render ---------------------------------- */

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 px-3 md:px-8 py-2.5 transition-[transform,box-shadow] duration-300 ${
          scrolled ? "shadow-sm" : ""
        } ${slideAway ? "-translate-y-full lg:translate-y-0" : "translate-y-0"}`}
      >
        <nav aria-label="Main" className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-2">
          {/* Logo */}
          <NavLink to="/" aria-label="Home" className="order-1 shrink-0">
            <img src={assets.logo} alt="Store logo" className="h-8 sm:h-10" />
          </NavLink>

          {/* Delivery location */}
          {user && (
            <button
              type="button"
              onClick={() => navigate("/add-address")}
              className="order-2 flex-1 min-w-0 lg:flex-none lg:max-w-[220px] flex items-center gap-2 text-left rounded-lg px-2 py-1 hover:bg-gray-100"
            >
              <FiMapPin className="shrink-0 text-primary" size={16} aria-hidden="true" />
              <span className="min-w-0 leading-tight">
                <span className="block text-[11px] text-gray-500">Deliver to</span>
                <span className="block text-sm font-medium truncate">
                  {addressLabel || "Add an address"}
                </span>
              </span>
            </button>
          )}

          {/* Search (wraps to its own row below lg) */}
          <SearchBox
            axios={axios}
            query={searchQuery ?? ""}
            setQuery={setSearchQuery}
            navigate={navigate}
            currency={currency}
            onFocusChange={setSearchFocused}
            className="order-5 w-full lg:order-3 lg:flex-1 lg:max-w-xl lg:mx-auto"
          />

          {/* Desktop links */}
          <div className="hidden lg:flex order-4 items-center gap-7">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative py-1 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-primary"
                      : "text-gray-700 hover:text-primary"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Cart + account */}
          <div className="order-3 lg:order-6 ml-auto flex items-center gap-1 sm:gap-3">
            <NavLink
              to="/cart"
              aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
              className="hidden sm:grid relative place-items-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100"
            >
              <FiShoppingCart size={20} />
              <CartBadge count={cartCount} />
            </NavLink>

            {!user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/seller")}
                  className="px-2 py-1.5 text-sm text-gray-600 hover:text-primary"
                >
                  Seller
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserLogin(true)}
                  className="px-5 py-2 rounded-full bg-primary hover:bg-primary-dull text-white text-sm font-medium transition-colors"
                >
                  Log in
                </button>
              </>
            ) : (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  aria-label="Account menu"
                  className="flex items-center gap-1 rounded-full p-0.5 sm:pr-2 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Avatar name={user.name} src={profileUrl} size={36} />
                  <FiChevronDown
                    aria-hidden="true"
                    className={`hidden sm:block text-gray-500 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-xl py-1.5 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                    </div>
                    {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Icon size={16} className="text-gray-500" aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                    {typeof logout === "function" && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1.5"
                      >
                        <FiLogOut size={16} aria-hidden="true" />
                        Log out
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Bottom bar for phones (hidden on product pages, which have their own buy bar) */}
      {!hideBottomBar && (
        <nav
          aria-label="Quick navigation"
          className={`sm:hidden fixed left-1/2 -translate-x-1/2 w-[94%] max-w-md z-50 flex items-stretch rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl px-1 py-1.5 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-[transform,opacity] duration-300 ${
            hidden && !keepVisible ? "translate-y-24 opacity-0 invisible" : "translate-y-0 opacity-100"
          }`}
        >
          {[
            { to: "/", label: "Home", icon: FiHome, end: true },
            { to: "/products", label: "Products", icon: FiGrid },
            { to: "/cart", label: "Cart", icon: FiShoppingCart, badge: cartCount },
          ].map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-1 text-xs ${
                  isActive ? "text-primary font-semibold" : "text-gray-600"
                }`
              }
            >
              <span className="relative">
                <Icon size={22} aria-hidden="true" />
                <CartBadge count={badge || 0} />
              </span>
              {label}
            </NavLink>
          ))}

          {user ? (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-1 text-xs ${
                  isActive ? "text-primary font-semibold" : "text-gray-600"
                }`
              }
            >
              <FiUser size={22} aria-hidden="true" />
              Account
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => setShowUserLogin(true)}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 text-xs text-gray-600"
            >
              <FiUser size={22} aria-hidden="true" />
              Log in
            </button>
          )}
        </nav>
      )}
    </>
  );
};

export default Navbar;
