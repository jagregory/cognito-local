"use client";

import { Amplify } from "aws-amplify";
import { amplifyConfig } from "@/lib/amplify-config";

Amplify.configure(amplifyConfig, { ssr: true });

export default function ConfigureAmplify() {
  return null;
}
