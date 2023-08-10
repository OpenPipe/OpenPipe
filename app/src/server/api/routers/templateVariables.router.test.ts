import { expect, it } from "vitest";
import { prisma } from "~/server/db";
import { renameTemplateVariable } from "./scenarioVariables.router";

const createExperiment = async () => {
  return await prisma.experiment.create({
    data: {
      label: "Test Experiment",
      project: {
        create: {},
      },
    },
  });
};

const createTemplateVar = async (experimentId: string, label: string) => {
  return await prisma.templateVariable.create({
    data: {
      experimentId,
      label,
    },
  });
};

it("renames templateVariables", async () => {
  // Create experiments concurrently
  const [exp1, exp2] = await Promise.all([createExperiment(), createExperiment()]);

  // Create template variables concurrently
  const [exp1Var, exp2Var1, exp2Var2] = await Promise.all([
    createTemplateVar(exp1.id, "input1"),
    createTemplateVar(exp2.id, "input1"),
    createTemplateVar(exp2.id, "input2"),
  ]);

  // Create test scenarios concurrently
  const [exp1Scenario, exp2Scenario, exp2HiddenScenario] = await Promise.all([
    prisma.testScenario.create({
      data: {
        experimentId: exp1.id,
        visible: true,
        variableValues: { input1: "test" },
      },
    }),
    prisma.testScenario.create({
      data: {
        experimentId: exp2.id,
        visible: true,
        variableValues: { input1: "test1", otherInput: "otherTest" },
      },
    }),
    prisma.testScenario.create({
      data: {
        experimentId: exp2.id,
        visible: false,
        variableValues: { otherInput: "otherTest2" },
      },
    }),
  ]);

  await renameTemplateVariable(exp2Var1, "input1-renamed");

  expect(await prisma.templateVariable.findUnique({ where: { id: exp2Var1.id } })).toMatchObject({
    label: "input1-renamed",
  });

  // It shouldn't mess with unrelated experiments
  expect(await prisma.testScenario.findUnique({ where: { id: exp1Scenario.id } })).toMatchObject({
    visible: true,
    variableValues: { input1: "test" },
  });

  // Make sure there are a total of 4 scenarios for exp2
  expect(
    await prisma.testScenario.count({
      where: {
        experimentId: exp2.id,
      },
    }),
  ).toBe(3);

  // It shouldn't mess with the existing scenarios, except to hide them
  expect(await prisma.testScenario.findUnique({ where: { id: exp2Scenario.id } })).toMatchObject({
    visible: false,
    variableValues: { input1: "test1", otherInput: "otherTest" },
  });

  // It should create a new scenario with the new variable name
  const newScenario1 = await prisma.testScenario.findFirst({
    where: {
      experimentId: exp2.id,
      variableValues: { equals: { "input1-renamed": "test1", otherInput: "otherTest" } },
    },
  });

  expect(newScenario1).toMatchObject({
    visible: true,
  });

  const newScenario2 = await prisma.testScenario.findFirst({
    where: {
      experimentId: exp2.id,
      variableValues: { equals: { otherInput: "otherTest2" } },
    },
  });

  expect(newScenario2).toMatchObject({
    visible: false,
  });
});
