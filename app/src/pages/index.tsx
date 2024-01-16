import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { useProjectList } from "~/utils/hooks";

const Home = () => {
  const router = useRouter();

  const session = useSession();

  const projectList = useProjectList().data;

  useEffect(() => {
    if (session.status === "loading") return;

    const redirectProject = async () => {
      if (!projectList) return;
      const { projects, lastViewedProjectSlug } = projectList;
      const redirectProjectSlug = lastViewedProjectSlug || projects[0]?.slug;
      if (!redirectProjectSlug) return;
      await router.push({
        pathname: "/p/[projectSlug]/request-logs",
        query: { projectSlug: redirectProjectSlug },
      });
    };

    if (session.data?.user) {
      void redirectProject();
    } else {
      void router.push("/account/signin");
    }
  }, [session.status, session.data, router, projectList]);

  return null;
};

export default Home;
