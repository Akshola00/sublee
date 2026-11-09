use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::testing_env;

const ONE_NEAR: u128 = 10u128.pow(24);
const MODEL: &str = "z-ai/glm-5.3-flash";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn ctx(predecessor: &str, deposit: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("sublee.testnet"))
        .predecessor_account_id(acc(predecessor))
        .signer_account_id(acc(predecessor))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .account_balance(NearToken::from_near(100));
    testing_env!(b.build());
}

fn setup() -> Contract {
    ctx("owner.testnet", 0);
    Contract::new(
        acc("owner.testnet"),
        acc("server.testnet"),
        acc("treasury.testnet"),
        acc("usdc.testnet"),
        vec![MODEL.into()],
    )
}

fn mint(c: &mut Contract, who: &str, near: u128, usdc: u128, cents: u128) -> TokenId {
    ctx(who, ONE_NEAR);
    c.mint_prompt(MintArgs {
        title: "Cardiology second look".into(),
        description: "Reasons like a cardiologist".into(),
        media: None,
        specialty: "cardiology".into(),
        model: MODEL.into(),
        price_near: U128(near),
        price_usdc: U128(usdc),
        price_cents: U128(cents),
        sealed_prompt: "ab".repeat(64),
    })
}

#[test]
fn mint_and_view() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    assert_eq!(id, "1");
    let v = c.get_prompt(id.clone()).unwrap();
    assert_eq!(v.owner_id, acc("author.testnet"));
    assert_eq!(v.creator_id, acc("author.testnet"));
    assert_eq!(v.price_near.0, ONE_NEAR);
    assert_eq!(c.list_prompts(None, None).len(), 1);
    assert_eq!(c.get_sealed_prompt(id).unwrap().1, 1);
}

#[test]
#[should_panic(expected = "Model not allowed")]
fn mint_rejects_unknown_model() {
    let mut c = setup();
    ctx("author.testnet", ONE_NEAR);
    c.mint_prompt(MintArgs {
        title: "x".into(), description: "".into(), media: None, specialty: "x".into(),
        model: "evil/model".into(), price_near: U128(1), price_usdc: U128(0), price_cents: U128(0),
        sealed_prompt: "abcd".into(),
    });
}

#[test]
#[should_panic(expected = "Sealed prompt must be hex")]
fn mint_rejects_plaintext_prompt() {
    let mut c = setup();
    ctx("author.testnet", ONE_NEAR);
    c.mint_prompt(MintArgs {
        title: "x".into(), description: "".into(), media: None, specialty: "x".into(),
        model: MODEL.into(), price_near: U128(1), price_usdc: U128(0), price_cents: U128(0),
        sealed_prompt: "you are a cardiologist".into(),
    });
}

#[test]
#[should_panic(expected = "for storage")]
fn mint_requires_storage_deposit() {
    let mut c = setup();
    ctx("author.testnet", 0);
    c.mint_prompt(MintArgs {
        title: "x".into(), description: "".into(), media: None, specialty: "x".into(),
        model: MODEL.into(), price_near: U128(1), price_usdc: U128(0), price_cents: U128(0),
        sealed_prompt: "abcd".into(),
    });
}

#[test]
fn pay_near_escrows_then_releases() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", 2 * ONE_NEAR); // overpay -> excess refunded
    let cid = c.pay_consult_near(id.clone());
    let con = c.get_consult(cid).unwrap();
    assert_eq!(con.status, ConsultStatus::Paid);
    assert_eq!(con.amount.0, ONE_NEAR);
    assert!(get_logs().iter().any(|l| l.contains("consult_paid")));

    ctx("server.testnet", 0);
    c.mark_used(cid);
    assert_eq!(c.get_consult(cid).unwrap().status, ConsultStatus::Used);
    assert_eq!(c.get_prompt(id).unwrap().uses, 1);
    assert!(get_logs().iter().any(|l| l.contains("consult_used") && l.contains(&(85 * ONE_NEAR / 100).to_string())));
}

#[test]
#[should_panic(expected = "below the price")]
fn underpay_panics() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR - 1);
    c.pay_consult_near(id);
}

#[test]
#[should_panic(expected = "does not accept NEAR")]
fn near_not_accepted_when_price_zero() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 0, 500);
    ctx("patient.testnet", ONE_NEAR);
    c.pay_consult_near(id);
}

#[test]
#[should_panic(expected = "Server only")]
fn mark_used_is_server_only() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id);
    ctx("patient.testnet", 0);
    c.mark_used(cid);
}

#[test]
#[should_panic(expected = "not in Paid state")]
fn double_mark_used_panics() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id);
    ctx("server.testnet", 0);
    c.mark_used(cid);
    c.mark_used(cid);
}

#[test]
#[should_panic(expected = "not in Paid state")]
fn refund_after_used_panics() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id);
    ctx("server.testnet", 0);
    c.mark_used(cid);
    c.refund(cid);
}

