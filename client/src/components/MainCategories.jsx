import React from "react";
import { categories } from "../assets/assets";
import { useAppContext } from "../context/appContext";

// Define main category mapping
const mainCategoryMap = {
  "Grocery & Kitchen": ["Vegetables", "Fresh Fruits", "Grains & Cereals"],
  "Snacks & Drinks": ["Cold Drinks", "Instant Food", "Bakery & Breads"],
  "Beauty & Personal Care": [], // Add categories later
  "Household Essentials": ["Dairy Products"], // Example
};

const MainCategories = () => {
  const { navigate } = useAppContext();

  return (
    <div className="mt-16 space-y-10">
      {Object.keys(mainCategoryMap).map((mainCategory, idx) => {
        // Filter categories that belong to this main category
        const filteredCategories = categories.filter((cat) =>
          mainCategoryMap[mainCategory].includes(cat.text)
        );

        if (filteredCategories.length === 0) return null;

        return (
          <div key={idx}>
            <p className="text-2xl md:text-3xl font-medium mb-4">
              {mainCategory}
            </p>

            {/* Scrollable row for mobile */}
            <div className="overflow-x-auto md:overflow-visible no-scrollbar">
              <div className="flex md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-8 w-max md:w-full">
                {filteredCategories.map((category, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 p-2 cursor-pointer flex flex-col items-center justify-center gap-2"
                    onClick={() => {
                      navigate(`/products/${category.path.toLowerCase()}`);
                      scrollTo(0, 0);
                    }}
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-lg shadow flex items-center justify-center">
                      <img
                        src={category.image}
                        alt={category.text}
                        className="w-12 h-12 md:w-16 md:h-16 object-contain"
                      />
                    </div>
                    <p className="text-xs md:text-sm text-center font-medium whitespace-nowrap">
                      {category.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MainCategories;
