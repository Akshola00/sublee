//! Sublee: secret specialist-prompt NFTs plus a pay-per-consult escrow ledger.
//!
//! Payment is escrowed in the Consult until the server marks it used (inference succeeded),
//! then split 85% to the NFT's current owner and 15% to the treasury. Refund returns it to the patient.
//! NEAR is paid out directly. USDC and fiat (USD cents) accrue as claimable earnings.

pub mod payout;

use near_contract_standards::non_fungible_token::core::{NonFungibleTokenCore, NonFungibleTokenResolver};
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token, TokenId};
use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap, LookupSet, Vector};
use near_sdk::{
    env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise,
    PromiseOrValue,
};
use std::collections::HashMap;

pub const MAX_SEALED_PROMPT_HEX: usize = 32_768; // 16 KB of ciphertext, hex-encoded
pub const MAX_LIST_LIMIT: u32 = 100;
const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
const GAS_RESOLVE: Gas = Gas::from_tgas(10);

#[derive(BorshStorageKey)]
#[near]
enum Key {
    NftOwners,
    NftMetadata,
    NftEnumeration,
    NftApprovals,
    Prompts,
    Consults,
    PatientConsults,
    PatientConsultsInner { account_hash: Vec<u8> },
    FiatBalances,
    FiatSessions,
    EarnedUsdc,
    EarnedCents,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum PayMethod {
    Near,
    Usdc,
    Fiat,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum ConsultStatus {
    Paid,
    Claimed,
    Used,
    Refunded,
}

#[near(serializers = [borsh])]
pub struct Prompt {
    pub creator_id: AccountId,
    pub specialty: String,
    pub model: String,
    pub price_near: u128,  // yoctoNEAR, 0 = not accepted
    pub price_usdc: u128,  // USDC base units (6 dp), 0 = not accepted
    pub price_cents: u128, // USD cents for card credit, 0 = not accepted
    pub sealed_prompt: String,
    pub version: u32,
    pub uses: u64,
    pub rating_sum: u64,
    pub rating_count: u64,
    pub active: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Consult {
    pub id: u64,
    pub patient_id: AccountId,
    pub token_id: TokenId,
    pub prompt_version: u32,
    pub method: PayMethod,
    pub amount: U128,
    pub created_at_ms: u64,
    pub status: ConsultStatus,
    pub rating: Option<u8>,
}

#[near(serializers = [json])]
pub struct PromptView {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub creator_id: AccountId,
    pub metadata: Option<TokenMetadata>,
    pub specialty: String,
    pub model: String,
    pub price_near: U128,
    pub price_usdc: U128,
    pub price_cents: U128,
    pub version: u32,
    pub uses: u64,
    pub rating_sum: u64,
    pub rating_count: u64,
    pub active: bool,
}

#[near(serializers = [json])]
pub struct MintArgs {
    pub title: String,
    pub description: String,
    pub media: Option<String>,
    pub specialty: String,
    pub model: String,
    pub price_near: U128,
    pub price_usdc: U128,
    pub price_cents: U128,
    pub sealed_prompt: String,
}

#[near(serializers = [json])]
pub struct Earnings {
    pub usdc: U128,
    pub cents: U128,
}

#[near(event_json(standard = "sublee"))]
pub enum Event {
    #[event_version("1.0.0")]
    ConsultPaid { consult_id: u64, token_id: TokenId, patient_id: AccountId, method: PayMethod, amount: U128 },
    #[event_version("1.0.0")]
    ConsultClaimed { consult_id: u64 },
    #[event_version("1.0.0")]
    ConsultUsed { consult_id: u64, token_id: TokenId, owner_id: AccountId, owner_share: U128 },
    #[event_version("1.0.0")]
    ConsultRefunded { consult_id: u64 },
    #[event_version("1.0.0")]
    ConsultRated { consult_id: u64, token_id: TokenId, rating: u8 },
    #[event_version("1.0.0")]
    FiatCredited { account_id: AccountId, cents: U128, session_id: String },
}

#[ext_contract(ext_ft)]
#[allow(dead_code)]
trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    tokens: NonFungibleToken,
    prompts: IterableMap<TokenId, Prompt>,
    next_token_id: u64,
    consults: LookupMap<u64, Consult>,
    patient_consults: LookupMap<AccountId, Vector<u64>>,
    next_consult_id: u64,
    fiat_balances: LookupMap<AccountId, u128>,
    fiat_sessions: LookupSet<String>,
    earned_usdc: LookupMap<AccountId, u128>,
    earned_cents: LookupMap<AccountId, u128>,
    owner_id: AccountId,
    server_id: AccountId,
    treasury_id: AccountId,
    usdc_id: AccountId,
    allowed_models: Vec<String>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(
        owner_id: AccountId,
        server_id: AccountId,
        treasury_id: AccountId,
        usdc_id: AccountId,
        allowed_models: Vec<String>,
    ) -> Self {
        Self {
            tokens: NonFungibleToken::new(
                Key::NftOwners,
                env::current_account_id(),
                Some(Key::NftMetadata),
                Some(Key::NftEnumeration),
                Some(Key::NftApprovals),
            ),
            prompts: IterableMap::new(Key::Prompts),
            next_token_id: 1,
            consults: LookupMap::new(Key::Consults),
            patient_consults: LookupMap::new(Key::PatientConsults),
            next_consult_id: 1,
            fiat_balances: LookupMap::new(Key::FiatBalances),
            fiat_sessions: LookupSet::new(Key::FiatSessions),
            earned_usdc: LookupMap::new(Key::EarnedUsdc),
            earned_cents: LookupMap::new(Key::EarnedCents),
            owner_id,
            server_id,
            treasury_id,
            usdc_id,
            allowed_models,
        }
    }

    // ---------- prompts ----------

    /// Mint a specialist prompt NFT to the caller. Attach enough NEAR for storage; the excess is refunded.
    #[payable]
    pub fn mint_prompt(&mut self, args: MintArgs) -> TokenId {
        let start = env::storage_usage();
        let caller = env::predecessor_account_id();
        self.assert_model(&args.model);
        Self::assert_sealed(&args.sealed_prompt);
        require!(!args.title.trim().is_empty() && args.title.len() <= 120, "Title must be 1..120 chars");
        require!(args.description.len() <= 2_000, "Description too long");
        require!(
            args.price_near.0 > 0 || args.price_usdc.0 > 0 || args.price_cents.0 > 0,
            "Set at least one price"
        );

        let token_id = self.next_token_id.to_string();
        self.next_token_id += 1;
        let metadata = TokenMetadata {
            title: Some(args.title),
            description: Some(args.description),
            media: args.media,
            media_hash: None,
            copies: Some(1),
            issued_at: Some(env::block_timestamp_ms().to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: Some(
                near_sdk::serde_json::json!({ "specialty": args.specialty, "model": args.model }).to_string(),
            ),
            reference: None,
            reference_hash: None,
        };
        self.tokens.internal_mint_with_refund(token_id.clone(), caller.clone(), Some(metadata), None);
        self.prompts.insert(
            token_id.clone(),
            Prompt {
                creator_id: caller.clone(),
                specialty: args.specialty,
                model: args.model,
                price_near: args.price_near.0,
                price_usdc: args.price_usdc.0,
                price_cents: args.price_cents.0,
                sealed_prompt: args.sealed_prompt,
                version: 1,
                uses: 0,
                rating_sum: 0,
                rating_count: 0,
                active: true,
            },
        );
        self.prompts.flush();
        near_contract_standards::non_fungible_token::events::NftMint {
            owner_id: &caller,
            token_ids: &[&token_id],
            memo: None,
        }
        .emit();
        Self::charge_storage(start, &caller);
        token_id
    }

    /// Current NFT owner updates pricing/active flag, and optionally ships a new prompt version.
    #[payable]
    pub fn update_prompt(
        &mut self,
        token_id: TokenId,
        price_near: Option<U128>,
        price_usdc: Option<U128>,
        price_cents: Option<U128>,
        active: Option<bool>,
        sealed_prompt: Option<String>,
    ) {
        let start = env::storage_usage();
        let caller = env::predecessor_account_id();
        require!(self.nft_owner(&token_id) == caller, "Only the NFT owner can update");
        if let Some(s) = &sealed_prompt {
            Self::assert_sealed(s);
        }
        let p = self.prompts.get_mut(&token_id).unwrap_or_else(|| env::panic_str("Unknown prompt"));
        if let Some(v) = price_near { p.price_near = v.0; }
        if let Some(v) = price_usdc { p.price_usdc = v.0; }
        if let Some(v) = price_cents { p.price_cents = v.0; }
        if let Some(v) = active { p.active = v; }
        if let Some(s) = sealed_prompt {
            p.sealed_prompt = s;
            p.version += 1;
        }
        require!(p.price_near > 0 || p.price_usdc > 0 || p.price_cents > 0, "Set at least one price");
        self.prompts.flush();
        if env::storage_usage() > start {
            Self::charge_storage(start, &caller);
        } else if env::attached_deposit() > NearToken::from_yoctonear(0) {
            Promise::new(caller).transfer(env::attached_deposit()).detach();
        }
    }

    // ---------- payments (escrowed) ----------

    #[payable]
    pub fn pay_consult_near(&mut self, token_id: TokenId) -> u64 {
        let patient = env::predecessor_account_id();
        let price = self.active_prompt(&token_id).price_near;
        require!(price > 0, "This prompt does not accept NEAR");
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit >= price, "Attached deposit is below the price");
        let id = self.open_consult(patient.clone(), token_id, PayMethod::Near, price);
        if deposit > price {
            Promise::new(patient).transfer(NearToken::from_yoctonear(deposit - price)).detach();
        }
        id
    }

    /// NEP-141 receiver for USDC. `msg` = `{"token_id":"1"}`. Returns the unused amount (excess) to refund.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.usdc_id, "Only USDC is accepted");
        #[near(serializers = [json])]
        struct Msg {
            token_id: TokenId,
        }
        let parsed: Msg = near_sdk::serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("Bad msg"));
        let price = self.active_prompt(&parsed.token_id).price_usdc;
        require!(price > 0, "This prompt does not accept USDC");
        require!(amount.0 >= price, "Amount is below the price");
        self.open_consult(sender_id, parsed.token_id, PayMethod::Usdc, price);
        PromiseOrValue::Value(U128(amount.0 - price))
    }

