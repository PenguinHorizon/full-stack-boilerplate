import { ApiError } from "@/shared/api/errors";
import { applyServerErrors } from "./server-errors";

type Form = { email: string; password: string };

describe("applyServerErrors", () => {
  it("attaches field errors to known fields", () => {
    const setError = vi.fn();
    const error = new ApiError({
      message: "email must be an email",
      status: 400,
      code: "VALIDATION_FAILED",
      fieldErrors: [
        { field: "email", message: "email must be an email" },
        { field: "unknown", message: "ignored" },
      ],
    });

    expect(applyServerErrors<Form>(error, setError, ["email", "password"])).toBeNull();
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "email must be an email",
    });
  });

  it("maps a status or code to a field when there is no field list", () => {
    const setError = vi.fn();
    const conflict = new ApiError({
      message: "Email already exists",
      status: 409,
      code: "CONFLICT",
    });
    expect(
      applyServerErrors<Form>(conflict, setError, ["email"], { "409": "email" }),
    ).toBeNull();
    expect(setError).toHaveBeenCalledWith(
      "email",
      expect.objectContaining({ message: "Email already exists" }),
    );
  });

  it("returns a form-level message when nothing maps", () => {
    const setError = vi.fn();
    const error = new ApiError({
      message: "Too many requests",
      status: 429,
      code: "RATE_LIMITED",
    });
    expect(applyServerErrors<Form>(error, setError, ["email"])).toBe("Too many requests");
    expect(setError).not.toHaveBeenCalled();
  });
});
