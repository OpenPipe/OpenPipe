import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { useProjectList } from "~/utils/hooks";

const Home = () => {
  const router = useRouter();

  const session = useSession();

  const projectList = useProjectList().data;

  useEffect(() => {
    if (!projectList) return;
    const { projects, lastViewedProjectSlug } = projectList;
    const redirectProjectSlug = lastViewedProjectSlug || projects[0]?.slug;
    const redirect = async () => {
      // Redirect to the first project's request logs
      if (redirectProjectSlug) {
        await router.push({
          pathname: "/p/[projectSlug]/request-logs",
          query: { projectSlug: redirectProjectSlug },
        });
      } else {
        // User is not logged in
        await router.push("/account/signin");
      }
    };

    if (session.status !== "loading") void redirect();
  }, [session.status, router, projectList]);

  return null;
};

export default Home;
