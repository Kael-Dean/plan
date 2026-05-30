// Shared helpers for the lesson-plan pipeline scripts.
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

// First CLI arg = the unit directory (folder holding the source PDF + config.json).
export function getUnitDir() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node <script>.mjs <unitDir>");
    process.exit(1);
  }
  return resolve(arg);
}

export function loadConfig(unitDir) {
  // strip a UTF-8 BOM if present (PowerShell's Out-File -Encoding utf8 writes one)
  return JSON.parse(readFileSync(join(unitDir, "config.json"), "utf8").replace(/^﻿/, ""));
}

const TH = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
// 1 → "๑", 10 → "๑๐", 13 → "๑๓"
export const toThai = (n) => String(n).split("").map((d) => TH[+d]).join("");
