import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useDebounce, useDebouncedCallback } from 'use-debounce';

import { commerce } from "../../lib/commerce";
import { useCheckoutState, useCheckoutDispatch } from "../../context/checkout";

import AddressFields from "./AddressFields";
import ShippingOptions from './ShippingOptions';

function ShippingForm() {
  const { id } = useCheckoutState();
  const { setShippingMethod } = useCheckoutDispatch();
  const [countries, setCountries] = useState();
  const [subdivisions, setSubdivisions] = useState();
  const [shippingOptions, setShippingOptions] = useState([]);
  const [addressIsValid, setAddressIsValid] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [shippingOptionsAreLoading, setShippingOptionsAreLoading] = useState(false);
  const methods = useFormContext();
  const { watch, setValue } = methods;

  const watchCountry = watch("shipping.country");
  const watchSubdivision = watch("shipping.region");
  const [watchAddress] = useDebounce(watch('shipping'), 600);

  useEffect(() => {
    fetchCountries(id);
  }, []);

  // Reset the shipping region and fetch new sub-regions when the country changes
  useEffect(() => {
    setValue("shipping.region", "");

    if (watchCountry) {
      fetchSubdivisions(id, watchCountry);
    }
  }, [watchCountry]);

  // Update address validity flag
  useEffect(() => {
    if (!watchAddress) {
      setAddressIsValid(false);
      return;
    }

    const { region, firstname, lastname, street, town_city: city, postal_zip_code: zip, country } = watchAddress;

    // Check address fields are provided
    if (![region, street, city, zip, country].every((val) => val && val !== '')) {
      setAddressIsValid(false);
      return;
    }

    // Check one of the name fields is provided
    const name = [firstname, lastname].filter(part => part !== '').join(' ');
    if (name.length === 0) {
      setAddressIsValid(false);
      return;
    }

    setAddressIsValid(true);
  }, [watchAddress]);

  // Fetch shipping options when the address is made valid
  useEffect(() => {
    if (!addressIsValid) {
      return;
    }

    const { region, firstname, lastname, street, town_city: city, postal_zip_code: zip, country } = watchAddress;
    const name = [firstname, lastname].filter(part => part !== '').join(' ');

    fetchShippingOptions(id, {
      name,
      street1: street,
      city,
      zip,
      country,
      state: region,
    })
  }, [addressIsValid]);


  const fetchCountries = async (checkoutId) => {
    try {
      const { countries } = await commerce.services.localeListShippingCountries(
        checkoutId
      );

      setCountries(countries);
    } catch (err) {
      // noop
    }
  };

  const fetchSubdivisions = async (checkoutId, countryCode) => {
    try {
      const {
        subdivisions,
      } = await commerce.services.localeListShippingSubdivisions(
        checkoutId,
        countryCode
      );

      setSubdivisions(subdivisions);
    } catch (err) {
      // noop
    }
  };

  const fetchShippingOptions = async (checkoutId, address) => {
    if (!checkoutId) {
      return;
    }

    setValue("fulfillment.shipping_method", null);
    setShippingOptionsAreLoading(true);
    setShippingOptions([]);

    try {
      const shippingOptions = await fetch(`/api/shipping?token=${checkoutId}&address=${JSON.stringify(address)}`)
        .then(response => {
          return response.json();
        });

      console.log(shippingOptions);

      if (Array.isArray(shippingOptions)) {
        setShippingOptions(shippingOptions);

        if (shippingOptions.length === 1) {
          const [shippingOption] = shippingOptions;

          setValue("fulfillment.shipping_method", shippingOption.id);
          selectShippingMethod(shippingOption.id);
        }
      }
    } catch (err) {
      // noop
    } finally {
      setShippingOptionsAreLoading(false);
    }
  };

  const onShippingSelect = ({ target: { value } }) =>
    selectShippingMethod(value);

  const selectShippingMethod = async (optionId) => {
    try {
      await setShippingMethod(optionId, watchCountry, watchSubdivision);
    } catch (err) {
      // noop
    }
  };

  return (
    <div className="md:flex md:space-x-12 lg:space-x-24">
      <div className="md:w-1/2">
        <fieldset className="mb-3 md:mb-4">
          <legend className="text-black font-medium text-lg md:text-xl py-3 block">
            Shipping address
          </legend>

          <AddressFields
            prefix="shipping"
            countries={countries}
            subdivisions={subdivisions}
          />
        </fieldset>
      </div>
      <div className="md:w-1/2">
        <fieldset className="mb-3 md:mb-4">
          <legend className="text-black font-medium text-lg md:text-xl py-3 block">
            Shipping
          </legend>
          <ShippingOptions
            shippingOptions={shippingOptions}
            error={addressError}
            loading={shippingOptionsAreLoading}
            onShippingSelect={onShippingSelect}
          />
        </fieldset>
      </div>
    </div>
  );
}

export default ShippingForm;
