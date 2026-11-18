import { useEffect, useRef, useState } from 'react';

import { useAppContext } from '../context/appContext';
import { toast } from 'react-hot-toast';
import {
  FiEdit,
  FiTrash2,
  FiShare2,
  FiPlus,
  FiX,
  FiSearch,
  FiNavigation,
  FiMapPin,
  FiPhone,
  FiMail,
} from 'react-icons/fi';

/* -------------------------------------------------------------------------- */
/*  Google Maps helpers                                                        */
/*  Needs VITE_GOOGLE_MAPS_API_KEY with these APIs enabled in Google Cloud:    */
/*  Maps JavaScript API, Geocoding API, Places API (New)                       */
/* -------------------------------------------------------------------------- */

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 }; // fallback when location is unavailable

let mapsPromise;
const loadGoogleMaps = () => {
  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error('Google Maps API key is missing (set VITE_GOOGLE_MAPS_API_KEY).'));
  }
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  // Google calls this global when the key is rejected
  window.gm_authFailure = () => window.dispatchEvent(new Event('gmaps-auth-failure'));

  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => {
      mapsPromise = undefined;
      reject(new Error('Could not load Google Maps. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
};

// Prefer a real address over a plus-code result
const pickBestResult = (results = []) =>
  results.find((r) => !r.types?.includes('plus_code')) || results[0];

const parseGoogleAddress = (result) => {
  const comps = result?.address_components || [];
  const get = (...types) => {
    for (const t of types) {
      const c = comps.find((x) => x.types.includes(t));
      if (c) return c.long_name;
    }
    return '';
  };

  const street = [
    get('street_number') || get('premise'),
    get('route'),
    get('sublocality_level_2'),
    get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
  ]
    .filter(Boolean)
    .join(', ');

  return {
    street: street || (result?.formatted_address || '').split(',').slice(0, 2).join(',').trim(),
    city: get('locality', 'administrative_area_level_3', 'administrative_area_level_2'),
    state: get('administrative_area_level_1'),
    zipcode: get('postal_code').replace(/\D/g, ''),
    country: get('country'),
  };
};

/* -------------------------------------------------------------------------- */
/*  MapPicker: fixed center pin, move the map to choose a spot                 */
/* -------------------------------------------------------------------------- */

const MapPicker = ({ initialQuery, onLocationChange }) => {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesRef = useRef(null);
  const tokenRef = useRef(null);
  const timerRef = useRef(null);
  const reqRef = useRef(0);
  const pickedRef = useRef(false);
  // Form fields are only overwritten after the user (or "current location") moves the pin,
  // so editing a saved address never gets clobbered on open.
  const interacted = useRef(false);
  const onChangeRef = useRef(onLocationChange);
  onChangeRef.current = onLocationChange;

  const [moving, setMoving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState('');

  const resolveCenter = async () => {
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!map || !geocoder) return;

    const c = map.getCenter();
    const id = ++reqRef.current;
    setResolving(true);

    try {
      const { results: found } = await geocoder.geocode({ location: { lat: c.lat(), lng: c.lng() } });
      if (id !== reqRef.current) return;
      const best = pickBestResult(found);
      setLabel(best?.formatted_address || '');
      if (best && interacted.current) onChangeRef.current(parseGoogleAddress(best));
    } catch (e) {
      if (id !== reqRef.current) return;
      setLabel('');
      if (e?.code !== 'ZERO_RESULTS') toast.error("Couldn't fetch the address for this spot.");
    } finally {
      if (id === reqRef.current) setResolving(false);
    }
  };

  const locate = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error('Location is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map) return;
        interacted.current = true;
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(17);
      },
      () => {
        if (!silent) toast.error('Could not get your location. Allow access or pick on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Surface API key problems (billing off, wrong key, blocked referrer...)
  useEffect(() => {
    const onAuthFail = () =>
      setMapError('Google Maps rejected the API key. Check the key, billing and allowed domains.');
    window.addEventListener('gmaps-auth-failure', onAuthFail);
    return () => window.removeEventListener('gmaps-auth-failure', onAuthFail);
  }, []);

  // Initialise map once
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(async (gmaps) => {
        const { Map: GMap } = await gmaps.importLibrary('maps');
        const { Geocoder } = await gmaps.importLibrary('geocoding');
        placesRef.current = await gmaps.importLibrary('places');
        if (cancelled || !mapEl.current) return;

        geocoderRef.current = new Geocoder();
        const map = new GMap(mapEl.current, {
          center: DEFAULT_CENTER,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        mapRef.current = map;

        map.addListener('dragstart', () => {
          interacted.current = true;
          setMoving(true);
        });
        map.addListener('idle', () => {
          setMoving(false);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            if (interacted.current || initialQuery) resolveCenter();
          }, 300);
        });

        if (initialQuery) {
          try {
            const { results: found } = await geocoderRef.current.geocode({ address: initialQuery });
            if (!cancelled && found[0]) {
              map.setCenter(found[0].geometry.location);
              map.setZoom(17);
            }
          } catch {
            /* keep default center */
          }
        } else {
          locate(true);
        }
      })
      .catch((e) => setMapError(e.message));

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced place autocomplete (Places API New)
  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3 || !placesRef.current) {
      setResults([]);
      return;
    }

    let stale = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesRef.current;
        if (!tokenRef.current) tokenRef.current = new AutocompleteSessionToken();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: tokenRef.current,
        });
        if (!stale) setResults(suggestions.filter((s) => s.placePrediction).slice(0, 5));
      } catch {
        if (!stale) setResults([]);
      } finally {
        if (!stale) setSearching(false);
      }
    }, 350);

    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query]);

  const pickResult = async (s) => {
    const p = s.placePrediction;
    const name = p.mainText?.text || p.text?.text || '';
    interacted.current = true;
    if (name !== query) pickedRef.current = true;
    setQuery(name);
    setResults([]);
    try {
      const place = p.toPlace();
      await place.fetchFields({ fields: ['location'] });
      tokenRef.current = null; // session ends after a selection
      if (place.location && mapRef.current) {
        mapRef.current.setCenter(place.location);
        mapRef.current.setZoom(17);
      }
    } catch {
      toast.error("Couldn't open that place.");
    }
  };

  return (
    <div>
      <div className='relative isolate h-72 md:h-[26rem] rounded-xl overflow-hidden border border-gray-200 bg-gray-100'>
        <div ref={mapEl} className='absolute inset-0' />

        {mapError && (
          <div className='absolute inset-0 z-[600] flex items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-600'>
            {mapError} You can still fill the form manually.
          </div>
        )}

        {/* Center pin */}
        <div className='pointer-events-none absolute left-1/2 top-1/2 z-[500] h-0 w-0'>
          <div className='absolute left-1/2 top-0 h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30' />
          <div
            className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full transition-transform duration-200 ${
              moving ? '-translate-y-[130%]' : ''
            }`}
          >
            <svg viewBox='0 0 24 24' width='42' height='42' className='text-primary drop-shadow-md' fill='currentColor'>
              <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z' />
            </svg>
          </div>
        </div>

        {/* Search */}
        <div className='absolute left-3 right-3 top-3 z-[1000]'>
          <div className='relative'>
            <FiSearch className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search area, street or landmark'
              className='w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 shadow-md outline-none focus:border-primary'
            />
            {searching && (
              <span className='absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            )}
            {!searching && query && (
              <button
                type='button'
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                aria-label='Clear search'
              >
                <FiX />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <ul className='mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white text-sm shadow-lg'>
              {results.map((s) => {
                const p = s.placePrediction;
                return (
                  <li key={p.placeId}>
                    <button
                      type='button'
                      onClick={() => pickResult(s)}
                      className='flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-gray-50'
                    >
                      <FiMapPin className='mt-0.5 shrink-0 text-gray-400' />
                      <span className='min-w-0'>
                        <span className='block truncate text-gray-800'>{p.mainText?.text || p.text?.text}</span>
                        {p.secondaryText?.text && (
                          <span className='block truncate text-xs text-gray-500'>{p.secondaryText.text}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Locate me */}
        <button
          type='button'
          onClick={() => locate(false)}
          className='absolute bottom-6 left-3 z-[1000] inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-primary shadow-md transition hover:bg-gray-50'
        >
          <FiNavigation /> Use current location
        </button>
      </div>

      <div className='mt-3 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm'>
        <FiMapPin className='mt-0.5 shrink-0 text-primary' />
        <div className='min-w-0'>
          <p className='text-xs text-gray-500'>Selected location</p>
          <p className='break-words text-gray-800'>
            {resolving ? 'Finding address…' : label || 'Move the map to place the pin on your doorstep'}
          </p>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Form field                                                                 */
/* -------------------------------------------------------------------------- */

const InputField = ({ type, placeholder, name, handleChange, address }) => (
  <input
    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
    type={type}
    placeholder={placeholder}
    name={name}
    onChange={handleChange}
    value={address[name]}
    required
  />
);

const EMPTY_ADDRESS = {
  firstName: '',
  lastName: '',
  email: '',
  street: '',
  city: '',
  state: '',
  zipcode: '',
  country: '',
  phone: '',
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

const AddAddress = () => {
  const { axios, navigate, user } = useAppContext();

  const [address, setAddress] = useState(EMPTY_ADDRESS);
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

  // Called by the map whenever the pin settles on a new spot
  const handleLocationChange = (fields) => {
    setAddress((prev) => ({ ...prev, ...fields }));
  };

  const resetForm = () => {
    setAddress(EMPTY_ADDRESS);
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
          address: payload,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Where the map should start when editing a saved address
  const initialQuery = isEditing
    ? [address.street, address.city, address.state, address.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className='mt-30 pb-16 px-4'>
      <div className='flex justify-between items-center mb-6'>
        <p className='text-2xl md:text-3xl text-gray-500'>
          Manage Shipping <span className='font-bold text-primary'>Addresses</span>
        </p>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className='flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dull transition text-sm'
        >
          {showForm ? <FiX className='text-lg' /> : <FiPlus className='text-lg' />}
          <span>{showForm ? 'Close' : 'Add Address'}</span>
        </button>
      </div>

      {/* Address form with map */}
      {showForm && (
        <div className='mb-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6'>
          <p className='mb-1 text-lg font-semibold text-gray-700'>
            {isEditing ? 'Edit Address' : 'Add New Address'}
          </p>
          <p className='mb-5 text-sm text-gray-500'>
            Drag the map to drop the pin on your location, search for a place, or use your current
            location. The details fill in automatically and you can still edit them.
          </p>

          <div className='grid gap-6 lg:grid-cols-2'>
            <MapPicker
              key={editingId || 'new'}
              initialQuery={initialQuery}
              onLocationChange={handleLocationChange}
            />

            <form onSubmit={onSubmitHandler} className='space-y-3 text-sm'>
              <div className='grid grid-cols-2 gap-4'>
                <InputField handleChange={handleChange} address={address} name='firstName' type='text' placeholder='First Name' />
                <InputField handleChange={handleChange} address={address} name='lastName' type='text' placeholder='Last Name' />
              </div>
              <InputField handleChange={handleChange} address={address} name='email' type='email' placeholder='Email Address' />
              <InputField handleChange={handleChange} address={address} name='street' type='text' placeholder='Street / House no. / Area' />

              <div className='grid grid-cols-2 gap-4'>
                <InputField handleChange={handleChange} address={address} name='city' type='text' placeholder='City' />
                <InputField handleChange={handleChange} address={address} name='state' type='text' placeholder='State' />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <InputField handleChange={handleChange} address={address} name='zipcode' type='number' placeholder='Zip Code' />
                <InputField handleChange={handleChange} address={address} name='country' type='text' placeholder='Country' />
              </div>

              <InputField handleChange={handleChange} address={address} name='phone' type='number' placeholder='Phone Number' />

              <button
                type='submit'
                className='w-full rounded-lg bg-primary py-2.5 font-medium text-white transition hover:bg-primary-dull'
              >
                {isEditing ? 'Update Address' : 'Save Address'}
              </button>
              <p className='text-xs text-gray-500'>
                By clicking, you agree to our <span className='cursor-pointer text-primary'>Terms and Conditions</span>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Existing addresses */}
      {addresses.length === 0 && !showForm ? (
        <div className='rounded-2xl border border-dashed border-gray-300 py-14 text-center'>
          <FiMapPin className='mx-auto mb-3 text-3xl text-gray-400' />
          <p className='font-medium text-gray-700'>No saved addresses yet</p>
          <p className='mt-1 text-sm text-gray-500'>Add one to speed up checkout.</p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md'
            >
              <p className='font-semibold text-gray-800'>
                {addr.firstName} {addr.lastName}
              </p>
              <p className='mt-1 flex items-start gap-2 text-sm text-gray-700'>
                <FiMapPin className='mt-0.5 shrink-0 text-gray-400' />
                <span>
                  {addr.street}, {addr.city}, {addr.state}, {addr.country} - {addr.zipcode}
                </span>
              </p>
              <p className='mt-1 flex items-center gap-2 text-sm text-gray-600'>
                <FiPhone className='shrink-0 text-gray-400' /> {addr.phone}
              </p>
              <p className='mt-1 flex items-center gap-2 text-sm text-gray-600 break-all'>
                <FiMail className='shrink-0 text-gray-400' /> {addr.email}
              </p>
              <div className='mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xl'>
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
      )}
    </div>
  );
};

export default AddAddress;
