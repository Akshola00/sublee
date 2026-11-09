//! Pure split math. Integer only; the treasury absorbs rounding dust so shares always sum to `amount`.

/// Owner share in basis points (85%).
pub const OWNER_BPS: u128 = 8_500;
pub const BPS_DENOM: u128 = 10_000;

/// Returns `(owner_share, treasury_share)`, and `owner + treasury == amount` always.
pub fn split(amount: u128) -> (u128, u128) {
    let owner = amount / BPS_DENOM * OWNER_BPS + (amount % BPS_DENOM) * OWNER_BPS / BPS_DENOM;
    (owner, amount - owner)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_sum_to_amount() {
        for a in [0u128, 1, 7, 99, 10_000, 123_456_789, 10u128.pow(24), u128::MAX] {
            let (o, t) = split(a);
            assert_eq!(o + t, a, "amount {a}");
        }
    }

    #[test]
    fn exact_85_15() {
        assert_eq!(split(10u128.pow(24)), (85 * 10u128.pow(22), 15 * 10u128.pow(22)));
        assert_eq!(split(500), (425, 75));
    }

    #[test]
    fn no_overflow_at_max() {
        let (o, _) = split(u128::MAX);
        assert!(o < u128::MAX);
    }
}
