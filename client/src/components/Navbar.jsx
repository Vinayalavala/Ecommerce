// src/components/Navbar.jsx
import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { useAppContext } from "../context/appContext.jsx";
import { toast } from "react-hot-toast";
import { FiShoppingCart } from "react-icons/fi";
import { MdKeyboardArrowDown } from "react-icons/md";

/* ---------- small md5 function for gravatar (lightweight) ---------- */
const md5 = (s) => {
  // simple MD5 implementation — small, works in browser for emails
  // source: simplified implementation for this use-case
  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function toBytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) {
        out.push((c >> 6) | 192, (c & 63) | 128);
      } else {
        out.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
      }
    }
    return out;
  }

  function toHex(x) {
    const hex = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += hex.charAt((x >> (i * 8 + 4)) & 0x0f) + hex.charAt((x >> (i * 8)) & 0x0f);
    }
    return s;
  }

  // convert to bytes and pad per RFC
  const msg = toBytes(unescape(encodeURIComponent(s)));
  const origLen = msg.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0);
  // append original length in bits, little endian
  for (let i = 0; i < 8; i++) msg.push((origLen >>> (i * 8)) & 0xff);

  const M = [];
  for (let i = 0; i < msg.length; i += 64) {
    const chunk = [];
    for (let j = 0; j < 64; j += 4) {
      chunk.push(msg[i + j] | (msg[i + j + 1] << 8) | (msg[i + j + 2] << 16) | (msg[i + j + 3] << 24));
    }
    M.push(chunk);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < M.length; i++) {
    const X = M[i];
    let A = a0, B = b0, C = c0, D = d0;

    // round 1
    A = ff(A, B, C, D, X[0], 7, -680876936);
    D = ff(D, A, B, C, X[1], 12, -389564586);
    C = ff(C, D, A, B, X[2], 17, 606105819);
    B = ff(B, C, D, A, X[3], 22, -1044525330);
    A = ff(A, B, C, D, X[4], 7, -176418897);
    D = ff(D, A, B, C, X[5], 12, 1200080426);
    C = ff(C, D, A, B, X[6], 17, -1473231341);
    B = ff(B, C, D, A, X[7], 22, -45705983);
    A = ff(A, B, C, D, X[8], 7, 1770035416);
    D = ff(D, A, B, C, X[9], 12, -1958414417);
    C = ff(C, D, A, B, X[10], 17, -42063);
    B = ff(B, C, D, A, X[11], 22, -1990404162);
    A = ff(A, B, C, D, X[12], 7, 1804603682);
    D = ff(D, A, B, C, X[13], 12, -40341101);
    C = ff(C, D, A, B, X[14], 17, -1502002290);
    B = ff(B, C, D, A, X[15], 22, 1236535329);

    // round 2
    A = gg(A, B, C, D, X[1], 5, -165796510);
    D = gg(D, A, B, C, X[6], 9, -1069501632);
    C = gg(C, D, A, B, X[11], 14, 643717713);
    B = gg(B, C, D, A, X[0], 20, -373897302);
    A = gg(A, B, C, D, X[5], 5, -701558691);
    D = gg(D, A, B, C, X[10], 9, 38016083);
    C = gg(C, D, A, B, X[15], 14, -660478335);
    B = gg(B, C, D, A, X[4], 20, -405537848);
    A = gg(A, B, C, D, X[9], 5, 568446438);
    D = gg(D, A, B, C, X[14], 9, -1019803690);
    C = gg(C, D, A, B, X[3], 14, -187363961);
    B = gg(B, C, D, A, X[8], 20, 1163531501);
    A = gg(A, B, C, D, X[13], 5, -1444681467);
    D = gg(D, A, B, C, X[2], 9, -51403784);
    C = gg(C, D, A, B, X[7], 14, 1735328473);
    B = gg(B, C, D, A, X[12], 20, -1926607734);

    // round 3
    A = hh(A, B, C, D, X[5], 4, -378558);
    D = hh(D, A, B, C, X[8], 11, -2022574463);
    C = hh(C, D, A, B, X[11], 16, 1839030562);
    B = hh(B, C, D, A, X[14], 23, -35309556);
    A = hh(A, B, C, D, X[1], 4, -1530992060);
    D = hh(D, A, B, C, X[4], 11, 1272893353);
    C = hh(C, D, A, B, X[7], 16, -155497632);
    B = hh(B, C, D, A, X[10], 23, -1094730640);
    A = hh(A, B, C, D, X[13], 4, 681279174);
    D = hh(D, A, B, C, X[0], 11, -358537222);
    C = hh(C, D, A, B, X[3], 16, -722521979);
    B = hh(B, C, D, A, X[6], 23, 76029189);
    A = hh(A, B, C, D, X[9], 4, -640364487);
    D = hh(D, A, B, C, X[12], 11, -421815835);
    C = hh(C, D, A, B, X[15], 16, 530742520);
    B = hh(B, C, D, A, X[2], 23, -995338651);

    // round 4
    A = ii(A, B, C, D, X[0], 6, -198630844);
    D = ii(D, A, B, C, X[7], 10, 1126891415);
    C = ii(C, D, A, B, X[14], 15, -1416354905);
    B = ii(B, C, D, A, X[5], 21, -57434055);
    A = ii(A, B, C, D, X[12], 6, 1700485571);
    D = ii(D, A, B, C, X[3], 10, -1894986606);
    C = ii(C, D, A, B, X[10], 15, -1051523);
    B = ii(B, C, D, A, X[1], 21, -2054922799);
    A = ii(A, B, C, D, X[8], 6, 1873313359);
    D = ii(D, A, B, C, X[15], 10, -30611744);
    C = ii(C, D, A, B, X[6], 15, -1560198380);
    B = ii(B, C, D, A, X[13], 21, 1309151649);
    A = ii(A, B, C, D, X[4], 6, -145523070);
    D = ii(D, A, B, C, X[11], 10, -1120210379);
    C = ii(C, D, A, B, X[2], 15, 718787259);
    B = ii(B, C, D, A, X[9], 21, -343485551);

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  return [a0, b0, c0, d0].map(toHex).join("");
};

