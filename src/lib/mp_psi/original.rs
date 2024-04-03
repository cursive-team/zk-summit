use bfv::{
    BfvParameters, CiphertextProto, CollectiveDecryption, CollectiveDecryptionShare,
    CollectiveDecryptionShareProto, CollectivePublicKeyGenerator, CollectivePublicKeyShareProto,
    CollectiveRlkAggTrimmedShare1Proto, CollectiveRlkGenerator, CollectiveRlkShare1Proto,
    CollectiveRlkShare2Proto, Encoding, EvaluationKey, Evaluator, Plaintext, SecretKey,
    SecretKeyProto,
};
use itertools::{izip, Itertools};
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use traits::{
    TryDecodingWithParameters, TryEncodingWithParameters, TryFromWithLevelledParameters,
    TryFromWithParameters,
};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

mod bandwidth_benches;

static CRS_PK: [u8; 32] = [13u8; 32];
static CRS_RLK: [u8; 32] = [121u8; 32];

static RING_SIZE: usize = 1 << 11;

fn params() -> BfvParameters {
    let mut params = BfvParameters::new_with_primes(
        vec![1032193, 1073692673],
        vec![995329, 1073668097],
        40961,
        RING_SIZE,
    );
    params.enable_hybrid_key_switching_with_prime(vec![61441]);
    params.enable_pke();
    params
}

/************* GENERATING KEYS *************/

#[derive(Serialize, Deserialize)]
struct PsiKeys {
    s: SecretKeyProto,
    s_rlk: SecretKeyProto,
}

#[derive(Clone, Serialize, Deserialize)]
struct MessageRound1 {
    share_pk: CollectivePublicKeyShareProto,
    share_rlk1: CollectiveRlkShare1Proto,
}

#[derive(Serialize, Deserialize)]
struct GenKeysOutput {
    psi_keys: PsiKeys,
    message_round1: MessageRound1,
}

#[wasm_bindgen]
pub fn gen_keys_js() -> JsValue {
    let output = gen_keys();
    serde_wasm_bindgen::to_value(&output).unwrap()
}

fn gen_keys() -> GenKeysOutput {
    let params = params();
    let mut rng = thread_rng();
    let s = SecretKey::random_with_params(&params, &mut rng);
    let s_rlk = CollectiveRlkGenerator::init_state(&params, &mut rng);

    let share_pk = CollectivePublicKeyGenerator::generate_share(&params, &s, CRS_PK, &mut rng);
    let share_rlk1 =
        CollectiveRlkGenerator::generate_share_1(&params, &s, &s_rlk, CRS_RLK, 0, &mut rng);

    GenKeysOutput {
        psi_keys: PsiKeys {
            s: convert(&s, &params),
            s_rlk: convert(&s_rlk, &params),
        },
        message_round1: MessageRound1 {
            share_pk: convert(&share_pk, &params),
            share_rlk1: convert(&share_rlk1, &params),
        },
    }
}

/************* ROUND 1 *************/

#[derive(Serialize, Deserialize)]
struct Round1Output {
    state_round2: StateRound2,
    message_round2: MessageRound2,
}

#[derive(Serialize, Deserialize)]
struct StateRound2 {
    rlk_agg1_trimmed: CollectiveRlkAggTrimmedShare1Proto,
}

#[derive(Clone, Serialize, Deserialize)]
struct MessageRound2 {
    share_rlk2: CollectiveRlkShare2Proto,
    cts: Vec<CiphertextProto>,
}

#[wasm_bindgen]
pub fn round1_js(
    gen_keys_output: JsValue,
    other_message_round1: JsValue,
    bit_vector: &[u32],
) -> JsValue {
    let gen_keys_output: GenKeysOutput = serde_wasm_bindgen::from_value(gen_keys_output)
        .expect("failed to deserialize gen_keys_output");
    let other_message_round1: MessageRound1 = serde_wasm_bindgen::from_value(other_message_round1)
        .expect("failed to deserialize other_message_round1");
    let output = round1(
        &gen_keys_output.psi_keys,
        gen_keys_output.message_round1,
        other_message_round1,
        bit_vector,
    );

    serde_wasm_bindgen::to_value(&output).unwrap()
}

