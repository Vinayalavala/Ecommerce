import React from 'react';

const ContactPage = () => {
  return (
    <div className='flex flex-col mt-30 items-center justify-center h-screen '>
      <form className="flex flex-col items-center text-sm">
      <p className="text-lg text-primary-dull font-medium pb-2">Contact Us</p>
      <h1 className="text-4xl font-semibold text-slate-700 pb-4">We'd love to hear from you</h1>
      <p className="text-sm text-gray-500 text-center pb-10">
        Have questions, feedback, or need support? Fill out the form below and our Developer will get back to you as soon as possible.
        <br />
        We're here to help and answer any questions you may have.
      </p>


        <div className="flex flex-col md:flex-row items-center gap-8 w-[350px] md:w-[700px]">
          <div className="w-full">
            <label className="text-black/70" htmlFor="name">Your Name</label>
            <input
              className="h-12 p-2 mt-2 w-full border border-gray-500/30 rounded outline-none focus:border-primary-dull"
              type="text"
              id="name"
              required
            />
          </div>
          <div className="w-full">
            <label className="text-black/70" htmlFor="email">Your Email</label>
            <input
              className="h-12 p-2 mt-2 w-full border border-gray-500/30 rounded outline-none focus:border-primary-dull"
              type="email"
              id="email"
              required
            />
          </div>
        </div>

        <div className="mt-6 w-[350px] md:w-[700px]">
          <label className="text-black/70" htmlFor="message">Message</label>
          <textarea
            className="w-full mt-2 p-2 h-40 border border-gray-500/30 rounded resize-none outline-none focus:border-primary-dull"
            id="message"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          className="mt-5 bg-primary-dull text-white h-12 w-56 px-4 rounded active:scale-95 cursor-pointer transition"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactPage;
