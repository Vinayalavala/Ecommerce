import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      default: null, // ✅ allow null for Google users
    },

    cartItems: {
      type: Object,
      default: {},
    },

    securityQuestion: {
      type: String,
      default: "", // ✅ allow blank
    },

    lastLoginClue: {
      type: String,
      default: "",
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    profilePic: {
      type: String,
      default: "",
    },
  },
  { minimize: false }
);

const User = mongoose.models.user || mongoose.model("user", userSchema);

export default User;
