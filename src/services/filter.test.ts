import { FilterConfig } from "./filter";
import { InvalidParameterError } from "../errors";

describe("FilterConfig", () => {
  it.each(["abc", 'attr1 != "value"', "attr1 = value"])(
    "throws if an invalid filter is used: %s",
    (input) => {
      expect(() => new FilterConfig({}).parse(input)).toThrowError(
        new InvalidParameterError("Error while parsing filter")
      );
    }
  );

  it("throws if an unsupported attributeName is used", () => {
    expect(() =>
      new FilterConfig<{ FirstName: string }>({
        first_name: FilterConfig.caseSensitive((x) => x.FirstName),
      }).parse('invalid = "value"')
    ).toThrowError(
      new InvalidParameterError("Invalid search attribute: invalid")
    );
  });

  it("returns an always-true expression if the filter is empty", () => {
    const expr = new FilterConfig({}).parse("");

    expect(expr({})).toBe(true);
  });

  describe("equality", () => {
    describe("case-sensitive", () => {
      it.each`
        value    | input       | result
        ${"abc"} | ${"abc"}    | ${true}
        ${"abc"} | ${"abc123"} | ${false}
        ${"abc"} | ${"AbC"}    | ${false}
        ${"abc"} | ${""}       | ${false}
      `(
        "returns an expression which evaluates to $result when a string attribute has the value $value and the input is $input",
        ({ value, input, result }) => {
          const expr = new FilterConfig<{ FirstName: string }>({
            first_name: FilterConfig.caseSensitive((x) => x.FirstName),
          }).parse(`first_name = "${input}"`);

          expect(expr({ FirstName: value })).toBe(result);
        }
      );

      it.each`
        value    | input      | result
        ${true}  | ${"true"}  | ${true}
        ${true}  | ${"TrUe"}  | ${false}
        ${true}  | ${"TRUE"}  | ${false}
        ${true}  | ${"what"}  | ${false}
        ${true}  | ${"1"}     | ${false}
        ${false} | ${"false"} | ${true}
        ${false} | ${"FaLsE"} | ${false}
        ${false} | ${"FALSE"} | ${false}
        ${false} | ${"what"}  | ${false}
        ${false} | ${"0"}     | ${false}
      `(
        "returns an expression which evaluates to $result when a boolean attribute has the value $value and the input is $input",
        ({ value, input, result }) => {
          const expr = new FilterConfig<{ Enabled: boolean }>({
            status: FilterConfig.caseSensitive((x) => x.Enabled),
          }).parse(`status = "${input}"`);

          expect(expr({ Enabled: value })).toBe(result);
        }
      );
    });

    describe("case-insensitive", () => {
      it.each`
        value    | input       | result
        ${"abc"} | ${"abc"}    | ${true}
        ${"abc"} | ${"abc123"} | ${false}
        ${"abc"} | ${"AbC"}    | ${true}
        ${"abc"} | ${""}       | ${false}
      `(
        "returns an expression which evaluates to $result when a string attribute has the value $value and the input is $input",
        ({ value, input, result }) => {
          const expr = new FilterConfig<{ FirstName: string }>({
            first_name: FilterConfig.caseInsensitive((x) => x.FirstName),
          }).parse(`first_name = "${input}"`);

          expect(expr({ FirstName: value })).toBe(result);
        }
      );
    });
  });

  describe("prefix", () => {
    describe("case-sensitive", () => {
      it.each`
        value    | input       | result
        ${"abc"} | ${"abc"}    | ${true}
        ${"abc"} | ${"abc123"} | ${false}
        ${"abc"} | ${"AbC"}    | ${false}
        ${"abc"} | ${""}       | ${true}
        ${"abc"} | ${"ab"}     | ${true}
        ${"abc"} | ${"Ab"}     | ${false}
        ${"abc"} | ${"123"}    | ${false}
      `(
        "returns an expression which evaluates to $result when a string attribute has the value $value and the input is $input",
        ({ value, input, result }) => {
          const expr = new FilterConfig<{ FirstName: string }>({
            first_name: FilterConfig.caseSensitive((x) => x.FirstName),
          }).parse(`first_name ^= "${input}"`);

          expect(expr({ FirstName: value })).toBe(result);
        }
      );
    });

    describe("case-insensitive", () => {
      it.each`
        value    | input       | result
        ${"abc"} | ${"abc"}    | ${true}
        ${"abc"} | ${"abc123"} | ${false}
        ${"abc"} | ${"AbC"}    | ${true}
        ${"abc"} | ${""}       | ${true}
        ${"abc"} | ${"ab"}     | ${true}
        ${"abc"} | ${"Ab"}     | ${true}
        ${"abc"} | ${"123"}    | ${false}
      `(
        "returns an expression which evaluates to $result when a string attribute has the value $value and the input is $input",
        ({ value, input, result }) => {
          const expr = new FilterConfig<{ FirstName: string }>({
            first_name: FilterConfig.caseInsensitive((x) => x.FirstName),
          }).parse(`first_name ^= "${input}"`);

          expect(expr({ FirstName: value })).toBe(result);
        }
      );
    });
  });
});
