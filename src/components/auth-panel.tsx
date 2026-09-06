"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthPanelProps = {
  configured: boolean;
  next?: string;
  signOutTo?: string;
  userEmail?: string;
};

export function AuthPanel({
  configured,
  next = "/lab",
  signOutTo = "/lab",
  userEmail,
}: AuthPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  if (!configured) {
    return (
      <div className="notice notice-warning">
        Legg inn Supabase-variablene fra <code>.env.example</code> for å
        aktivere innlogging.
      </div>
    );
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setMessage(
      error
        ? "Innloggingslenken kunne ikke sendes."
        : "Sjekk e-posten din for innloggingslenken.",
    );
    setIsPending(false);
  }

  async function signOut() {
    setIsPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace(signOutTo);
    router.refresh();
  }

  if (userEmail) {
    return (
      <div className="auth-row">
        <div>
          <span className="eyebrow">Innlogget</span>
          <strong>{userEmail}</strong>
        </div>
        <button
          className="button button-quiet"
          disabled={isPending}
          onClick={signOut}
          type="button"
        >
          Logg ut
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={signIn}>
      <label htmlFor="email">E-post</label>
      <div className="auth-fields">
        <input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="deg@eksempel.no"
          required
          type="email"
          value={email}
        />
        <button className="button" disabled={isPending} type="submit">
          {isPending ? "Sender …" : "Send innloggingslenke"}
        </button>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
