"use client";

import { useEffect } from "react";
import { emitCartUpdated } from "@/lib/cart-events";

/** Call after checkout so the header badge refetches (cart cleared on server). */
export function CartUpdatedBeacon() {
  useEffect(() => {
    emitCartUpdated();
  }, []);
  return null;
}
