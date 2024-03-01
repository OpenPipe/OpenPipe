import { type Ref, forwardRef, useMemo } from "react";
import Link, { type LinkProps } from "next/link";
import type { Route, DynamicRoute } from "nextjs-routes";
import { Box } from "@chakra-ui/react";

import { useSelectedProject } from "~/utils/hooks";

type ExtractSlugRoutes<T> = T extends DynamicRoute<`/p/[projectSlug]${infer Rest}`, infer Params>
  ? { path: Rest; query: Omit<Params, "projectSlug"> & Record<string, string | undefined> }
  : never;

export type ProjectRoute = ExtractSlugRoutes<Route>;

export type ProjectLinkHref<T extends ProjectRoute> =
  | T["path"]
  | { pathname: T["path"]; query: T["query"] };

export type ProjectLinkProps<T extends ProjectRoute> = {
  href: ProjectLinkHref<T>;
} & Omit<LinkProps, "href">;

export function useProjectLink<T extends ProjectRoute>(href: ProjectLinkHref<T>) {
  const selectedProject = useSelectedProject().data;

  return useMemo(() => {
    const pathname = typeof href === "string" ? href : href.pathname;
    const query = typeof href === "string" ? {} : href.query;

    return {
      pathname: `/p/[projectSlug]${pathname}`,
      query: { projectSlug: selectedProject?.slug, ...query },
    };
  }, [selectedProject?.slug, href]);
}

export const ProjectLink = forwardRef(
  <T extends ProjectRoute>(
    props: ProjectLinkProps<T> & Omit<LinkProps, "href">,
    ref: Ref<HTMLSpanElement>,
  ) => {
    const { href, children, ...rest } = props;
    const link = useProjectLink(href);

    return (
      <Link href={link} {...rest}>
        <Box ref={ref} as="span">
          {children}
        </Box>
      </Link>
    );
  },
);

ProjectLink.displayName = "ProjectLink";
