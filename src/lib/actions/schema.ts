import { z } from "zod";

export function strictInteger(message = "Debe ser un número entero") {
  return z.union(
    [
      z.number().int(message).finite(message),
      z.string().trim().regex(/^[+-]?\d+$/, message).transform(Number),
    ],
    { message },
  );
}
