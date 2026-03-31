"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import { signIn, getCurrentUser, type SignInInput } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";

const services = {
  async handleSignIn(input: SignInInput) {
    return signIn({
      username: input.username,
      password: input.password,
      options: {
        authFlowType: "USER_PASSWORD_AUTH",
      },
    });
  },
};

const formFields = {
  signUp: {
    given_name: {
      label: "First Name",
      placeholder: "Enter your first name",
      order: 1,
    },
    family_name: {
      label: "Last Name",
      placeholder: "Enter your last name",
      order: 2,
    },
    email: {
      label: "Email",
      placeholder: "Enter your email",
      order: 3,
    },
    password: {
      label: "Password",
      placeholder: "Enter your password",
      order: 4,
    },
    confirm_password: {
      label: "Confirm Password",
      placeholder: "Confirm your password",
      order: 5,
    },
  },
};

function PostLoginRedirect() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Poll until the user session is available, then redirect
    let cancelled = false;
    const check = async () => {
      try {
        await getCurrentUser();
        if (!cancelled) {
          setRedirecting(true);
          router.push("/dashboard");
        }
      } catch {
        // Not yet authenticated, retry
        if (!cancelled) setTimeout(check, 500);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [router]);

  if (redirecting) return <p>Redirecting to dashboard...</p>;
  return <p>Signing in...</p>;
}

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 24 }}>
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>Sign In</h1>
      <Authenticator
        services={services}
        formFields={formFields}
        signUpAttributes={["given_name", "family_name", "email"]}
      >
        {() => <PostLoginRedirect />}
      </Authenticator>
    </div>
  );
}
