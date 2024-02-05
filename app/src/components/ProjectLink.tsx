import { type Ref, forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import type { Route, DynamicRoute } from "nextjs-routes";
import { Box } from "@chakra-ui/react";

import { useSelectedProject } from "~/utils/hooks";

type ExtractSlugRoutes<T> = T extends DynamicRoute<`/p/[projectSlug]${infer Rest}`, infer Params>
  ? { path: Rest; query: Omit<Params, "projectSlug"> & Record<string, string | undefined> }
  : never;

export type ProjectRoute = ExtractSlugRoutes<Route>;

export type ProjectLinkProps<T extends ProjectRoute> = {
  href: T["path"] | { pathname: T["path"]; query: T["query"] };
} & Omit<LinkProps, "href">;

const ProjectLink = forwardRef(
  <T extends ProjectRoute>(
    { href, children, ...rest }: ProjectLinkProps<T>,
    ref: Ref<HTMLSpanElement>,
  ) => {
    const selectedProject = useSelectedProject().data;

    const pathname = typeof href === "string" ? href : href.pathname;
    const query = typeof href === "string" ? {} : href.query;

    return (
      <Link
        href={{
          pathname: `/p/[projectSlug]${pathname}`,
          query: { projectSlug: selectedProject?.slug, ...query },
        }}
        {...rest}
      >
        <Box ref={ref} as="span">
          {children}
        </Box>
      </Link>
    );
  },
);

ProjectLink.displayName = "ProjectLink";

export { ProjectLink };