fn round1(
    psi_keys: &PsiKeys,
    message: MessageRound1,
    other_message: MessageRound1,
    bit_vector: &[u32],
) -> Round1Output {
    let params = params();
    let mut rng = thread_rng();

    let self_s = convert(&psi_keys.s, &params);
    let self_s_rlk = convert(&psi_keys.s_rlk, &params);
    let self_share_pk = convert(&message.share_pk, &params);
    let other_share_pk = convert(&other_message.share_pk, &params);
    let self_share_rlk1 = convert(&message.share_rlk1, &params);
    let other_share_rlk1 = convert(&other_message.share_rlk1, &params);

    // generate pk
    let collective_pk = CollectivePublicKeyGenerator::aggregate_shares_and_finalise(
        &params,
        &[self_share_pk, other_share_pk],
        CRS_PK,
    );

    // generate rlk share 2
    let rlk_agg1 = CollectiveRlkGenerator::aggregate_shares_1(
        &params,
        &[self_share_rlk1, other_share_rlk1],
        0,
    );
    let share_rlk2 = CollectiveRlkGenerator::generate_share_2(
        &params,
        &self_s,
        &rlk_agg1,
        &self_s_rlk,
        0,
        &mut rng,
    );

    // encrypt bit vector
    let ciphertexts = bit_vector
        .chunks(RING_SIZE)
        .map(|v| {
            let pt = Plaintext::try_encoding_with_parameters(v, &params, Encoding::default());
            collective_pk.encrypt(&params, &pt, &mut rng)
        })
        .collect_vec();

    Round1Output {
        state_round2: StateRound2 {
            rlk_agg1_trimmed: convert(&rlk_agg1.trim(), &params),
        },
        message_round2: MessageRound2 {
            share_rlk2: convert(&share_rlk2, &params),
            cts: ciphertexts
                .iter()
                .map(|v| convert(v, &params))
                .collect_vec(),
        },
    }
}

/************* ROUND 2 *************/

#[derive(Serialize, Deserialize)]
struct Round2Output {
    state_round3: StateRound3,
    message_round3: MessageRound3,
}

#[derive(Clone, Serialize, Deserialize)]
struct MessageRound3 {
    decryption_shares: Vec<CollectiveDecryptionShareProto>,
}

#[derive(Serialize, Deserialize)]
struct StateRound3 {
    cts_res: Vec<CiphertextProto>,
}

#[wasm_bindgen]
pub fn round2_js(
    gen_keys_output: JsValue,
    round1_output: JsValue,
    other_message_round2: JsValue,
    is_a: bool,
) -> JsValue {
    let gen_keys_output: GenKeysOutput = serde_wasm_bindgen::from_value(gen_keys_output)
        .expect("failed to deserialize gen_keys_output");
    let round1_output: Round1Output =
        serde_wasm_bindgen::from_value(round1_output).expect("failed to deserialize round1_output");
    let other_message_round2: MessageRound2 = serde_wasm_bindgen::from_value(other_message_round2)
        .expect("failed to deserialize other_message_round2");

    let output = round2(
        &gen_keys_output.psi_keys,
        round1_output.state_round2,
        round1_output.message_round2,
        other_message_round2,
        is_a,
    );

    serde_wasm_bindgen::to_value(&output).unwrap()
}

fn round2(
    psi_keys: &PsiKeys,
    state_round2: StateRound2,
    message: MessageRound2,
    other_message: MessageRound2,
    is_a: bool,
) -> Round2Output {
    let params = params();
    let mut rng = thread_rng();

    let self_s = convert(&psi_keys.s, &params);
    let self_rlk1_agg = convert(&state_round2.rlk_agg1_trimmed, &params);

    let self_share_rlk2 = convert(&message.share_rlk2, &params);
    let other_share_rlk2 = convert(&other_message.share_rlk2, &params);

    let self_cts = message
        .cts
        .iter()
        .map(|v| convert(v, &params))
        .collect_vec();
    let other_cts = other_message
        .cts
        .iter()
        .map(|v| convert(v, &params))
        .collect_vec();

    // Create RLK
    let rlk = CollectiveRlkGenerator::aggregate_shares_2(
        &params,
        &[self_share_rlk2, other_share_rlk2],
        self_rlk1_agg,
        0,
    );

    // perform PSI
    let evaluator = Evaluator::new(params.clone());
    let evaluation_key = EvaluationKey::new_raw(&[0], vec![rlk], &[], &[], vec![]);
    let cts_res = izip!(self_cts.iter(), other_cts.iter())
        .map(|(ca, cb)| {
            let ct_out = {
                if is_a {
                    evaluator.mul(ca, cb)
                } else {
                    evaluator.mul(cb, ca)
                }
            };
            evaluator.relinearize(&ct_out, &evaluation_key)
        })
        .collect_vec();
    let decryption_shares = cts_res
        .iter()
        .map(|c| CollectiveDecryption::generate_share(evaluator.params(), c, &self_s, &mut rng))
        .collect_vec();

    Round2Output {
        state_round3: StateRound3 {
            cts_res: cts_res.iter().map(|v| convert(v, &params)).collect_vec(),
        },
        message_round3: MessageRound3 {
            decryption_shares: decryption_shares
                .iter()
                .map(|v| {
                    CollectiveDecryptionShareProto::try_from_with_levelled_parameters(v, &params, 0)
                })
                .collect_vec(),
        },
    }
}

