import { useState } from "react";
import assets, { categories } from "../../assets/assets";
import { useAppContext } from "../../context/appContext";
import { toast } from "react-hot-toast";

const mainCategories = [
  "Grocery & Kitchen",
  "Snacks & Drinks",
  "Beauty & Personal Care",
  "Household Essentials",
];

const quantityUnits = [
  "pc",
  "pcs",
  "Litre",
  "Milli liters",
  "grams",
  "milligrams",
];

const AddProduct = () => {
  
  const [files, setFiles] = useState([null]);
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

  const onSubmitHandler = async (event) => {
    try {
      event.preventDefault();

      // ✅ Construct product data with quantity object
      const productData = {
        name: name.trim(),
        description: description.split("\n").map((line) => line.trim()).filter(Boolean),
        category,
        mainCategory,
        price: Number(price),
        offerPrice: Number(offerPrice),
        stock: Number(stock),
        quantity: {
          value: Number(quantityValue),
          unit: quantityUnit,
        },
      };

      const formData = new FormData();
      formData.append("productData", JSON.stringify(productData));
      console.log("Final productData for DB:", productData);


      files.forEach((file) => {
        if (file) formData.append("images", file);
      });

      const { data } = await axios.post("/api/product/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) {
        toast.success(data.message);
        // Reset all fields
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
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleFileChange = (index, file) => {
    const updatedFiles = [...files];
    updatedFiles[index] = file;
    setFiles(updatedFiles);
  };

  const handleAddMore = () => setFiles((prev) => [...prev, null]);

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-x-scroll flex flex-col justify-between mb-15">
      <form
        onSubmit={onSubmitHandler}
        className="md:p-10 p-4 space-y-5 max-w-lg"
      >
        {/* Product Images */}
        <div>
          <p className="text-base font-medium">Product Images</p>
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
          ADD
        </button>
      </form>
    </div>
  );
};

export default AddProduct;


