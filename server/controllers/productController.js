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
        message: "Product data or images are missing",
      });
    }

    const productData = JSON.parse(req.body.productData);
    const images = req.files;

    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    await Product.create({
      ...productData,
      image: imagesUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
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
    const { id } = req.body;

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

