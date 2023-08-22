/*
 * Copyright 2023 Viascom Ltd liab. Co
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION nanoid(
    size int DEFAULT 21,
    alphabet text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
)
    RETURNS text
    LANGUAGE plpgsql
    volatile
AS
$$
DECLARE
    idBuilder      text := '';
    counter        int  := 0;
    bytes          bytea;
    alphabetIndex  int;
    alphabetArray  text[];
    alphabetLength int;
    mask           int;
    step           int;
BEGIN
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    mask := (2 << cast(floor(log(alphabetLength - 1) / log(2)) as int)) - 1;
    step := cast(ceil(1.6 * mask * size / alphabetLength) AS int);

    while true
        loop
            bytes := gen_random_bytes(step);
            while counter < step
                loop
                    alphabetIndex := (get_byte(bytes, counter) & mask) + 1;
                    if alphabetIndex <= alphabetLength then
                        idBuilder := idBuilder || alphabetArray[alphabetIndex];
                        if length(idBuilder) = size then
                            return idBuilder;
                        end if;
                    end if;
                    counter := counter + 1;
                end loop;

            counter := 0;
        end loop;
END
$$;


-- Make a short_nanoid function that uses the default alphabet and length of 15
CREATE OR REPLACE FUNCTION short_nanoid()
    RETURNS text
    LANGUAGE plpgsql
    volatile
AS
$$
BEGIN
    RETURN nanoid(15, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
END
$$;

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "slug" TEXT NOT NULL DEFAULT short_nanoid();

-- For existing experiments, keep the existing id as the slug for backwards compatibility
UPDATE "Experiment" SET "slug" = "id";

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_slug_key" ON "Experiment"("slug");
