import React, { useState } from "react";
import { Button } from "@/components/Button";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import Link from "next/link";
import { Input } from "@/components/Input";
import init, {
  gen_keys_js,
  round1_js,
  round2_js,
  round3_js,
} from "@/lib/mp_psi";

enum DisplayState {
  MPPSI,
  RESULTS,
}

const stateDescriptions = [
  "Round 0 (key generation)",
  "Round 1 (relin r2 + ciphertext)",
  "Round 2 (decryption share)",
  "Round 3 (full decryption)",
];

const MPPSIBenchmarkPage = () => {
  const [displayState, setDisplayState] = useState<DisplayState>(
    DisplayState.MPPSI
  );
  const [hammingWeight, setHammingWeight] = useState<number>(1000);
  const [bitVectorSize, setBitVectorSize] = useState<number>(6144);
  const [totalOverlap, setTotalOverlap] = useState<number>(0);
  const [mppsiTime, setMPPSITime] = useState<number>();
  const [stateTimes, setStateTimes] = useState<number[]>([]);
  const [psiMatch, setPsiMatch] = useState<boolean>(false);

  const randomBitVector = (
    hammingWeight: number,
    size: number
  ): Uint32Array => {
    let bitVector = new Uint32Array(size).fill(0);

    for (let i = 0; i < hammingWeight; i++) {
      let sampleIndex;
      do {
        sampleIndex = Math.floor(Math.random() * size);
      } while (bitVector[sampleIndex] === 1);

      bitVector[sampleIndex] = 1;
    }
    return bitVector;
  };

  const plainPsi = (bitVector0: Uint32Array, bitVector1: Uint32Array) => {
    if (bitVector0.length !== bitVector1.length) {
      throw new Error("Both bit vectors must be of the same length");
    }

    return bitVector0.map((element, index) => element * bitVector1[index]);
  };

  const handleBeginBenchmark = async (event: React.FormEvent) => {
    event.preventDefault();

    await init();

    const startMPPSITime = new Date();
    const stateTimesTemp = [];

    const size = bitVectorSize;
    const bit_vector_b = randomBitVector(hammingWeight, size);
    const bit_vector_a = randomBitVector(hammingWeight, size);

    const startState0Time = new Date();
    const gen_keys_output_a = gen_keys_js();
    const gen_keys_output_b = gen_keys_js();
    console.log(
      `Size of gen_keys_output_a (stringified): ${
        new Blob([JSON.stringify(gen_keys_output_a)]).size / (1024 * 1024)
      } MB`
    );
    console.log(
      `Size of gen_keys_output_a.psi_keys (stringified): ${
        new Blob([JSON.stringify(gen_keys_output_a.psi_keys)]).size /
        (1024 * 1024)
      } MB`
    );
    console.log(
      `Size of gen_keys_output_a.message_round1 (stringified): ${
        new Blob([JSON.stringify(gen_keys_output_a.message_round1)]).size /
        (1024 * 1024)
      } MB`
    );
    // console.log(
    //   `Size of gen_keys_output_a.message_round1 (stringified and compressed): ${
    //     new Blob([
    //       pako.deflate(JSON.stringify(gen_keys_output_a.message_round1)),
    //     ]).size /
    //     (1024 * 1024)
    //   } MB`
    // );
    const state0Time = new Date().getTime() - startState0Time.getTime();
    stateTimesTemp.push(state0Time);

    const startState1Time = new Date();
    const round1_output_a = round1_js(
      gen_keys_output_a,
      gen_keys_output_b.message_round1,
      bit_vector_a
    );
    const round1_output_b = round1_js(
      gen_keys_output_b,
      gen_keys_output_a.message_round1,
      bit_vector_b
    );
    console.log(
      `Size of round1_output_a (stringified): ${
        new Blob([JSON.stringify(round1_output_a)]).size / (1024 * 1024)
      } MB`
    );
    console.log(
      `Size of round1_output_a.message_round2 (stringified): ${
        new Blob([JSON.stringify(round1_output_a.message_round2)]).size /
        (1024 * 1024)
      } MB`
    );
    // console.log(
    //   `Size of round1_output_a.message_round2 (stringified and compressed): ${
    //     new Blob([pako.deflate(JSON.stringify(round1_output_a.message_round2))])
    //       .size /
    //     (1024 * 1024)
    //   } MB`
    // );
    const state1Time = new Date().getTime() - startState1Time.getTime();
    stateTimesTemp.push(state1Time);

    const startState2Time = new Date();
    const round2_output_a = round2_js(
      gen_keys_output_a,
      round1_output_a,
      round1_output_b.message_round2,
      true
    );
    const round2_output_b = round2_js(
      gen_keys_output_b,
      round1_output_b,
      round1_output_a.message_round2,
      false
    );
    console.log(
      `Size of round2_output_a (stringified): ${
        new Blob([JSON.stringify(round2_output_a)]).size / (1024 * 1024)
      } MB`
    );
    console.log(
      `Size of round2_output_a.message_round3 (stringified): ${
        new Blob([JSON.stringify(round2_output_a.message_round3)]).size /
        (1024 * 1024)
      } MB`
    );
    // console.log(
    //   `Size of round2_output_a.message_round3 (stringified and compressed): ${
    //     new Blob([pako.deflate(JSON.stringify(round2_output_a.message_round3))])
    //       .size /
    //     (1024 * 1024)
    //   } MB`
    // );
    const state2Time = new Date().getTime() - startState2Time.getTime();
    stateTimesTemp.push(state2Time);

    const startState3Time = new Date();
    const psi_output_a = round3_js(
      round2_output_a,
      round2_output_b.message_round3
    );
    const psi_output_b = round3_js(
      round2_output_b,
      round2_output_a.message_round3
    );
    const state3Time = new Date().getTime() - startState3Time.getTime();
    stateTimesTemp.push(state3Time);

    const mppsiTime = new Date().getTime() - startMPPSITime.getTime();
    setMPPSITime(mppsiTime);
    setStateTimes(stateTimesTemp);

    const expected_psi_output = plainPsi(bit_vector_a, bit_vector_b);
    let overlap = 0;
    let overallPsiMatch = true;
    for (let i = 0; i < size; i++) {
      const sum = [
        psi_output_a[i],
        psi_output_b[i],
        expected_psi_output[i],
      ].reduce((a, b) => a + b, 0);
      if (sum !== 0 && sum !== 3) {
        overallPsiMatch = false;
        break;
      } else if (sum === 3) {
        overlap++;
      }
    }
    setPsiMatch(overallPsiMatch);
    setTotalOverlap(overlap);
    setDisplayState(DisplayState.RESULTS);
  };

  return (
    <>
      {displayState === DisplayState.MPPSI && (
        <>
          <FormStepLayout
            title="Gauss MP-PSI benchmark"
            onSubmit={handleBeginBenchmark}
            actions={
              <div className="flex flex-col gap-4">
                <Button type="submit">Confirm</Button>
                <Link href="/admin/bench">
                  <Button>Back</Button>
                </Link>
              </div>
            }
          >
            <Input
              label="Hamming weight"
              type="number"
              name="hammingWeight"
              value={hammingWeight}
              onChange={(event) =>
                setHammingWeight(parseInt(event.target.value))
              }
              required
            />
            <Input
              label="Bitvector size"
              type="number"
              name="bitVectorSize"
              value={bitVectorSize}
              onChange={(event) =>
                setBitVectorSize(parseInt(event.target.value))
              }
              required
            />
          </FormStepLayout>
          {/* <Button onClick={testInternalFunctions}>
            Test internal functions
          </Button> */}
        </>
      )}
      {displayState === DisplayState.RESULTS && (
        <FormStepLayout
          title="MP-PSI benchmark results"
          actions={
            <div className="flex flex-col gap-4">
              <Button onClick={() => setDisplayState(DisplayState.MPPSI)}>
                Try another benchmark
              </Button>
              <Link href="/admin/bench">
                <Button>Back to benches</Button>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <p>
              <u>{`Operation breakdown`}</u>
            </p>
            {stateTimes.map((time, index) => (
              <p key={index} style={{ fontSize: "0.75em" }}>
                {`${stateDescriptions[index]} in `} <b>{`${time}ms`}</b>
              </p>
            ))}

            <p>
              <u>Total Time</u>
              {`: ${mppsiTime}ms`}
            </p>
            <p>
              <u>PSI output is correct</u> {`: ${psiMatch ? "Yes" : "No"}`}
            </p>
            <p>
              <u>Total Overlap</u> {`: ${totalOverlap}`}
            </p>
          </div>
        </FormStepLayout>
      )}
    </>
  );
};

export default MPPSIBenchmarkPage;
