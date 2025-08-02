import React from 'react'
import assets, { features } from '../assets/assets'

const BottomBanner = () => {
  return (
    <div className="relative mt-24">
      {/* Desktop Image */}
      <img 
        src={assets.bottom_banner_image} 
        alt="banner" 
        className="hidden md:block w-full object-cover"
      />

      {/* Mobile Image */}
      <img 
        src={assets.bottom_banner_image_sm} 
        alt="banner" 
        className="w-full md:hidden object-cover"
      />

      {/* Mobile Overlay (Top-Aligned, Compact Boxes) */}
      <div className="
        absolute inset-0 md:hidden
        flex flex-col items-center justify-start
        px-4 pt-6 text-center
      ">
        <h1 className="text-xl sm:text-2xl font-bold text-primary mb-4">
          Why We're the Best
        </h1>
        <div className="flex flex-col gap-3 w-full max-w-[360px]">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 bg-white/85 rounded-md px-3 py-1 shadow-sm"
            >
              <img 
                src={feature.icon} 
                alt={feature.title} 
                className="w-6 h-6 sm:w-7 sm:h-7"
              />
              <div className="text-left">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-snug">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Overlay (Right-Centered) */}
      <div className="
        hidden md:flex absolute inset-0 
        items-center justify-end pr-24
      ">
        <div className="max-w-lg text-right">
          <h1 className="text-3xl font-bold text-primary mb-6">
            Why We're the Best
          </h1>
          <div className="flex flex-col gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4">
                <img 
                  src={feature.icon} 
                  alt={feature.title} 
                  className="w-11"
                />
                <div className="text-right">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BottomBanner
