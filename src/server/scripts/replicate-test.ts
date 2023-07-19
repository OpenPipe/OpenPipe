// /* eslint-disable */

// import "dotenv/config";
// import Replicate from "replicate";

// const replicate = new Replicate({
//   auth: process.env.REPLICATE_API_TOKEN || "",
// });

// console.log("going to run");
// const prediction = await replicate.predictions.create({
//   version: "e951f18578850b652510200860fc4ea62b3b16fac280f83ff32282f87bbd2e48",
//   input: {
//     prompt: "...",
//   },
// });

// console.log("waiting");
// setInterval(() => {
//   replicate.predictions.get(prediction.id).then((prediction) => {
//     console.log(prediction.output);
//   });
// }, 500);
// // const output = await replicate.wait(prediction, {});

// // console.log(output);