    pub fn pay_consult_credit(&mut self, token_id: TokenId) -> u64 {
        let patient = env::predecessor_account_id();
        let price = self.active_prompt(&token_id).price_cents;
        require!(price > 0, "This prompt does not accept card credit");
        let bal = self.fiat_balances.get(&patient).copied().unwrap_or(0);
        require!(bal >= price, "Not enough card credit");
        self.fiat_balances.insert(patient.clone(), bal - price);
        self.open_consult(patient, token_id, PayMethod::Fiat, price)
    }

    // ---------- server-only ----------

    /// Credit card top-up after a Stripe Checkout completes. Idempotent per Stripe session id.
    pub fn credit_fiat(&mut self, account_id: AccountId, cents: U128, session_id: String) -> bool {
        self.assert_server();
        require!(cents.0 > 0, "Zero credit");
        if !self.fiat_sessions.insert(session_id.clone()) {
            return false;
        }
        let bal = self.fiat_balances.get(&account_id).copied().unwrap_or(0);
        self.fiat_balances.insert(account_id.clone(), bal + cents.0);
        Event::FiatCredited { account_id, cents, session_id }.emit();
        true
    }

    /// Atomically lock a paid consult before inference so one payment buys exactly one answer.
    pub fn claim(&mut self, consult_id: u64) -> Consult {
        self.assert_server();
        let c = self.consults.get_mut(&consult_id).unwrap_or_else(|| env::panic_str("Unknown consult"));
        require!(c.status == ConsultStatus::Paid, "Consult is not in Paid state");
        c.status = ConsultStatus::Claimed;
        let out = c.clone();
        Event::ConsultClaimed { consult_id }.emit();
        out
    }

