import { InvalidParameterError } from "../errors";

const FilterExpression = new RegExp(
  /^\s*(?<attr>.*)\s+(?<type>\^?=)\s+"(?<value>.*)"\s*$/
);

type Matcher<T> = (obj: T, filterType: "=" | "^=", value: string) => boolean;
type FieldLookup<T> = (obj: T) => string | boolean | undefined;

function compare<T>(
  fieldValue: string | undefined,
  type: "=" | "^=",
  value: string
) {
  return type === "="
    ? fieldValue === value
    : fieldValue?.startsWith(value) ?? false;
}

export class FilterConfig<T> {
  static caseSensitive<T>(field: FieldLookup<T>): Matcher<T> {
    return (obj, type, value) => compare(field(obj)?.toString(), type, value);
  }

  static caseInsensitive<T>(field: FieldLookup<T>): Matcher<T> {
    return (obj, type, value) =>
      compare(
        field(obj)?.toString()?.toLocaleLowerCase(),
        type,
        value.toLocaleLowerCase()
      );
  }

  readonly #fields: Record<string, Matcher<T>>;

  constructor(fields: Record<string, Matcher<T>>) {
    this.#fields = fields;
  }

  parse(filter: string | undefined): (obj: T) => boolean {
    if (!filter) {
      return () => true;
    }

    const match = FilterExpression.exec(filter);
    if (!match?.groups) {
      throw new InvalidParameterError("Error while parsing filter");
    }

    const { attr, type, value } = match.groups;
    if (type !== "=" && type !== "^=") {
      // this isn't really necessary as the regexp will only match the two types, but it keeps typescript happy
      throw new InvalidParameterError("Error while parsing filter");
    }

    const field = this.#fields[attr];
    if (!field) {
      throw new InvalidParameterError(`Invalid search attribute: ${attr}`);
    }

    return (obj) => field(obj, type, value);
  }
}
