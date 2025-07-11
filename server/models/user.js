import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
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
    required: true,
  },

  cartItems: {
    type: Object,
    default: {},
  },

  securityQuestion: {
  type: String,
  required: true,
  default: '', // ✅ allows saving without validation error later
},


  lastLoginClue: {
    type: String,
    default: "",
  },
  wishlist: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }
],

}, { minimize: false });

const User = mongoose.models.user || mongoose.model("user", userSchema);

export default User;
