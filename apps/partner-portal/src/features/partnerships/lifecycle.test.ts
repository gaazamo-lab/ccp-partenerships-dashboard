import { describe, expect, it } from 'vitest';

import { canMarkExpired, terminationBlockers, transitionBlockers } from './lifecycle';
import { agreementFixture, obligationFixture } from './testFixtures';

describe('partnership lifecycle rules', () => {
  it('requires legal, signature, dates, and an obligation before activation', () => {
    const agreement = agreementFixture({
      legalContractRef: null,
      signedDocumentRef: null,
      effectiveDate: null,
      expiryDate: null,
    });

    expect(transitionBlockers(agreement, [], 'ACTIVE')).toEqual([
      'Link the S136 legal record.',
      'Link the executed S003 document.',
      'Set the effective date.',
      'Set the expiry date.',
      'Define at least one agreement obligation.',
    ]);
    expect(transitionBlockers(agreementFixture(), [obligationFixture()], 'ACTIVE')).toEqual([]);
  });

  it('blocks termination until all obligations are completed or waived', () => {
    expect(
      terminationBlockers([
        obligationFixture(),
        obligationFixture({ id: 'obligation-2', status: 'COMPLETED' }),
      ]),
    ).toEqual(['Close or waive 1 outstanding obligation.']);
    expect(terminationBlockers([obligationFixture({ status: 'WAIVED' })])).toEqual([]);
  });

  it('only marks active agreements expired after their expiry date', () => {
    expect(
      canMarkExpired(
        agreementFixture({ status: 'ACTIVE', expiryDate: '2026-09-19' }),
        '2026-09-20',
      ),
    ).toBe(true);
    expect(
      canMarkExpired(
        agreementFixture({ status: 'ACTIVE', expiryDate: '2026-09-20' }),
        '2026-09-20',
      ),
    ).toBe(false);
    expect(
      canMarkExpired(agreementFixture({ status: 'DRAFT', expiryDate: '2026-09-19' }), '2026-09-20'),
    ).toBe(false);
  });
});