    /// Inference succeeded: release escrow to the current NFT owner (85%) and treasury (15%).
    pub fn mark_used(&mut self, consult_id: u64) {
        self.assert_server();
        let c = self.consults.get_mut(&consult_id).unwrap_or_else(|| env::panic_str("Unknown consult"));
        require!(c.status == ConsultStatus::Claimed, "Consult is not claimed");
        c.status = ConsultStatus::Used;
        let (token_id, method, amount) = (c.token_id.clone(), c.method, c.amount.0);
        let owner = self.nft_owner(&token_id);
        let (owner_share, treasury_share) = payout::split(amount);
        match method {
            PayMethod::Near => {
                if owner_share > 0 {
                    Promise::new(owner.clone()).transfer(NearToken::from_yoctonear(owner_share)).detach();
                }
                if treasury_share > 0 {
                    Promise::new(self.treasury_id.clone()).transfer(NearToken::from_yoctonear(treasury_share)).detach();
                }
            }
            PayMethod::Usdc => {
                Self::accrue(&mut self.earned_usdc, &owner, owner_share);
                let t = self.treasury_id.clone();
                Self::accrue(&mut self.earned_usdc, &t, treasury_share);
            }
            PayMethod::Fiat => {
                Self::accrue(&mut self.earned_cents, &owner, owner_share);
                let t = self.treasury_id.clone();
                Self::accrue(&mut self.earned_cents, &t, treasury_share);
            }
        }
        if let Some(p) = self.prompts.get_mut(&token_id) {
            p.uses += 1;
        }
        Event::ConsultUsed { consult_id, token_id, owner_id: owner, owner_share: U128(owner_share) }.emit();
    }

