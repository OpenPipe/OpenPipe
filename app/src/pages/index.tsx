import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { useProjects } from "~/utils/hooks";

const Home = () => {
  const router = useRouter();

  const session = useSession();

  const projects = useProjects().data;

  const firstProjectSlug = projects?.[0]?.slug;

  useEffect(() => {
    const redirect = async () => {
      // Redirect to the first project's request logs
      if (firstProjectSlug) {
        await router.push({
          pathname: "/p/[projectSlug]/request-logs",
          query: { projectSlug: firstProjectSlug },
        });
      } else {
        // User is not logged in
        await router.push("/account/signin");
      }
    };

    if (session.status !== "loading") void redirect();
  }, [session.status, router, firstProjectSlug]);

  return null;
};

export default Home;
