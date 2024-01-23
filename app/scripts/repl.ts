// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { prisma } from "../src/server/db";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";

import crypto from "crypto";

console.log(crypto.randomBytes(48).toString("base64url"));
