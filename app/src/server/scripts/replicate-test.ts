/* eslint-disable */

import "dotenv/config";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

console.log("going to run");
const prediction = await replicate.predictions.create({
  version: "3725a659b5afff1a0ba9bead5fac3899d998feaad00e07032ca2b0e35eb14f8a",
  input: {
    prompt: "...",
  },
});

console.log("waiting");
setInterval(() => {
  replicate.predictions.get(prediction.id).then((prediction) => {
    console.log(prediction);
  });
}, 500);
// const output = await replicate.wait(prediction, {});

// console.log(output);
