# ZK Summit 11 x Cursive

This app is built for [ZK Summit 11](https://www.zksummit.com/) in Athens. Every attendee will get an NFC card alongside their badge, and additional NFC cards will be placed in front of rooms where talks and workshops are held. Tapping another attendee's card allows you to see their contact information, as well as receive a digital signature that verifiably represents the fact that you met them. Tapping a card associated with a talk gives you a digital signature proving you attended that talk. There are 3 main things you can do with these signatures: make zero knowledge proofs, privately compute the things you've done in common with someone else, and aggregate the signatures into one big proof of your entire event experience - ZK Summit Folded!

## Zero Knowledge Proofs

There are 3 types of zero knowledge proofs an attendee can make at ZK Summit 11:

1. Prove you met 10 other attendees at the event
2. Prove you attended 5 talks
3. Prove you met 3 speakers

These proofs serve as basic examples of what's possible from verifiably digitizing in-person interactions, but one can generalize to far more complicated statements! For each proof we generate a merkle tree of all the signature public keys corresponding to the set of people/talks that comprise a proof. When a user makes a proof, lets say for showing they attended 5 talks, they are demonstrating the statement "I have 5 distinct signatures originating from different public keys within the merkle tree of talks". Notably, it is never revealed **which** talks they attended, and the signatures themselves always remain private.

#### Proving stack

To go a bit deeper, the actual proof being generated is a combination of a ECDSA signature proof + a Merkle membership proof. We use the [Baby Jubjub](https://eips.ethereum.org/EIPS/eip-2494) elliptic curve for ECDSA - having a representation in Twisted Edwards form allows complete addition formulae which reduce the number of constraints in our circuit - the circuits and proving code can be found [here](https://github.com/cursive-team/babyjubjub-ecdsa/tree/main). To avoid wrong field arithmetic and greatly save constraints, we use the [efficient ECDSA representation](https://personaelabs.org/posts/efficient-ecdsa-1/) from Personae.

#### Nullifiers

To prevent signatures from being reused, we make use of [nullifiers](https://nmohnblatt.github.io/zk-jargon-decoder/definitions/nullifier.html). Each attendee and location requirement is associated with a random value. When a signature is fed into the circuit, it is hashed with this random value, and the resulting output is known as the nullifier. We store these nullifiers, and if someone tries to use the same signature for a given requirement, they will deterministically produce the same nullifier, and we can invalidate their proof.

## Private Set Intersection (PSI) with Fully Homomorphic Encryption (FHE)

After collecting a few signatures each, two attendees can privately see which people they've both met and talks they've both attended. This is known as computing the Private Set Intersection of their two collections of signatures. At a high level, both users generate bit vectors corresponding to the list of all possible public keys that can be collected. A 1 represents that the user has collected a signature corresponding to that public key, a 0 represents the fact that they have not. Both users engage in a two-party computation to encrypt their respective bit vectors. Then, they compute the Hadamard product of the two encrypted bit vectors. Finally, they perform another two-party computation to decrypt the overlap bit vector and are left with the indices of the public keys they have collected in common. PSI was implemented by our good friends at [Gauss](https://github.com/gausslabs), you can see the code [here](https://github.com/gausslabs/MP-PSI).

#### Ensuring integrity of FHE inputs

You might have noticed one flaw in the PSI computation above. Namely, a user can simply claim that they have collected a signature from every single public key, i.e. they have a bit vector of all 1's. After running PSI, they would then know exactly what public keys the other user has collected. The solution to this is to have each user additionally include a zero knowledge proof that their bit vector was computed correctly, i.e. with valid signatures! In addition, it is important to ensure that both users perform valid encryptions of their data, as the FHE ciphertext must be well formed. This is solved by a tool like [Greco](https://github.com/privacy-scaling-explorations/greco), which allows the user to generate a zero knowledge proof that encryption was performed correctly. Due to time limitations, we were not able to implement either of these improvements for ZK Summit 11 - but they will be fun explorations for the future!

## ZK Summit Folded

One of the more exciting additions to this activation is ZK Summit Folded - a play on Spotify Wrapped, but using folding schemes. Folding schemes are an efficient way to aggregate proofs about a particularly structured type of statement. In our case, the statement is about the signatures one collects - "I have a signature corresponding to a public key, and this public key represents one of the attendees of ZK Summit 11". Folding schemes allow a user to produce a single proof that represent the aggregate of multiple of these statements, i.e. "I have 100 signatures corresponding to different public keys, and these public keys all represent attendees of ZK Summit 11". The beauty of folding schemes compared to say, naive Groth 16 proofs, is 1. you can **incrementally** generate this folding proof - every time you get a new signature, you can build the next step of the proof, instead of requiring knowledge of all the signatures at one time, and 2. the proof size is constant **irrespective** of the number of signatures you are proving - showing you have 100 attendee signatures results in a proof of the same size as showing you have 1000.

#### Proving stack

We are using the [Nova](https://eprint.iacr.org/2021/370) folding scheme, which notably is not state of the art, but has the most robust tooling at the moment (we would love to experiment with implementations of more recent folding work). [Nova-Scotia](https://github.com/nalinbhardwaj/Nova-Scotia) allows us to take our existing circom circuits and express them in a format that [Nova](https://github.com/microsoft/Nova) understands. The implementation of folding schemes for this app was done by our friends at [Mach34](https://mach34.space/).

## Interested in more projects like this?

[Cursive](http://cursive.team) is a cryptography and design lab building human-first applications of signed data. The code for the web app is all [open-source](https://github.com/cursive-team/zk-summit). If you’re interested in practical applications of digital signatures or advanced cryptography and would like to chat and/or collaborate, please reach out!
