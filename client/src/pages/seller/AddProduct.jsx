import { useState, useEffect } from "react";
import assets, { categories } from "../../assets/assets";
import { useAppContext } from "../../context/appContext";
import { toast } from "react-hot-toast";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";

const mainCategories = [
  "Grocery & Kitchen",
  "Snacks & Drinks",
  "Beauty & Personal Care",
  "Household Essentials",
];

const quantityUnits = ["pc", "pcs", "ML", "L", "g", "Kg"];

const AddProduct = () => {
  const [files, setFiles] = useState([null]); // New image uploads
  const [existingImages, setExistingImages] = useState([]); // Existing images for edit

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [price, setPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [stock, setStock] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");

  const { axios } = useAppContext();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const editId = searchParams.get("edit");
  const productFromState = location.state?.product || null;

  // ✅ Fill data instantly from navigation state if available
  useEffect(() => {
    if (productFromState) {
      fillFormData(productFromState);
    } else if (editId) {
      // Fallback: Fetch product from API if direct link opened
      axios.get(`/api/product/${editId}`).then(({ data }) => {
        if (data.success) {
          fillFormData(data.product);
        }
      });
    }
  }, [editId, productFromState]);

  const fillFormData = (product) => {
    setName(product.name);
    setDescription(product.description?.join("\n") || "");
    setCategory(product.category);
    setMainCategory(product.mainCategory);
    setPrice(product.price);
    setOfferPrice(product.offerPrice);
    setStock(product.stock);
    setQuantityValue(product.quantity?.value || "");
    setQuantityUnit(product.quantity?.unit || "");
    setExistingImages(product.image || []);
  };

  // ✅ Submit Handler
  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      const productData = {
        name: name.trim(),
        description: description
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        category,
        mainCategory,
        price: Number(price),
        offerPrice: Number(offerPrice),
        stock: Number(stock),
        quantity: {
          value: Number(quantityValue),
          unit: quantityUnit,
        },
        image: existingImages,
      };

      const formData = new FormData();
      formData.append("productData", JSON.stringify(productData));
      files.forEach((file) => file && formData.append("images", file));

      const url = editId
        ? `/api/product/update/${editId}`
        : "/api/product/add";

      // ✅ Use proper HTTP method
      const method = editId ? "put" : "post";

      console.log("🔹 Submitting to:", url, "with method:", method);
      console.log("🔹 Payload:", productData);

      const { data } = await axios[method](url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Response:", data);

      if (data.success) {
        toast.success(data.message);

        // ✅ Clear the form and redirect to seller page
        resetForm();
        navigate("/seller");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (error) {
      console.error("❌ Submit error:", error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setMainCategory("");
    setPrice("");
    setOfferPrice("");
    setStock("");
    setQuantityValue("");
    setQuantityUnit("");
    setFiles([null]);
    setExistingImages([]);
  };

  const handleFileChange = (index, file) => {
    const updatedFiles = [...files];
    updatedFiles[index] = file;
    setFiles(updatedFiles);
  };

  const handleAddMore = () => setFiles((prev) => [...prev, null]);

  const handleRemoveExistingImage = (index) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-x-scroll flex flex-col justify-between mb-15">
      <form onSubmit={onSubmitHandler} className="md:p-10 p-4 space-y-5 max-w-lg">
        <h2 className="text-xl font-semibold">
          {editId ? "Edit Product" : "Add Product"}
        </h2>

        {/* Existing Images Preview in Edit Mode */}
        {editId && existingImages.length > 0 && (
          <div>
            <p className="text-base font-medium mb-2">Existing Images</p>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img}
                    alt="product"
                    className="w-24 h-24 object-cover border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload New Images */}
        <div>
          <p className="text-base font-medium">Upload New Images</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {files.map((file, index) => (
              <label key={index} htmlFor={`image${index}`}>
                <input
                  onChange={(e) => handleFileChange(index, e.target.files[0])}
                  type="file"
                  id={`image${index}`}
                  hidden
                />
                <img
                  className="max-w-24 cursor-pointer border border-gray-300 rounded-md"
                  src={file ? URL.createObjectURL(file) : assets.upload_area}
                  alt="upload"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={handleAddMore}
              className="text-sm text-primary underline hover:text-primary-dull"
            >
              + Add More
            </button>
          </div>
        </div>

        {/* Product Name */}
        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-name">
            Product Name
          </label>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            id="product-name"
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-description">
            Product Description
          </label>
          <textarea
            onChange={(e) => setDescription(e.target.value)}
            value={description}
            id="product-description"
            rows={4}
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 resize-none"
            placeholder="Type here"
          ></textarea>
        </div>

        {/* Main Category */}
        <div className="w-full flex flex-col gap-1">
          <label className="text-base font-medium" htmlFor="main-category">
            Main Category
          </label>
          <select
            onChange={(e) => setMainCategory(e.target.value)}
            value={mainCategory}
            id="main-category"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            required
          >
            <option value="">Select Main Category</option>
            {mainCategories.map((cat, index) => (
              <option key={index} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sub Category */}
        <div className="w-full flex flex-col gap-1">
          <label className="text-base font-medium" htmlFor="category">
            Category
          </label>
          <select
            onChange={(e) => setCategory(e.target.value)}
            value={category}
            id="category"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            required
          >
            <option value="">Select Category</option>
            {categories.map((item, index) => (
              <option key={index} value={item.path}>
                {item.path}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="quantity-value">
              Quantity
            </label>
            <input
              onChange={(e) => setQuantityValue(e.target.value)}
              value={quantityValue}
              id="quantity-value"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-36">
            <label className="text-base font-medium" htmlFor="quantity-unit">
              Unit
            </label>
            <select
              onChange={(e) => setQuantityUnit(e.target.value)}
              value={quantityUnit}
              id="quantity-unit"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              required
            >
              <option value="">Select Unit</option>
              {quantityUnits.map((unit, index) => (
                <option key={index} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price, Offer, Stock */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex-1 flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="product-price">
              Product Price
            </label>
            <input
              onChange={(e) => setPrice(e.target.value)}
              value={price}
              id="product-price"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              required
            />
          </div>
          <div className="flex-1 flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="offer-price">
              Offer Price
            </label>
            <input
              onChange={(e) => setOfferPrice(e.target.value)}
              value={offerPrice}
              id="offer-price"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              required
            />
          </div>
          <div className="flex-1 flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="stock">
              Stock
            </label>
            <input
              onChange={(e) => setStock(e.target.value)}
              value={stock}
              id="stock"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              required
            />
          </div>
        </div>

        <button className="px-8 py-2.5 bg-primary text-white font-medium rounded cursor-pointer">
          {editId ? "UPDATE" : "ADD"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