    /// Inference failed: return escrow to the patient.
    pub fn refund(&mut self, consult_id: u64) {
        self.assert_server();
        let c = self.consults.get_mut(&consult_id).unwrap_or_else(|| env::panic_str("Unknown consult"));
        require!(matches!(c.status, ConsultStatus::Paid | ConsultStatus::Claimed), "Consult is not refundable");
        c.status = ConsultStatus::Refunded;
        let (patient, method, amount) = (c.patient_id.clone(), c.method, c.amount.0);
        match method {
            PayMethod::Near => {
                Promise::new(patient).transfer(NearToken::from_yoctonear(amount)).detach();
            }
            PayMethod::Usdc => {
                ext_ft::ext(self.usdc_id.clone())
                    .with_attached_deposit(NearToken::from_yoctonear(1))
                    .with_static_gas(GAS_FT_TRANSFER)
                    .ft_transfer(patient, U128(amount), Some(format!("Sublee refund #{consult_id}"))).detach();
            }
            PayMethod::Fiat => {
                let bal = self.fiat_balances.get(&patient).copied().unwrap_or(0);
                self.fiat_balances.insert(patient, bal + amount);
            }
        }
        Event::ConsultRefunded { consult_id }.emit();
    }

    // ---------- patient ----------

    pub fn rate(&mut self, consult_id: u64, rating: u8) {
        require!((1..=5).contains(&rating), "Rating must be 1..5");
        let caller = env::predecessor_account_id();
        let c = self.consults.get_mut(&consult_id).unwrap_or_else(|| env::panic_str("Unknown consult"));
        require!(c.patient_id == caller, "Not your consult");
        require!(c.status == ConsultStatus::Used, "Only completed consults can be rated");
        require!(c.rating.is_none(), "Already rated");
        c.rating = Some(rating);
        let token_id = c.token_id.clone();
        if let Some(p) = self.prompts.get_mut(&token_id) {
            p.rating_sum += rating as u64;
            p.rating_count += 1;
        }
        Event::ConsultRated { consult_id, token_id, rating }.emit();
    }

    // ---------- earnings ----------

    /// Withdraw accrued USDC earnings. Restored if the transfer fails.
    pub fn claim_usdc(&mut self) -> Promise {
        let caller = env::predecessor_account_id();
        let amount = self.earned_usdc.remove(&caller).unwrap_or(0);
        require!(amount > 0, "Nothing to claim");
        ext_ft::ext(self.usdc_id.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(caller.clone(), U128(amount), Some("Sublee earnings".into()))
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_RESOLVE).on_claim_usdc(caller, U128(amount)))
    }

    #[private]
    pub fn on_claim_usdc(&mut self, account_id: AccountId, amount: U128) {
        if !matches!(env::promise_result_checked(0, 1024), Ok(_)) {
            Self::accrue(&mut self.earned_usdc, &account_id, amount.0);
        }
    }

    // ---------- admin ----------

    pub fn set_server(&mut self, server_id: AccountId) {
        self.assert_owner();
        self.server_id = server_id;
    }

    pub fn set_allowed_models(&mut self, models: Vec<String>) {
        self.assert_owner();
        self.allowed_models = models;
    }

    // ---------- views ----------

    pub fn list_prompts(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<PromptView> {
        let from = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(50).min(MAX_LIST_LIMIT) as usize;
        self.prompts.keys().skip(from).take(limit).map(|id| self.view(id)).collect()
    }

    pub fn get_prompt(&self, token_id: TokenId) -> Option<PromptView> {
        self.prompts.contains_key(&token_id).then(|| self.view(&token_id))
    }

    /// Ciphertext sealed to the Sublee server key. Public on-chain anyway; exposed for the server.
    pub fn get_sealed_prompt(&self, token_id: TokenId) -> Option<(String, u32)> {
        self.prompts.get(&token_id).map(|p| (p.sealed_prompt.clone(), p.version))
    }

    pub fn get_consult(&self, consult_id: u64) -> Option<&Consult> {
        self.consults.get(&consult_id)
    }

    pub fn consults_for(&self, account_id: AccountId, from_index: Option<u32>, limit: Option<u32>) -> Vec<&Consult> {
        let Some(ids) = self.patient_consults.get(&account_id) else { return vec![] };
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(50).min(MAX_LIST_LIMIT);
        (from..ids.len().min(from.saturating_add(limit)))
            .filter_map(|i| ids.get(i).and_then(|id| self.consults.get(id)))
            .collect()
    }

    pub fn fiat_balance_of(&self, account_id: AccountId) -> U128 {
        U128(self.fiat_balances.get(&account_id).copied().unwrap_or(0))
    }

    pub fn earnings_of(&self, account_id: AccountId) -> Earnings {
        Earnings {
            usdc: U128(self.earned_usdc.get(&account_id).copied().unwrap_or(0)),
            cents: U128(self.earned_cents.get(&account_id).copied().unwrap_or(0)),
        }
    }

    pub fn get_config(&self) -> near_sdk::serde_json::Value {
        near_sdk::serde_json::json!({
            "owner_id": self.owner_id, "server_id": self.server_id, "treasury_id": self.treasury_id,
            "usdc_id": self.usdc_id, "allowed_models": self.allowed_models,
            "owner_bps": payout::OWNER_BPS as u64,
        })
    }
}

