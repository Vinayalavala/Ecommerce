import React, { useEffect } from "react";
import { useAppContext } from "../context/appContext.jsx";
import { toast } from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const { setShowUserLogin, setUser, axios, navigate } = useAppContext();
  const [state, setState] = React.useState("login"); // "login", "register", or "forgot"
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [securityQuestion, setSecurityQuestion] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      if (state === "forgot") {
        const { data } = await axios.post("/api/user/forgot-password", {
          email,
          securityQuestion, // ✅ fixed field name
          newPassword: password,
        });

        data.success ? toast.success(data.message) : toast.error(data.message);
        if (data.success) setState("login");
        return;
      }

      const { data } = await axios.post(`/api/user/${state}`, {
        name,
        email,
        password,
        ...(state === "register" && { securityQuestion }),
      });

      if (data.success) {
        localStorage.setItem("authToken", data.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        setUser(data.user);
        setShowUserLogin(false);
        navigate("/");
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [axios]);

  return (
    <div
      onClick={() => setShowUserLogin(false)}
      className="fixed top-0 left-0 bottom-0 right-0 z-30 flex items-center justify-center text-sm text-gray-600 bg-black/50"
    >
      <form
        onSubmit={onSubmitHandler}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-4 p-8 py-10 w-80 sm:w-[352px] rounded-lg shadow-xl border border-gray-200 bg-white"
      >
        <p className="text-2xl font-medium text-center w-full">
          <span className="text-primary">User</span>{" "}
          {state === "login"
            ? "Login"
            : state === "register"
            ? "Sign Up"
            : "Forgot Password"}
        </p>

        {state === "register" && (
          <>
            <div className="w-full">
              <label className="block mb-1">Name</label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                placeholder="type here"
                className="border border-gray-200 rounded w-full p-2 outline-primary"
                type="text"
                required
              />
            </div>
            <div className="w-full">
              <label className="block mb-1">
                Security Question (e.g. Favorite color?)
              </label>
              <input
                onChange={(e) => setSecurityQuestion(e.target.value)}
                value={securityQuestion}
                placeholder="type here"
                className="border border-gray-200 rounded w-full p-2 outline-primary"
                type="text"
                required
              />
            </div>
          </>
        )}

        <div className="w-full">
          <label className="block mb-1">Email</label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            placeholder="type here"
            className="border border-gray-200 rounded w-full p-2 outline-primary"
            type="email"
            required
          />
        </div>

        {state === "forgot" && (
          <div className="w-full">
            <label className="block mb-1">Security Question</label>
            <input
              onChange={(e) => setSecurityQuestion(e.target.value)}
              value={securityQuestion}
              placeholder="e.g. Favorite color?"
              className="border border-gray-200 rounded w-full p-2 outline-primary"
              type="text"
              required
            />
          </div>
        )}

        <div className="w-full relative">
          <label className="block mb-1">
            {state === "forgot" ? "New Password" : "Password"}
          </label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            placeholder="type here"
            className="border border-gray-200 rounded w-full p-2 pr-10 outline-primary"
            type={showPassword ? "text" : "password"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-gray-500"
          >
            {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
          </button>
        </div>

        <div className="w-full text-center text-sm space-y-1">
          {state === "login" && (
            <>
              <p>
                Forgot password?{" "}
                <span
                  onClick={() => {
                    setState("forgot");
                    setPassword("");
                  }}
                  className="text-primary cursor-pointer hover:underline"
                >
                  Click here
                </span>
              </p>
              <p>
                Create an account?{" "}
                <span
                  onClick={() => {
                    setState("register");
                    setName("");
                    setPassword("");
                  }}
                  className="text-primary cursor-pointer hover:underline"
                >
                  Click here
                </span>
              </p>
            </>
          )}

          {state === "register" && (
            <p>
              Already have an account?{" "}
              <span
                onClick={() => {
                  setState("login");
                  setName("");
                  setPassword("");
                }}
                className="text-primary cursor-pointer hover:underline"
              >
                Click here
              </span>
            </p>
          )}

          {state === "forgot" && (
            <p>
              Back to login?{" "}
              <span
                onClick={() => {
                  setState("login");
                  setPassword("");
                }}
                className="text-primary cursor-pointer hover:underline"
              >
                Click here
              </span>
            </p>
          )}
        </div>

        <button className="bg-primary hover:bg-primary-dull transition-all text-white w-full py-2 rounded-md cursor-pointer">
          {state === "register"
            ? "Create Account"
            : state === "forgot"
            ? "Reset Password"
            : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
