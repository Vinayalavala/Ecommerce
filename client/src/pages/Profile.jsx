// src/components/Profile.jsx
import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiHeart,
  FiMapPin,
  FiShare2,
  FiPackage,
} from "react-icons/fi";
import assets from "../assets/assets";
import { toast } from "react-hot-toast";
import { MdKeyboardArrowRight } from "react-icons/md";

/* --------- small MD5 for Gravatar (works for browser) --------- */
const md5 = (s) => {
  // Minimal MD5 implementation for hashing emails for gravatar
  function rot(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q, a, b, x, s, t) { a = (a + q + x + t) | 0; return (rot(a, s) + b) | 0; }
  function ff(a,b,c,d,x,s,t){ return cmn((b & c) | (~b & d), a,b,x,s,t); }
  function gg(a,b,c,d,x,s,t){ return cmn((b & d) | (c & ~d), a,b,x,s,t); }
  function hh(a,b,c,d,x,s,t){ return cmn(b ^ c ^ d, a,b,x,s,t); }
  function ii(a,b,c,d,x,s,t){ return cmn(c ^ (b | ~d), a,b,x,s,t); }

  const utf8 = unescape(encodeURIComponent(s));
  const msg = [];
  for (let i=0;i<utf8.length;i++) msg.push(utf8.charCodeAt(i));
  const origBitLen = msg.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0);
  for (let i=0;i<8;i++) msg.push((origBitLen >>> (i*8)) & 0xff);

  const M = [];
  for (let i=0;i<msg.length;i+=64){
    const chunk = [];
    for (let j=0;j<64;j+=4){
      chunk.push(msg[i+j] | (msg[i+j+1]<<8) | (msg[i+j+2]<<16) | (msg[i+j+3]<<24));
    }
    M.push(chunk);
  }

  let a0=0x67452301, b0=0xefcdab89, c0=0x98badcfe, d0=0x10325476;
  for (let i=0;i<M.length;i++){
    const X=M[i];
    let A=a0,B=b0,C=c0,D=d0;

    A = ff(A,B,C,D,X[0],7,-680876936);
    D = ff(D,A,B,C,X[1],12,-389564586);
    C = ff(C,D,A,B,X[2],17,606105819);
    B = ff(B,C,D,A,X[3],22,-1044525330);
    A = ff(A,B,C,D,X[4],7,-176418897);
    D = ff(D,A,B,C,X[5],12,1200080426);
    C = ff(C,D,A,B,X[6],17,-1473231341);
    B = ff(B,C,D,A,X[7],22,-45705983);
    A = ff(A,B,C,D,X[8],7,1770035416);
    D = ff(D,A,B,C,X[9],12,-1958414417);
    C = ff(C,D,A,B,X[10],17,-42063);
    B = ff(B,C,D,A,X[11],22,-1990404162);
    A = ff(A,B,C,D,X[12],7,1804603682);
    D = ff(D,A,B,C,X[13],12,-40341101);
    C = ff(C,D,A,B,X[14],17,-1502002290);
    B = ff(B,C,D,A,X[15],22,1236535329);

    A = gg(A,B,C,D,X[1],5,-165796510);
    D = gg(D,A,B,C,X[6],9,-1069501632);
    C = gg(C,D,A,B,X[11],14,643717713);
    B = gg(B,C,D,A,X[0],20,-373897302);
    A = gg(A,B,C,D,X[5],5,-701558691);
    D = gg(D,A,B,C,X[10],9,38016083);
    C = gg(C,D,A,B,X[15],14,-660478335);
    B = gg(B,C,D,A,X[4],20,-405537848);
    A = gg(A,B,C,D,X[9],5,568446438);
    D = gg(D,A,B,C,X[14],9,-1019803690);
    C = gg(C,D,A,B,X[3],14,-187363961);
    B = gg(B,C,D,A,X[8],20,1163531501);
    A = gg(A,B,C,D,X[13],5,-1444681467);
    D = gg(D,A,B,C,X[2],9,-51403784);
    C = gg(C,D,A,B,X[7],14,1735328473);
    B = gg(B,C,D,A,X[12],20,-1926607734);

    A = hh(A,B,C,D,X[5],4,-378558);
    D = hh(D,A,B,C,X[8],11,-2022574463);
    C = hh(C,D,A,B,X[11],16,1839030562);
    B = hh(B,C,D,A,X[14],23,-35309556);
    A = hh(A,B,C,D,X[1],4,-1530992060);
    D = hh(D,A,B,C,X[4],11,1272893353);
    C = hh(C,D,A,B,X[7],16,-155497632);
    B = hh(B,C,D,A,X[10],23,-1094730640);
    A = hh(A,B,C,D,X[13],4,681279174);
    D = hh(D,A,B,C,X[0],11,-358537222);
    C = hh(C,D,A,B,X[3],16,-722521979);
    B = hh(B,C,D,A,X[6],23,76029189);
    A = hh(A,B,C,D,X[9],4,-640364487);
    D = hh(D,A,B,C,X[12],11,-421815835);
    C = hh(C,D,A,B,X[15],16,530742520);
    B = hh(B,C,D,A,X[2],23,-995338651);

    A = ii(A,B,C,D,X[0],6,-198630844);
    D = ii(D,A,B,C,X[7],10,1126891415);
    C = ii(C,D,A,B,X[14],15,-1416354905);
    B = ii(B,C,D,A,X[5],21,-57434055);
    A = ii(A,B,C,D,X[12],6,1700485571);
    D = ii(D,A,B,C,X[3],10,-1894986606);
    C = ii(C,D,A,B,X[10],15,-1051523);
    B = ii(B,C,D,A,X[1],21,-2054922799);
    A = ii(A,B,C,D,X[8],6,1873313359);
    D = ii(D,A,B,C,X[15],10,-30611744);
    C = ii(C,D,A,B,X[6],15,-1560198380);
    B = ii(B,C,D,A,X[13],21,1309151649);
    A = ii(A,B,C,D,X[4],6,-145523070);
    D = ii(D,A,B,C,X[11],10,-1120210379);
    C = ii(C,D,A,B,X[2],15,718787259);
    B = ii(B,C,D,A,X[9],21,-343485551);

    a0=(a0+A)|0; b0=(b0+B)|0; c0=(c0+C)|0; d0=(d0+D)|0;
  }

  const toHex = (n) => {
    const hex="0123456789abcdef";
    let s="";
    for (let i=0;i<4;i++){
      s += hex.charAt((n >> (i*8+4)) & 0x0f) + hex.charAt((n >> (i*8)) & 0x0f);
    }
    return s;
  };

  return [a0,b0,c0,d0].map(toHex).join("");
};