// ---------- internals ----------
impl Contract {
    fn assert_server(&self) {
        require!(env::predecessor_account_id() == self.server_id, "Server only");
    }
    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "Owner only");
    }
    fn assert_model(&self, model: &str) {
        require!(self.allowed_models.iter().any(|m| m == model), "Model not allowed");
    }
    fn assert_sealed(s: &str) {
        require!(!s.is_empty() && s.len() <= MAX_SEALED_PROMPT_HEX, "Sealed prompt size out of range");
        require!(s.len() % 2 == 0 && s.bytes().all(|b| b.is_ascii_hexdigit()), "Sealed prompt must be hex");
    }
    fn nft_owner(&self, token_id: &TokenId) -> AccountId {
        self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| env::panic_str("Unknown token"))
    }
    fn active_prompt(&self, token_id: &TokenId) -> &Prompt {
        let p = self.prompts.get(token_id).unwrap_or_else(|| env::panic_str("Unknown prompt"));
        require!(p.active, "Prompt is not active");
        p
    }
    fn accrue(map: &mut LookupMap<AccountId, u128>, who: &AccountId, amount: u128) {
        if amount == 0 {
            return;
        }
        let cur = map.get(who).copied().unwrap_or(0);
        map.insert(who.clone(), cur + amount);
    }
    fn open_consult(&mut self, patient: AccountId, token_id: TokenId, method: PayMethod, amount: u128) -> u64 {
        let id = self.next_consult_id;
        self.next_consult_id += 1;
        let version = self.prompts.get(&token_id).map(|p| p.version).unwrap_or(1);
        self.consults.insert(
            id,
            Consult {
                id,
                patient_id: patient.clone(),
                token_id: token_id.clone(),
                prompt_version: version,
                method,
                amount: U128(amount),
                created_at_ms: env::block_timestamp_ms(),
                status: ConsultStatus::Paid,
                rating: None,
            },
        );
        let list = self.patient_consults.entry(patient.clone()).or_insert_with(|| {
            Vector::new(Key::PatientConsultsInner { account_hash: env::sha256(patient.as_bytes()) })
        });
        list.push(id);
        Event::ConsultPaid { consult_id: id, token_id, patient_id: patient, method, amount: U128(amount) }.emit();
        id
    }
    fn charge_storage(start: u64, payer: &AccountId) {
        let used = env::storage_usage().saturating_sub(start) as u128;
        let cost = env::storage_byte_cost().as_yoctonear() * used;
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit >= cost, format!("Attach at least {cost} yoctoNEAR for storage"));
        if deposit > cost {
            Promise::new(payer.clone()).transfer(NearToken::from_yoctonear(deposit - cost)).detach();
        }
    }
    fn view(&self, token_id: &TokenId) -> PromptView {
        let p = self.prompts.get(token_id).expect("prompt");
        let token = self.tokens.nft_token(token_id.clone()).expect("token");
        PromptView {
            token_id: token_id.clone(),
            owner_id: token.owner_id,
            creator_id: p.creator_id.clone(),
            metadata: token.metadata,
            specialty: p.specialty.clone(),
            model: p.model.clone(),
            price_near: U128(p.price_near),
            price_usdc: U128(p.price_usdc),
            price_cents: U128(p.price_cents),
            version: p.version,
            uses: p.uses,
            rating_sum: p.rating_sum,
            rating_count: p.rating_count,
            active: p.active,
        }
    }
}

// ---------- NEP-171 / 177 / 181 ----------

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        self.tokens.nft_transfer(receiver_id, token_id, approval_id, memo)
    }
    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        self.tokens.nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }
    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        self.tokens.nft_resolve_transfer(previous_owner_id, receiver_id, token_id, approved_account_ids)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }
    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }
    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }
    fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens_for_owner(account_id, from_index, limit)
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "Sublee Specialist Prompts".to_string(),
            symbol: "SUBLEE".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }
}

#[cfg(test)]
mod tests;
