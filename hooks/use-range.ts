"use client";

import { useState } from "react";
import type { Range } from "@/types";

/** Tiny state hook for the day / week / month filter. */
export function useRange(initial: Range = "day") {
  const [range, setRange] = useState<Range>(initial);
  return { range, setRange };
}
