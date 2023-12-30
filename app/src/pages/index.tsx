import { useEffect } from "react";
import { useRouter } from "next/router";

import { useProjects } from "~/utils/hooks";

const Home = () => {
  const router = useRouter();

  const projects = useProjects().data;

  const firstProjectSlug = projects?.[0]?.slug;

  useEffect(() => {
    const redirect = async () => {
      try {
        // Redirect to the first project's request logs
        if (firstProjectSlug) {
          await router.push({
            pathname: "/p/[projectSlug]/request-logs",
            query: { projectSlug: firstProjectSlug },
          });
        }
      } catch (error) {
        // User is not logged in
      }
    };

    void redirect();
  }, [router, firstProjectSlug]);

  return null;
};

export default Home;
