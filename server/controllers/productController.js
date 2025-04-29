import {v2 as cloudinary} from "cloudinary";
import Product from '../models/Product.js';

export const addProduct = async (req, res) => {
    try {
      // Basic validation
      if (!req.body.productData || !req.files || req.files.length === 0) {
        return res.json({
          success: false,
          message: "Product data or images are missing",
        });
      }
  
      const productData = JSON.parse(req.body.productData);
      const images = req.files;
  
      // Upload images to Cloudinary
      const imagesUrl = await Promise.all(
        images.map(async (item) => {
          const result = await cloudinary.uploader.upload(item.path, {
            resource_type: "image",
          });
          return result.secure_url;
        })
      );
  
      // Save product to DB
      await Product.create({
        ...productData,
        image: imagesUrl,
      });
  
      return res.json({
        success: true,
        message: "Product added successfully",
      });
  
    } catch (error) {
      console.error("Add Product Error:", error.message);
      return res.json({
        success: false,
        message: "Server Error: " + error.message,
      });
    }
  };

export const productList = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();

        res.json({
            success: true,
            message:"Updated Successfully",
            products,
        });
    } catch (error) {
        console.error('Error fetching products:', error.message);
        res.json({
            success: false,
            message: 'Failed to fetch products',
        });
    }
};

export const productById=async(req,res)=>{
    try {
        const {id} = req.body
        const product = await Product.findById(id)
        res.json({
            success: true,
            product
        })
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        })
    }
}

export const changeStock=async(req,res)=>{
    try {
        const {id,inStock} = req.body 
        await Product.findByIdAndUpdate(id,{inStock})
        res.json({
            success: true,
            message: "Stock updated successfully"
        })
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        })
    }
}