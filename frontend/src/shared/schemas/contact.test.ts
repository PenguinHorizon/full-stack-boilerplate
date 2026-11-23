import { describe, expect, it } from "vitest";
import { contactInput, contactSchema, emptyContact } from "./contact";

const fields = (values: object) => {
  const result = contactSchema.safeParse({ ...emptyContact, ...values });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("contactSchema", () => {
  it("needs a name, a real message and a way to reply", () => {
    expect(fields({}).sort()).toEqual(["email", "message", "name"]);
    expect(
      fields({
        name: "Ayesha",
        message: "Do you cater weddings?",
        phone: "0300 1234567",
      }),
    ).toEqual([]);
    expect(
      fields({ name: "Ayesha", message: "Do you cater weddings?", email: "a@b.test" }),
    ).toEqual([]);
  });

  it("checks the phone and email formats", () => {
    expect(fields({ name: "A", message: "Long enough text", phone: "call me" })).toEqual([
      "phone",
    ]);
    expect(fields({ name: "A", message: "Long enough text", email: "nope" })).toEqual([
      "email",
    ]);
  });

  it("sends nulls for blanks and only sends the honeypot when filled", () => {
    expect(
      contactInput({
        ...emptyContact,
        name: " A ",
        message: " Hello there friends ",
        email: "a@b.test",
      }),
    ).toEqual({
      name: "A",
      phone: null,
      email: "a@b.test",
      subject: null,
      message: "Hello there friends",
    });
    expect(contactInput({ ...emptyContact, website: "x" }).website).toBe("x");
  });
});
