import { v2 as cloudinary } from "cloudinary";
import Product from '../models/Product.js';

// ---------------------------------------------
// Add New Product
// ---------------------------------------------
export const addProduct = async (req, res) => {
  try {
    if (!req.body.productData || !req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product data or media files are missing",
      });
    }

    const productData = JSON.parse(req.body.productData);

    const images = [];
    const videos = [];

    // Separate image and video uploads
    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith("video");

      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: isVideo ? "video" : "image",
      });

      if (isVideo) {
        videos.push(uploadResult.secure_url);
      } else {
        images.push(uploadResult.secure_url);
      }
    }

    await Product.create({
      ...productData,
      image: images,
      video: videos,
    });

    return res.status(201).json({
      success: true,
      message: "Product with media added successfully",
    });

  } catch (error) {
    console.error("Add Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};


// ---------------------------------------------
// List All Products
// ---------------------------------------------
export const productList = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Fetched products successfully",
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// ---------------------------------------------
// Get Product by ID
// ---------------------------------------------
export const productById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------
// Change Stock Status
// ---------------------------------------------
export const changeStock = async (req, res) => {
  try {
    const { id, inStock } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    await Product.findByIdAndUpdate(id, { inStock });

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------
// Delete Product by ID
// ---------------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------
// Update Stock After Order
// ---------------------------------------------
export const updateStockAfterOrder = async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        // Deduct quantity from current stock
        product.stock -= item.quantity;

        // Set inStock to false only if stock is 0 or less
        if (product.stock <= 0) {
          product.inStock = false;
          product.stock = 0; // Prevent negative stock
        }

        await product.save();
      }
    }

    res.status(200).json({ success: true, message: "Stock updated successfully" });
  } catch (error) {
    console.error("Stock update error:", error);
    res.status(500).json({ success: false, message: "Stock update failed", error: error.message });
  }
};

// ---------------------------------------------
// Update Product
// ---------------------------------------------
// This function handles both JSON and multipart/form-data requests
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    let productData;

    // Handle multipart/form-data with productData string
    if (req.body.productData) {
      productData = JSON.parse(req.body.productData);
    } else if (Object.keys(req.body).length > 0) {
      productData = req.body;
    } else {
      return res.status(400).json({ success: false, message: "Product data is missing" });
    }

    // ✅ Flatten nested "product" object if it exists
    if (productData.product) {
      productData = { ...productData.product };
    }

    // Fetch existing product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Preserve old media
    let images = product.image || [];
    let videos = product.video || [];

    if (productData.image && productData.image.length > 0) {
      images = productData.image;
    }
    if (productData.video && productData.video.length > 0) {
      videos = productData.video;
    }

    // Handle new uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith("video");
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          resource_type: isVideo ? "video" : "image",
        });

        if (isVideo) {
          videos.push(uploadResult.secure_url);
        } else {
          images.push(uploadResult.secure_url);
        }
      }
    }

    // Update document
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