/* --------- buildProfileUrl (robust, no logs) --------- */
const buildProfileUrl = (input, user) => {
  if (!input && !user) return null;
  const raw = input && typeof input === "string" ? input.trim() : "";

  if (raw.startsWith("data:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  if (/@/.test(raw) && /\.[a-z]{2,}$/i.test(raw)) {
    const hash = md5(raw.toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  if (!raw && user?.email) {
    const hash = md5(String(user.email).toLowerCase().trim());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  if (raw) {
    const base = process.env.REACT_APP_API_URL || window.location.origin;
    const cleaned = raw.replace(/^\/+|\/+$/g, "");
    const parts = cleaned.split("/").map((p) => encodeURIComponent(p));
    return `${base.replace(/\/$/, "")}/${parts.join("/")}`;
  }

  return null;
};

/* ------------------ Profile component ------------------ */
const Profile = () => {
  const { axios, user, setUser } = useAppContext();
  const [phone, setPhone] = useState("");
  const [imgSrc, setImgSrc] = useState(null);
  const navigate = useNavigate();

  // fetch phone
  useEffect(() => {
    const getPhoneNumber = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
        if (data?.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setPhone(data.addresses[0].phone || "");
        } else {
          setPhone("");
        }
      } catch {
        setPhone("");
      }
    };
    getPhoneNumber();
  }, [user, axios]);

  // ensure user has latest fields; fetch /api/user/me silently if missing
  useEffect(() => {
    const fetchIfMissing = async () => {
      if (!user) return;
      if (!user.profilePic || !user.email) {
        try {
          const { data } = await axios.get("/api/user/me");
          if (data?.success && data.user) setUser(data.user);
        } catch {
          /* silent */
        }
      }
    };
    fetchIfMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profilePic, user?.email]);

  // build imgSrc with fallbacks (primary -> gravatar -> default)
  useEffect(() => {
    const primary = buildProfileUrl(user?.profilePic, user);
    const gravatar = user?.email ? `https://www.gravatar.com/avatar/${md5(String(user.email).toLowerCase().trim())}?d=identicon&s=200` : null;
    const fallback = assets.profile_icon;
    setImgSrc(primary || gravatar || fallback);
  }, [user]);

  const logout = async () => {
    try {
      const { data } = await axios.get("/api/user/logout");
      if (data?.success) {
        localStorage.removeItem("authToken");
        toast.success(data.message || "Logged out");
        setUser(null);
        navigate("/");
      } else {
        toast.error(data?.message || "Logout failed");
      }
    } catch (error) {
      toast.error(error.message || "Logout failed");
    }
  };

  const listItems = [
    { label: "Your Orders", icon: <FiPackage className="text-black w-5 h-5" />, action: () => navigate("/my-orders") },
    { label: "Your Wishlist", icon: <FiHeart className="text-black w-5 h-5" />, action: () => navigate("/wishlist") },
    { label: "Address Book", icon: <FiMapPin className="text-black w-5 h-5" />, action: () => navigate("/add-address") },
    { label: "Share the Application", icon: <FiShare2 className="text-black w-5 h-5" />, action: () => { navigator.clipboard.writeText(window.location.origin); toast.success("Link copied to clipboard!"); } },
    { label: "Logout", icon: <FiLogOut className="text-black w-5 h-5" />, action: logout },
  ];

  return (
    <div className="mt-30 pb-16 px-4 md:px-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Information</h2>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow flex items-center gap-4">
            <img
              src={imgSrc || assets.profile_icon}
              alt={user?.name ? `${user.name} profile` : "Profile"}
              className="w-16 h-16 rounded-full object-cover border"
              onError={(e) => {
                const cur = e.currentTarget;
                cur.onerror = null;
                const gravatar = user?.email ? `https://www.gravatar.com/avatar/${md5(String(user.email).toLowerCase().trim())}?d=identicon&s=200` : null;
                if (cur.src !== gravatar && gravatar) {
                  cur.src = gravatar;
                } else {
                  cur.src = assets.profile_icon;
                }
              }}
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{user?.name || "Your Account"}</h2>
              <p className="text-gray-500 text-sm">{user?.email || "No email found"}</p>
              <p className="text-gray-500 text-sm">{phone || "No phone found"}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {listItems.map((item, idx) => (
            <div key={idx} onClick={item.action} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-full">{item.icon}</div>
                <span className="text-gray-800">{item.label}</span>
              </div>
              <MdKeyboardArrowRight className="text-gray-400 w-5 h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
