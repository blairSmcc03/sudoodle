import { describe, expect, test } from "vitest";
import { readApiKey } from "./apiKey";

const noFile = () => {
  throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
};

describe("readApiKey", () => {
  test("uses the environment variable when set", () => {
    expect(readApiKey({ YOUDOSUDOKU_API_KEY: "from-env" }, () => "from-file")).toBe("from-env");
  });

  test("falls back to api.key when the variable is not set", () => {
    expect(readApiKey({}, () => "from-file\n")).toBe("from-file");
  });

  test("ignores a blank environment variable and uses the file", () => {
    expect(readApiKey({ YOUDOSUDOKU_API_KEY: "  " }, () => "from-file")).toBe("from-file");
  });

  test("returns null when there is no key anywhere", () => {
    expect(readApiKey({}, noFile)).toBeNull();
  });

  test("returns null for an empty file", () => {
    expect(readApiKey({}, () => "  \n")).toBeNull();
  });
});
