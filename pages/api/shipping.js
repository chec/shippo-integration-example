const { commerce } = require('../../lib/commerce');
const shippo = require('shippo')(process.env.SHIPPO_TOKEN);

export default async function handler(req, res) {
  const { token, address } = req.query;

  if (!token || !address) {
    return res.status(422).json({
      code: 'MISSING_ATTRIBUTES',
      message: 'A token and address must be provided',
    });
  }

  const promises = [];
  promises.push(commerce.checkout.getLive(token));
  promises.push(commerce.merchants.about());

  const [checkout, merchant] = await Promise.all(promises);

  const products = checkout.line_items.map(({ product_id: id }) => id);
  const productDetail = await commerce.products.list({ query: products.join(',') });

  const { street, city, country, postal_zip_code: zip, region } = merchant.address;
  const merchantAddress = {
    name: merchant.business_name,
    street1: street,
    city,
    zip,
    state: region,
    country
  };

  // Build other attributes that shippo might require based on your business here, like customs declarations for
  // shipping parcels internationally.

  const shipment = await shippo.shipment.create({
    address_from: merchantAddress,
    address_to: JSON.parse(address),
    parcels: productDetail.data.map(({ meta: { shipping }}) => shipping),
  });

  // The destination address is marked as invalid by Shippo for some reason. Paid accounts with Shippo may choose to
  // implement their address verification service here
  if (!shipment.address_to.is_complete || !shipment.rates) {
    return res.status(422).json({
      code: 'INVALID_ADDRESS',
      message: 'The provided address does not appear to be valid or can not be shipped to',
    })
  }

  // Add the shipping methods provided by Shippo to the checkout using Chec's private API
  const response = await fetch(`${process.env.CHEC_API_URL}/v1/checkouts/${token}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': process.env.CHEC_SECRET_KEY,
    },
    body: JSON.stringify({
      shipping_methods: shipment.rates.map(({ object_id: id, provider, amount, servicelevel: { name }}) => ({
        id,
        description: `${provider}: ${name}`,
        price: amount,
      }))
    })
  }).then((response) => response.json());

  return res.status(200).json(response.shipping_methods);
}
