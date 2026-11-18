import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/appContext.jsx";
import { toast } from "react-hot-toast";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaTimes,
  FaArrowLeft,
} from "react-icons/fa";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

/* ------------------ Copy per mode ------------------ */
const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to continue shopping",
    cta: "Sign in",
  },
  register: {
    title: "Create your account",
    subtitle: "It only takes a minute to get started",
    cta: "Create account",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "Confirm your security question to set a new password",
    cta: "Reset password",
  },
};

const INPUT_CLASS =
  "w-full bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none";

/* ------------------ Small components ------------------ */
const Field = ({ id, label, icon: Icon, right, hint, children }) => (
  <div className="w-full">
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={id} className="text-xs font-medium text-gray-700">
        {label}
      </label>
      {right}
    </div>
    <div className="group flex items-center gap-2.5 rounded-lg border border-gray-300 bg-white px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <Icon
        size={14}
        aria-hidden="true"
        className="shrink-0 text-gray-400 transition group-focus-within:text-primary"
      />
      {children}
    </div>
    {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

const Divider = ({ children }) => (
  <div className="flex items-center gap-3 text-xs text-gray-400">
    <span className="h-px flex-1 bg-gray-200" />
    {children}
    <span className="h-px flex-1 bg-gray-200" />
  </div>
);

/* ------------------ Component ------------------ */
const Login = () => {
  const { setShowUserLogin, setUser, axios, navigate } = useAppContext();

  // "login", "register", or "forgot"
  const [state, setState] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[state];

  const switchState = (next) => {
    setState(next);
    setPassword("");
    setShowPassword(false);
    if (next !== "register") setName("");
  };

  const close = () => setShowUserLogin(false);

  // Shared by email/password and Google flows
  const completeLogin = (data, message) => {
    localStorage.setItem("authToken", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    setShowUserLogin(false);
    navigate("/");
    toast.success(message);
  };

  // Submit (login / register / forgot)
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (state === "forgot") {
        const { data } = await axios.post("/api/user/forgot-password", {
          email,
          securityQuestion,
          newPassword: password,
        });

        data.success ? toast.success(data.message) : toast.error(data.message);
        if (data.success) switchState("login");
        return;
      }

      const payload =
        state === "register"
          ? { name, email, password, securityQuestion }
          : { email, password };

      const { data } = await axios.post(`/api/user/${state}`, payload);

      if (data.success) {
        completeLogin(
          data,
          data.message || (state === "login" ? "Login successful" : "Account created")
        );
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Attach auth header if token exists
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [axios]);

  // Close on Escape + lock page scroll while the modal is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowUserLogin(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [setShowUserLogin]);

  // Google login success -> send credential to backend
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        toast.error("Google login failed (no credential)");
        return;
      }

      const { data } = await axios.post("/api/user/google-login", { credential });

      if (data.success) {
        completeLogin(data, "Logged in with Google");
      } else {
        toast.error(data.message || "Google login failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Google login failed");
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <style>{`
        @keyframes loginCardIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        .login-card { animation: loginCardIn .18s ease-out; }
        @media (prefers-reduced-motion: reduce) { .login-card { animation: none; } }
      `}</style>

      {/* Overlay: only a press that starts AND ends on the backdrop closes it,
          so drag-selecting text inside an input no longer dismisses the modal */}
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      >
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          onSubmit={onSubmitHandler}
          className="login-card relative my-auto flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-2xl sm:p-8"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FaTimes size={14} />
          </button>

          {/* Header */}
          <div className="text-center">
            <h2 id="login-title" className="text-2xl font-semibold text-gray-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{copy.subtitle}</p>
          </div>

          {/* Mode switch (login / register) or back link (forgot) */}
          {state === "forgot" ? (
            <button
              type="button"
              onClick={() => switchState("login")}
              className="flex items-center gap-2 self-start text-xs font-medium text-gray-500 transition hover:text-primary"
            >
              <FaArrowLeft size={10} /> Back to sign in
            </button>
          ) : (
            <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1" role="tablist">
              {[
                ["login", "Sign in"],
                ["register", "Sign up"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={state === value}
                  onClick={() => switchState(value)}
                  className={`rounded-md py-1.5 text-sm font-medium transition ${
                    state === value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Fields (keyed so the first field is focused whenever the mode changes) */}
          <div key={state} className="flex flex-col gap-4">
            {state === "register" && (
              <Field id="auth-name" label="Name" icon={FaUser}>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  autoFocus
                  required
                  className={INPUT_CLASS}
                />
              </Field>
            )}

            <Field id="auth-email" label="Email" icon={FaEnvelope}>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus={state !== "register"}
                required
                className={INPUT_CLASS}
              />
            </Field>

            {(state === "register" || state === "forgot") && (
              <Field
                id="auth-security"
                label="Security question"
                icon={FaShieldAlt}
                hint={
                  state === "register"
                    ? "e.g. Favorite color? You'll need this to reset your password."
                    : "Enter the exact text you set when you signed up."
                }
              >
                <input
                  id="auth-security"
                  type="text"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  placeholder="Favorite color?"
                  autoComplete="off"
                  required
                  className={INPUT_CLASS}
                />
              </Field>
            )}

            <Field
              id="auth-password"
              label={state === "forgot" ? "New password" : "Password"}
              icon={FaLock}
              right={
                state === "login" && (
                  <button
                    type="button"
                    onClick={() => switchState("forgot")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )
              }
            >
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={state === "login" ? "Enter your password" : "Create a password"}
                autoComplete={state === "login" ? "current-password" : "new-password"}
                required
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="shrink-0 p-1 text-gray-400 transition hover:text-gray-700"
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </Field>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? "Please wait…" : copy.cta}
          </button>

          {/* Google (sign in only) */}
          {state === "login" && (
            <>
              <Divider>or continue with</Divider>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error("Google login failed")}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                />
              </div>
            </>
          )}
        </form>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;
