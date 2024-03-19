import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import AppShell from "~/components/nav/AppShell";

export default function SignIn() {
  const session = useSession().data;
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/").catch(console.error);
    } else if (session === null) {
      signIn("github").catch(console.error);
    }
  }, [session, router]);

  return (
    <AppShell>
      <div />
    </AppShell>
  );
}
