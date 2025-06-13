const { Blaaiz, BlaaizError } = require('../src');

describe('Blaaiz high level methods', () => {
  test('testConnection returns true on success', async () => {
    const sdk = new Blaaiz('key');
    sdk.currencies.list = jest.fn().mockResolvedValue({});
    await expect(sdk.testConnection()).resolves.toBe(true);
  });

  test('testConnection returns false on error', async () => {
    const sdk = new Blaaiz('key');
    sdk.currencies.list = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(sdk.testConnection()).resolves.toBe(false);
  });

  test('createCompleteePayout full flow', async () => {
    const sdk = new Blaaiz('key');
    sdk.customers.create = jest.fn().mockResolvedValue({ data: { data: { id: 'c1' } } });
    sdk.fees.getBreakdown = jest.fn().mockResolvedValue({ data: 'fee' });
    sdk.payouts.initiate = jest.fn().mockResolvedValue({ data: 'payout' });
    const payoutConfig = {
      customerData: {
        first_name: 'a', last_name: 'b', type: 'individual', email: 'e@e.com', country: 'NG', id_type: 'passport', id_number: '1'
      },
      payoutData: {
        wallet_id: 'w', method: 'bank_transfer', from_amount: 1, from_currency_id: 'USD', to_currency_id: 'NGN', account_number: '123'
      }
    };
    const res = await sdk.createCompleteePayout(payoutConfig);
    expect(res).toEqual({ customer_id: 'c1', payout: 'payout', fees: 'fee' });
    expect(sdk.customers.create).toHaveBeenCalledWith(payoutConfig.customerData);
    expect(sdk.fees.getBreakdown).toHaveBeenCalledWith({ from_currency_id: 'USD', to_currency_id: 'NGN', from_amount: 1 });
    expect(sdk.payouts.initiate).toHaveBeenCalledWith({ ...payoutConfig.payoutData, customer_id: 'c1' });
  });

  test('createCompleteePayout propagates errors', async () => {
    const sdk = new Blaaiz('key');
    sdk.fees.getBreakdown = jest.fn().mockResolvedValue({ data: 'fee' });
    sdk.payouts.initiate = jest.fn().mockRejectedValue(new Error('boom'));
    const payoutConfig = {
      payoutData: { wallet_id: 'w', method: 'bank_transfer', from_amount: 1, from_currency_id: 'USD', to_currency_id: 'NGN', account_number: '123', customer_id: 'c1' }
    };
    await expect(sdk.createCompleteePayout(payoutConfig)).rejects.toBeInstanceOf(BlaaizError);
  });

  test('createCompleteCollection with VBA', async () => {
    const sdk = new Blaaiz('key');
    sdk.customers.create = jest.fn().mockResolvedValue({ data: { data: { id: 'c2' } } });
    sdk.virtualBankAccounts.create = jest.fn().mockResolvedValue({ data: 'vba' });
    sdk.collections.initiate = jest.fn().mockResolvedValue({ data: 'collection' });
    const config = {
      customerData: { first_name: 'a', last_name: 'b', type: 'individual', email: 'e@e.com', country: 'NG', id_type: 'passport', id_number: '1' },
      collectionData: { method: 'bank_transfer', amount: 1, wallet_id: 'w' },
      createVBA: true
    };
    const res = await sdk.createCompleteCollection(config);
    expect(res).toEqual({ customer_id: 'c2', collection: 'collection', virtual_account: 'vba' });
    expect(sdk.virtualBankAccounts.create).toHaveBeenCalledWith({ wallet_id: 'w', account_name: 'a b' });
    expect(sdk.collections.initiate).toHaveBeenCalledWith({ ...config.collectionData, customer_id: 'c2' });
  });
});
