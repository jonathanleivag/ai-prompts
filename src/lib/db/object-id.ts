import { ObjectId } from "mongodb";

export function toObjectId(value: string | ObjectId): ObjectId {
  if (value instanceof ObjectId) return value;
  if (
    !ObjectId.isValid(value) ||
    new ObjectId(value).toHexString() !== value.toLowerCase()
  ) {
    throw new Error(`ObjectId inválido: ${value}`);
  }
  return new ObjectId(value);
}

export function objectIdToString(value: ObjectId): string {
  return value.toHexString();
}
