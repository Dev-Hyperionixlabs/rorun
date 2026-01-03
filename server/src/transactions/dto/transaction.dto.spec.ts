import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDto } from './transaction.dto';

describe('CreateTransactionDto', () => {
  it('accepts amount as string and coerces to number', async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      type: 'income',
      amount: '25000',
      date: '2026-01-03',
      currency: 'NGN',
      source: 'manual',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(typeof dto.amount).toBe('number');
    expect(dto.amount).toBe(25000);
  });

  it('rejects invalid date', async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: 5000,
      date: 'not-a-date',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'date')).toBe(true);
  });

  it('rejects non-positive amount', async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: 0,
      date: '2026-01-03',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });
});


