import cryptoRandomString from "crypto-random-string";

const KEY_LENGTH = 42;

export const generateApiKey = () => `opk_${cryptoRandomString({ length: KEY_LENGTH })}`;
