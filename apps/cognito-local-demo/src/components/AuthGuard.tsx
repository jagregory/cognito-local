"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(() => setChecked(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!checked) {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}
