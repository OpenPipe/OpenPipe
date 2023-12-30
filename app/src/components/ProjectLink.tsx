import Link, { type LinkProps } from "next/link";
import type { Route, DynamicRoute } from "nextjs-routes";

import { useSelectedProject } from "~/utils/hooks";

type ExtractSlugRoutes<T> = T extends DynamicRoute<`/p/[projectSlug]${infer Rest}`, infer Params>
  ? { path: Rest; query: Omit<Params, "projectSlug"> & { projectSlug?: string } }
  : never;

export type ProjectRoute = ExtractSlugRoutes<Route>;

export type ProjectLinkProps<T extends ProjectRoute> = {
  href: T["path"] | { pathname: T["path"]; query: T["query"] };
} & Omit<LinkProps, "href">;

export const ProjectLink = <T extends ProjectRoute>({ href, ...rest }: ProjectLinkProps<T>) => {
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
    />
  );
};