/* ------------------- helpers for profile image ------------------- */

/**
 * Attempts to produce a usable image URL from many possible `profilePic` inputs:
 * - absolute URL (http/https) => returned as-is
 * - data URL (data:) => returned as-is
 * - email-like string (contains @) => produce gravatar URL (identicon fallback)
 * - relative path or filename => prefix with REACT_APP_API_URL or window.origin, encoding final segment
 * - otherwise return null so caller can use the default icon
 */
const buildProfileUrl = (input, user) => {
  if (!input && !user) return null;

  const raw = typeof input === "string" ? input.trim() : "";

  // 1) data URL
  if (raw.startsWith("data:")) return raw;

  // 2) absolute url
  if (/^https?:\/\//i.test(raw)) return raw;

  // 3) if string looks like an email (contains @ and a dot), use gravatar first
  if (/@/.test(raw) && /\.[a-z]{2,}$/i.test(raw)) {
    const email = raw.toLowerCase().trim();
    const hash = md5(email);
    // use gravatar with identicon fallback, size 200
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  // 4) if input is missing but user.email exists, use gravatar for user.email
  if (!raw && user?.email) {
    const email = String(user.email).toLowerCase().trim();
    const hash = md5(email);
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  // 5) relative path or filename: encode only path segments safely
  if (raw) {
    const base = process.env.REACT_APP_API_URL || window.location.origin;
    const cleaned = raw.replace(/^\/+|\/+$/g, "");
    const parts = cleaned.split("/").map((p) => encodeURIComponent(p));
    return `${base.replace(/\/$/, "")}/${parts.join("/")}`;
  }

  return null;
};

/* ------------------- actual component ------------------- */

const Navbar = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [hideTopBar, setHideTopBar] = useState(false);
  const [hideBottomBar, setHideBottomBar] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const placeholders = [
    "Milk / Fruits",
    "Snacks / Chips",
    "Vegetables / Fresh Items",
    "Bakery / Cakes",
    "Beverages / Juices",
  ];

  const {
    axios,
    user,
    setUser,
    setShowUserLogin,
    setSearchQuery,
    searchQuery,
  } = useAppContext();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserIfMissing = async () => {
      if (!user) return;
      if (!user.profilePic || !user.email) {
        try {
          const { data } = await axios.get("/api/user/me");
          if (data?.success && data.user) setUser(data.user);
        } catch (err) {
          console.error("Failed to fetch /api/user/me:", err);
        }
      }
    };
    fetchUserIfMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profilePic, user?.email]);

  useEffect(() => {
    if (user && user._id) {
      (async () => {
        try {
          const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
          if (data.success) {
            setAddresses(data.addresses || []);
            if (Array.isArray(data.addresses) && data.addresses.length > 0) {
              setSelectedAddress(data.addresses[0]);
            }
          }
        } catch (err) {
          // ignore address errors
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // treat md as desktop: mobile when < 768
  const updateIsMobile = useCallback(() => setIsMobile(window.innerWidth < 768), []);
  useEffect(() => {
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, [updateIsMobile]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setHideTopBar(true);
          setHideBottomBar(true);
        } else {
          setHideTopBar(false);
          setHideBottomBar(false);
        }
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const i = setInterval(() => setPlaceholderIndex((p) => (p + 1) % placeholders.length), 2000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setSearchActive(Boolean(searchQuery && searchQuery.length > 0));
  }, [searchQuery]);

  // Build a list of fallback URLs / data to try (primary -> secondary -> default)
  const rawProfile = user?.profilePic;
  // primary attempt: buildProfileUrl(rawProfile, user)
  const primaryUrl = buildProfileUrl(rawProfile, user);
  // secondary attempt: if primary failed or equals an email we also try gravatar via user.email
  const gravatarFromUser = user?.email ? `https://www.gravatar.com/avatar/${md5(String(user.email).toLowerCase().trim())}?d=identicon&s=200` : null;

  // final fallback asset
  const defaultIcon = assets.profile_icon;

  // Render
  return (
    <>
      <nav className={`z-50 fixed top-0 left-0 w-full transition-transform duration-500 ease-in-out bg-white/90 backdrop-blur-md border-b border-gray-300 py-3 px-3 md:px-8 lg:px-15 ${hideTopBar ? "-translate-y-12" : "translate-y-0"}`}>
        {/* mobile logged-out compact */}
        {isMobile && !user ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-center">
               <div className="text-xl">Alavala's Root & Craft</div>
            </div>
            <div className="w-full px-4 flex gap-3">
              <button onClick={() => setShowUserLogin(true)} className="flex-1 py-2 bg-primary text-white rounded-full text-sm font-medium">Login</button>
              <button onClick={() => navigate("/seller")} className="flex-1 py-2 bg-white border border-gray-300 text-sm rounded-full">Seller</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`transition-opacity duration-300 ease-in-out ${hideTopBar ? "opacity-0 pointer-events-none" : "opacity-100"} py-1`}>
              <div className="flex items-center justify-between w-full">
                <NavLink to="/" className="hidden sm:block" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <img src={assets.logo} alt="logo" className="h-10" />
                </NavLink>

                <div className="hidden lg:flex flex-1 mx-4 items-center text-sm gap-2 border border-gray-300 px-3 rounded-full max-w-md bg-white relative overflow-hidden">
                  <input onChange={(e) => setSearchQuery(e.target.value)} value={searchQuery} className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500" type="text"
                    onFocus={() => setSearchActive(true)}
                    onBlur={() => { if (!searchQuery || searchQuery.length === 0) setSearchActive(false); }}
                  />
                  <div className={`absolute left-4 flex items-center pointer-events-none select-none transition-opacity duration-200 ${searchActive ? "opacity-0" : "opacity-100"}`}>
                    <span className="text-gray-400">Search for&nbsp;</span>
                    <div className="h-5 overflow-hidden relative">
                      <div className="flex flex-col transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${placeholderIndex * 20}px)` }}>
                        {placeholders.map((text, i) => <span key={i} className="h-5 text-gray-500">{text}</span>)}
                      </div>
                    </div>
                  </div>
                  <img src={assets.search_icon} alt="search" className="w-4 h-4 ml-auto" />
                </div>

                <div className="hidden lg:flex items-center gap-8">
                  <NavLink to="/" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Home</NavLink>
                  <NavLink to="/products" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Products</NavLink>
                  <NavLink to="/contact" className={({ isActive }) => isActive ? 'text-primary font-semibold' : ''}>Contact</NavLink>

                  {!user ? (
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => setShowUserLogin(true)} className="px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-full text-sm">Login</button>
                      <button onClick={() => navigate("/seller")} className="px-4 py-1.5 bg-primary hover:bg-primary-dull text-white rounded-full text-sm">Seller</button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* <img> with robust onError chain */}
                      <img
                        src={primaryUrl || gravatarFromUser || defaultIcon}
                        alt={user?.name || "user"}
                        className="w-8 h-8 cursor-pointer rounded-full object-cover"
                        onClick={() => navigate("/profile")}
                        onError={(e) => {
                          // if primary failed, try gravatarFromUser, then default
                          console.warn("[Navbar] profile img load failed for:", rawProfile, "attempting fallback.");
                          const cur = e.currentTarget;
                          // prevent infinite loop
                          cur.onerror = null;
                          if (primaryUrl && gravatarFromUser && cur.src !== gravatarFromUser) {
                            cur.src = gravatarFromUser;
                          } else {
                            cur.src = defaultIcon;
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* mobile profile info (< lg) */}
              {user && (
                <div className="lg:hidden flex items-center gap-3 mt-3 px-1">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/profile")}>
                    <img
                      src={primaryUrl || gravatarFromUser || defaultIcon}
                      alt={user?.name || "user"}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        console.warn("[Navbar] mobile profile img load failed for:", rawProfile);
                        const cur = e.currentTarget; cur.onerror = null;
                        if (primaryUrl && gravatarFromUser && cur.src !== gravatarFromUser) cur.src = gravatarFromUser;
                        else cur.src = defaultIcon;
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      {/* email hidden on mobile as requested */}
                    </div>
                  </div>
                  {selectedAddress && (
                    <span onClick={() => navigate("/add-address")} className="text-gray-500 text-xs truncate max-w-[250px] cursor-pointer">{selectedAddress.street}</span>
                  )}
                  <button onClick={() => console.log("menu open")} className="ml-auto bg-gray-100 p-1 rounded-full" aria-label="open menu"><MdKeyboardArrowDown/></button>
                </div>
              )}

              {!user && (
                <div className="lg:hidden flex flex-col items-start gap-2 mt-4 px-1 w-full">
                  <button onClick={() => setShowUserLogin(true)} className="w-full py-2 bg-primary hover:bg-primary-dull text-white rounded-full text-sm">Login</button>
                  <button onClick={() => navigate("/seller")} className="w-full py-2 bg-primary hover:bg-primary-dull text-white rounded-full text-sm">Seller</button>
                </div>
              )}
            </div>

            {/* mobile search bar (< lg) */}
            <div className={`lg:hidden mb-3 transition-all duration-300 ${hideTopBar ? 'flex justify-center items-center h-3' : 'mt-0'}`}>
              <div className="flex items-center text-sm gap-2 border border-gray-300 px-3 py-1.5 rounded-full w-full max-w-md bg-white shadow-sm relative overflow-hidden mx-auto">
                <input onChange={(e) => setSearchQuery(e.target.value)} value={searchQuery} className="w-full bg-transparent outline-none placeholder-gray-500" type="text"
                  onFocus={() => setSearchActive(true)}
                  onBlur={() => { if (!searchQuery || searchQuery.length === 0) setSearchActive(false); }}
                />
                <div className={`absolute left-4 flex items-center pointer-events-none select-none transition-opacity duration-200 ${searchActive ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="text-gray-400">Search for&nbsp;</span>
                  <div className="h-5 overflow-hidden relative">
                    <div className="flex flex-col transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${placeholderIndex * 20}px)` }}>
                      {placeholders.map((text, i) => <span key={i} className="h-5 text-gray-500">{text}</span>)}
                    </div>
                  </div>
                </div>
                <img src={assets.search_icon} alt="search" className="w-4 h-4 ml-auto"/>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* bottom navbar for mobile */}
      <div className={`sm:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-md rounded-2xl px-3 py-2 flex justify-between items-center bg-white/30 backdrop-blur-md border border-gray-300 z-50 shadow-xl transition-all duration-[800ms] ease-in-out ${hideBottomBar ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"}`}>
        <button onClick={() => navigate("/")} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <img src={assets.home_icon || assets.menu_icon} alt="home" className="w-6 h-6 mb-1" />
          <span>Home</span>
        </button>
        <button onClick={() => navigate("/products")} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-6 h-6 mb-1 text-gray-600" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73zM12 3.25L18.6 7 12 10.75 5.4 7 12 3.25zM5 8.9l6.5 3.7v7.2L5 16.1V8.9zm8.5 10.9v-7.2L20 8.9v7.2l-6.5 3.7z" /></svg>
          <span>Products</span>
        </button>
        <button onClick={() => navigate("/cart")} className="flex flex-col items-center text-xs text-gray-700 hover:text-primary">
          <FiShoppingCart className="w-6 h-6 mb-1" />
          <span>Cart</span>
        </button>
      </div>
    </>
  );
};

export default Navbar;
