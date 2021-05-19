import { FormCheckbox as FormRadio, FormError } from '../Form';

export default function ShippingOptions({ shippingOptions, loading, error, onShippingSelect }) {
  if (loading) {
    return 'Loading...';
  }

  if (error) {
    return error;
  }

  if (shippingOptions.length) {
    return (
      <>
        <div className="-space-y-1">
          {shippingOptions.map(({ id, description, price }) => (
            <FormRadio
              id={id}
              type="radio"
              name="fulfillment.shipping_method"
              value={id}
              label={`${description}: ${price.formatted_with_symbol}`}
              onChange={onShippingSelect}
              required="You must select a shipping option"
            />
          ))}
        </div>

        <FormError name="fulfillment.shipping_method" />
      </>
    );
  }

  return (
    <p className="text-sm text-black">
      Please enter your address to fetch shipping options
    </p>
  )
}