/************* ROUND 3 *************/

#[wasm_bindgen]
pub fn round3_js(round2_output: JsValue, other_message: JsValue) -> Vec<u32> {
    let round2_output: Round2Output =
        serde_wasm_bindgen::from_value(round2_output).expect("failed to deserialize round2_output");
    let other_message: MessageRound3 =
        serde_wasm_bindgen::from_value(other_message).expect("failed to deserialize other_message");

    round3(
        round2_output.state_round3,
        round2_output.message_round3,
        other_message,
    )
}

fn round3(
    state_round3: StateRound3,
    message: MessageRound3,
    other_message: MessageRound3,
) -> Vec<u32> {
    let params = params();

    let self_cts = state_round3
        .cts_res
        .iter()
        .map(|v| convert(v, &params))
        .collect_vec();

    izip!(
        self_cts.iter(),
        message.decryption_shares.into_iter(),
        other_message.decryption_shares.into_iter()
    )
    .flat_map(|(c, share_a_proto, share_b_proto)| {
        let shares_vec = vec![
            CollectiveDecryptionShare::try_from_with_levelled_parameters(
                &share_a_proto,
                &params,
                0,
            ),
            CollectiveDecryptionShare::try_from_with_levelled_parameters(
                &share_b_proto,
                &params,
                0,
            ),
        ];
        let pt = CollectiveDecryption::aggregate_share_and_decrypt(&params, c, &shares_vec);
        Vec::<u32>::try_decoding_with_parameters(&pt, &params, Encoding::default())
    })
    .collect_vec()
}

fn convert<T, U>(value: &T, parameters: &BfvParameters) -> U
where
    U: TryFromWithParameters<Value = T, Parameters = BfvParameters>,
{
    U::try_from_with_parameters(value, parameters)
}

#[cfg(test)]
mod tests {
    use super::*;

    use itertools::{izip, Itertools};
    use rand::{distributions::Uniform, Rng};

    fn random_bit_vector(hamming_weight: usize, size: usize) -> Vec<u32> {
        let mut rng = thread_rng();

        let mut bit_vector = vec![0; size];
        (0..hamming_weight).for_each(|_| {
            let sample_index = rng.sample(Uniform::new(0, size));
            bit_vector[sample_index] = 1;
        });

        bit_vector
    }

    fn plain_psi(bit_vector0: &[u32], bit_vector_1: &[u32]) -> Vec<u32> {
        izip!(bit_vector0.iter(), bit_vector_1.iter())
            .map(|(b0, b1)| b0 * b1)
            .collect_vec()
    }

    #[test]
    fn psi_works() {
        let hamming_weight = 1000;
        let vector_size = RING_SIZE * 3;

        // gen keys
        let gen_keys_output_a = gen_keys();
        let gen_keys_output_b = gen_keys();

        // round1
        let bit_vector_a = random_bit_vector(hamming_weight, vector_size);
        let bit_vector_b = random_bit_vector(hamming_weight, vector_size);
        let round1_output_a = round1(
            &gen_keys_output_a.psi_keys,
            gen_keys_output_a.message_round1.clone(),
            gen_keys_output_b.message_round1.clone(),
            &bit_vector_a,
        );
        let round1_output_b = round1(
            &gen_keys_output_b.psi_keys,
            gen_keys_output_b.message_round1,
            gen_keys_output_a.message_round1,
            &bit_vector_b,
        );

        // round2
        let round2_output_a = round2(
            &gen_keys_output_a.psi_keys,
            round1_output_a.state_round2,
            round1_output_a.message_round2.clone(),
            round1_output_b.message_round2.clone(),
            true,
        );
        let round2_output_b = round2(
            &gen_keys_output_b.psi_keys,
            round1_output_b.state_round2,
            round1_output_b.message_round2,
            round1_output_a.message_round2,
            false,
        );

        // round3
        let psi_output_a = round3(
            round2_output_a.state_round3,
            round2_output_a.message_round3.clone(),
            round2_output_b.message_round3.clone(),
        );
        let psi_output_b = round3(
            round2_output_b.state_round3,
            round2_output_b.message_round3,
            round2_output_a.message_round3,
        );

        let expected_psi_output = plain_psi(&bit_vector_a, &bit_vector_b);

        assert_eq!(expected_psi_output, psi_output_a[..vector_size]);
        assert_eq!(psi_output_a, psi_output_b);
    }
}