#[test]
fn fiat_credit_is_idempotent_and_spendable() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 0, 500);
    ctx("server.testnet", 0);
    assert!(c.credit_fiat(acc("patient.testnet"), U128(1_000), "cs_test_1".into()));
    assert!(!c.credit_fiat(acc("patient.testnet"), U128(1_000), "cs_test_1".into()));
    assert_eq!(c.fiat_balance_of(acc("patient.testnet")).0, 1_000);

    ctx("patient.testnet", 0);
    let cid = c.pay_consult_credit(id);
    assert_eq!(c.fiat_balance_of(acc("patient.testnet")).0, 500);

    ctx("server.testnet", 0);
    c.mark_used(cid);
    assert_eq!(c.earnings_of(acc("author.testnet")).cents.0, 425);
    assert_eq!(c.earnings_of(acc("treasury.testnet")).cents.0, 75);
}

#[test]
fn fiat_refund_restores_balance() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 0, 500);
    ctx("server.testnet", 0);
    c.credit_fiat(acc("patient.testnet"), U128(500), "cs_test_2".into());
    ctx("patient.testnet", 0);
    let cid = c.pay_consult_credit(id);
    ctx("server.testnet", 0);
    c.refund(cid);
    assert_eq!(c.fiat_balance_of(acc("patient.testnet")).0, 500);
    assert_eq!(c.get_consult(cid).unwrap().status, ConsultStatus::Refunded);
}

#[test]
#[should_panic(expected = "Server only")]
fn credit_fiat_is_server_only() {
    let mut c = setup();
    ctx("patient.testnet", 0);
    c.credit_fiat(acc("patient.testnet"), U128(1_000_000), "cs_fake".into());
}

#[test]
fn usdc_payment_returns_excess_and_accrues_on_use() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 2_000_000, 0);
    ctx("usdc.testnet", 0);
    let ret = c.ft_on_transfer(acc("patient.testnet"), U128(3_000_000), format!("{{\"token_id\":\"{id}\"}}"));
    match ret {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 1_000_000),
        _ => panic!("expected value"),
    }
    let cid = c.consults_for(acc("patient.testnet"), None, None)[0].id;
    ctx("server.testnet", 0);
    c.mark_used(cid);
    assert_eq!(c.earnings_of(acc("author.testnet")).usdc.0, 1_700_000);
    assert_eq!(c.earnings_of(acc("treasury.testnet")).usdc.0, 300_000);
}

#[test]
#[should_panic(expected = "Only USDC")]
fn ft_on_transfer_rejects_other_tokens() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 1, 0);
    ctx("scamcoin.testnet", 0);
    c.ft_on_transfer(acc("patient.testnet"), U128(1), format!("{{\"token_id\":\"{id}\"}}")).detach();
}

#[test]
fn royalties_follow_the_current_owner() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", 0, 0, 1_000);
    ctx("author.testnet", 1);
    c.nft_transfer(acc("buyer.testnet"), id.clone(), None, None);
    ctx("server.testnet", 0);
    c.credit_fiat(acc("patient.testnet"), U128(1_000), "cs_3".into());
    ctx("patient.testnet", 0);
    let cid = c.pay_consult_credit(id);
    ctx("server.testnet", 0);
    c.mark_used(cid);
    assert_eq!(c.earnings_of(acc("buyer.testnet")).cents.0, 850);
    assert_eq!(c.earnings_of(acc("author.testnet")).cents.0, 0);
}

#[test]
fn rating_once_by_patient_after_use() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id.clone());
    ctx("server.testnet", 0);
    c.mark_used(cid);
    ctx("patient.testnet", 0);
    c.rate(cid, 4);
    let v = c.get_prompt(id).unwrap();
    assert_eq!((v.rating_sum, v.rating_count), (4, 1));
}

#[test]
#[should_panic(expected = "Already rated")]
fn cannot_rate_twice() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id);
    ctx("server.testnet", 0);
    c.mark_used(cid);
    ctx("patient.testnet", 0);
    c.rate(cid, 4);
    c.rate(cid, 5);
}

#[test]
#[should_panic(expected = "Only completed consults")]
fn cannot_rate_unused() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("patient.testnet", ONE_NEAR);
    let cid = c.pay_consult_near(id);
    c.rate(cid, 5);
}

#[test]
#[should_panic(expected = "Only the NFT owner")]
fn only_owner_updates_prompt() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("someone.testnet", 0);
    c.update_prompt(id, Some(U128(1)), None, None, None, None);
}

#[test]
fn update_prompt_bumps_version() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("author.testnet", ONE_NEAR);
    c.update_prompt(id.clone(), None, None, None, Some(false), Some("cd".repeat(64)));
    let v = c.get_prompt(id).unwrap();
    assert_eq!(v.version, 2);
    assert!(!v.active);
}

#[test]
#[should_panic(expected = "not active")]
fn inactive_prompt_cannot_be_paid() {
    let mut c = setup();
    let id = mint(&mut c, "author.testnet", ONE_NEAR, 0, 0);
    ctx("author.testnet", 0);
    c.update_prompt(id.clone(), None, None, None, Some(false), None);
    ctx("patient.testnet", ONE_NEAR);
    c.pay_consult_near(id);
}
