import { useEffect, useState } from "react";

import { useAppContext } from '../context/appContext';
import { toast } from 'react-hot-toast';
import { FiEdit, FiTrash2, FiShare2, FiPlus } from 'react-icons/fi';

const InputField = ({ type, placeholder, name, handleChange, address }) => (
  <input
    className='w-full px-2 py-2.5 border border-gray-500/30 rounded outline-none text-gray-500 focus:border-primary transition'
    type={type}
    placeholder={placeholder}
    name={name}
    onChange={handleChange}
    value={address[name]}
    required
  />
);

const AddAddress = () => {
  const { axios, navigate, user } = useAppContext();

  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    phone: ''
  });

  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`/api/address/get?userId=${user._id}`);
      if (data.success) {
        setAddresses(data.addresses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setAddress({
      firstName: '',
      lastName: '',
      email: '',
      street: '',
      city: '',
      state: '',
      zipcode: '',
      country: '',
      phone: ''
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...address,
        zipcode: Number(address.zipcode),
        phone: Number(address.phone),
      };

      let response;
      if (isEditing && editingId) {
        response = await axios.put(`/api/address/edit/${editingId}`, payload);
      } else {
        response = await axios.post('/api/address/add', {
          userId: user._id,
          address: payload
        });
      }

      const { data } = response;

      if (data.success) {
        toast.success(data.message);
        fetchAddresses();
        setShowForm(false);
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteAddress = async (id) => {
    try {
      const { data } = await axios.delete(`/api/address/delete/${id}`);
      if (data.success) {
        toast.success('Address deleted');
        fetchAddresses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const shareAddress = (addr) => {
    const text = `${addr.firstName} ${addr.lastName}\n${addr.street}, ${addr.city}, ${addr.state}, ${addr.country} - ${addr.zipcode}\nPhone: ${addr.phone}`;
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  const handleEdit = (addr) => {
    setAddress({
      firstName: addr.firstName,
      lastName: addr.lastName,
      email: addr.email,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipcode: addr.zipcode,
      country: addr.country,
      phone: addr.phone,
    });
    setEditingId(addr._id);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) {
      navigate('/cart');
    } else {
      fetchAddresses();
    }
  }, [user]);

  return (
    <div className='mt-30 pb-16 px-4'>
      <div className='flex justify-between items-center mb-6'>
        <p className='text-2xl md:text-3xl text-gray-500'>
          Manage Shipping <span className='font-bold text-primary'>Addresses</span>
        </p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className='flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dull transition text-sm'
        >
          <FiPlus className="text-lg" />
          <span>{isEditing ? "Cancel Edit" : "Add Address"}</span>
        </button>
      </div>

      {/* Existing Addresses */}
      <div className='grid gap-4 md:grid-cols-2'>
        {addresses.map((addr) => (
          <div key={addr._id} className='p-4 border border-gray-300 rounded-lg shadow-sm'>
            <p className='font-semibold text-gray-800'>{addr.firstName} {addr.lastName}</p>
            <p className='text-sm text-gray-600'>{addr.email}</p>
            <p className='text-sm mt-1 text-gray-700'>
              {addr.street}, {addr.city}, {addr.state}, {addr.country} - {addr.zipcode}
            </p>
            <p className='text-sm text-gray-700'>Phone: {addr.phone}</p>
            <div className='flex gap-4 mt-3 text-xl'>
              <button onClick={() => shareAddress(addr)} title='Share' className='text-gray-600 hover:text-primary'>
                <FiShare2 />
              </button>
              <button onClick={() => handleEdit(addr)} title='Edit' className='text-gray-600 hover:text-primary'>
                <FiEdit />
              </button>
              <button onClick={() => deleteAddress(addr._id)} title='Delete' className='text-red-500 hover:text-red-700'>
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Address Form */}
      {showForm && (
        <div className='mt-12'>
          <p className='text-lg font-semibold text-gray-600 mb-4'>{isEditing ? 'Edit Address' : 'Add New Address'}</p>
          <form onSubmit={onSubmitHandler} className='space-y-3 text-sm max-w-xl'>
            <div className="grid grid-cols-2 gap-4">
              <InputField handleChange={handleChange} address={address} name='firstName' type='text' placeholder='First Name' />
              <InputField handleChange={handleChange} address={address} name='lastName' type='text' placeholder='Last Name' />
            </div>
            <InputField handleChange={handleChange} address={address} name='email' type='email' placeholder='Email Address' />
            <InputField handleChange={handleChange} address={address} name='street' type='text' placeholder='Street' />

            <div className="grid grid-cols-2 gap-4">
              <InputField handleChange={handleChange} address={address} name='city' type='text' placeholder='City' />
              <InputField handleChange={handleChange} address={address} name='state' type='text' placeholder='State' />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField handleChange={handleChange} address={address} name='zipcode' type='number' placeholder='Zip Code' />
              <InputField handleChange={handleChange} address={address} name='country' type='text' placeholder='Country' />
            </div>

            <InputField handleChange={handleChange} address={address} name='phone' type='number' placeholder='Phone Number' />

            <button type='submit' className='w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dull transition'>
              {isEditing ? 'Update Address' : 'Add Address'}
            </button>
            <p className='text-gray-500 text-sm'>By clicking, you agree to our <span className='text-primary cursor-pointer'>Terms and Conditions</span></p>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddAddress;
