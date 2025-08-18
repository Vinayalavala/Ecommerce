import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Product from "../models/Product.js";

// ----------------------------------------------------
// Utility: Validate ObjectId
// ----------------------------------------------------
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ----------------------------------------------------
// Add New Product
// ----------------------------------------------------
export const addProduct = async (req, res) => {
  try {
    if (!req.body.productData || !req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product data or media files are missing",
      });
    }

    let productData = JSON.parse(req.body.productData);

    const images = [];
    const videos = [];

    // Upload all files in parallel
    const uploadPromises = req.files.map((file) => {
      const isVideo = file.mimetype.startsWith("video");
      return cloudinary.uploader.upload(file.path, {
        resource_type: isVideo ? "video" : "image",
      }).then((result) => ({
        isVideo,
        url: result.secure_url,
        public_id: result.public_id,
      }));
    });

    const uploads = await Promise.all(uploadPromises);
    uploads.forEach(({ isVideo, url, public_id }) => {
      if (isVideo) videos.push({ url, public_id });
      else images.push({ url, public_id });
    });

    const newProduct = await Product.create({
      ...productData,
      image: images,
      video: videos,
    });

    return res.status(201).json({
      success: true,
      message: "Product with media added successfully",
      product: newProduct,
    });

  } catch (error) {
    console.error("Add Product Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// List All Products (with pagination)
// ----------------------------------------------------
export const productList = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Fetched products successfully",
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// Get Product by ID
// ----------------------------------------------------
export const productById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({ success: true, product });

  } catch (error) {
    console.error("Get Product Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// Change Stock Status
// ----------------------------------------------------
export const changeStock = async (req, res) => {
  try {
    const { id, inStock } = req.body;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { inStock },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Stock status updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    console.error("Change Stock Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// Delete Product by ID (with media cleanup)
// ----------------------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Cleanup media from Cloudinary
    const media = [...(deletedProduct.image || []), ...(deletedProduct.video || [])];
    await Promise.all(
      media.map((m) =>
        cloudinary.uploader.destroy(m.public_id, {
          resource_type: m.url.includes(".mp4") ? "video" : "image",
        })
      )
    );

    return res.status(200).json({
      success: true,
      message: "Product and media deleted successfully",
    });

  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// Update Stock After Order (atomic updates)
// ----------------------------------------------------
export const updateStockAfterOrder = async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    await Promise.all(
      items.map(({ productId, quantity }) =>
        Product.findByIdAndUpdate(
          productId,
          {
            $inc: { stock: -quantity },
            $set: { inStock: true }, // default
          },
          { new: true }
        ).then((product) => {
          if (product && product.stock - quantity <= 0) {
            product.inStock = false;
            product.stock = Math.max(product.stock, 0);
            return product.save();
          }
        })
      )
    );

    return res.status(200).json({ success: true, message: "Stock updated successfully" });
  } catch (error) {
    console.error("Stock update error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------
// Update Product
// ----------------------------------------------------
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    let productData;
    if (req.body.productData) {
      productData = JSON.parse(req.body.productData);
    } else if (Object.keys(req.body).length > 0) {
      productData = req.body;
    } else {
      return res.status(400).json({ success: false, message: "Product data is missing" });
    }

    if (productData.product) {
      productData = { ...productData.product };
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let images = product.image || [];
    let videos = product.video || [];

    if (productData.image && productData.image.length > 0) images = productData.image;
    if (productData.video && productData.video.length > 0) videos = productData.video;

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => {
        const isVideo = file.mimetype.startsWith("video");
        return cloudinary.uploader.upload(file.path, {
          resource_type: isVideo ? "video" : "image",
        }).then((result) => ({
          isVideo,
          url: result.secure_url,
          public_id: result.public_id,
        }));
      });

      const uploads = await Promise.all(uploadPromises);
      uploads.forEach(({ isVideo, url, public_id }) => {
        if (isVideo) videos.push({ url, public_id });
        else images.push({ url, public_id });
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...productData, image: images, video: videos },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
