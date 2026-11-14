/**
 * Prints two fresh secret tokens and the setup links for each device.
 *
 *   npx tsx scripts/make-tokens.ts https://sudoodle.example.com
 *
 * Store the tokens as Worker secrets (TOKEN_HER, TOKEN_HIM). Never commit them.
 */
import { randomBytes } from "node:crypto";

const site = (process.argv[2] ?? "http://localhost:5173").replace(/\/$/, "");
const her = randomBytes(24).toString("base64url");
const him = randomBytes(24).toString("base64url");

console.log(`TOKEN_HER=${her}`);
console.log(`TOKEN_HIM=${him}\n`);
console.log(`Her setup link: ${site}/?token=${her}&as=her`);
console.log(`His setup link: ${site}/?token=${him}&as=him`);
