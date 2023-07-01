-- CreateTable
CREATE TABLE "Experiment" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVariant" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "uiId" UUID NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "experimentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScenario" (
    "id" UUID NOT NULL,
    "variableValues" JSONB NOT NULL,
    "uiId" UUID NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "experimentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVariable" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "experimentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelOutput" (
    "id" UUID NOT NULL,
    "inputHash" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "promptVariantId" UUID NOT NULL,
    "testScenarioId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "PromptVariant_uiId_idx" ON "PromptVariant"("uiId");

-- CreateIndex
CREATE INDEX "ModelOutput_inputHash_idx" ON "ModelOutput"("inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "ModelOutput_promptVariantId_testScenarioId_key" ON "ModelOutput"("promptVariantId", "testScenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "PromptVariant" ADD CONSTRAINT "PromptVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVariable" ADD CONSTRAINT "TemplateVariable_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelOutput" ADD CONSTRAINT "ModelOutput_promptVariantId_fkey" FOREIGN KEY ("promptVariantId") REFERENCES "PromptVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelOutput" ADD CONSTRAINT "ModelOutput_testScenarioId_fkey" FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
